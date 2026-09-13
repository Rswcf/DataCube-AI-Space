"""Repair translations on saved rows.

A row/language needs work when its translation is missing, stale (English
changed or attached to the wrong row) or identical to English — or always,
with ``force``. Translations run in worker threads; every database read and
write stays on the caller's session in the calling thread.
"""

import logging
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

from sqlalchemy.orm import Session

from app.models import (
    MAPost, PrimaryMarketPost, SecondaryMarketPost, TechPost, TipPost, Trend, Video, Week,
)
from app.services.collector import _apply_translations_to_record
from app.services.i18n_utils import TRANSLATION_LANGUAGES
from app.services.llm_processor import LLMProcessor
from app.services.translation_integrity import (
    SRC_KEY, entry_is_complete, record_source_hash, translation_status,
)

logger = logging.getLogger(__name__)

# Section kind -> (model, translatable fields). Kinds match
# translation_integrity.SOURCE_FIELDS.
SECTIONS = {
    "tech": (TechPost, ["content", "category", "tags"]),
    "video": (Video, ["title", "summary"]),
    "tip": (TipPost, ["content", "tip", "category", "difficulty"]),
    "primary_market": (PrimaryMarketPost, ["content", "amount", "valuation"]),
    "secondary_market": (SecondaryMarketPost, ["content"]),
    "ma": (MAPost, ["content", "deal_value", "deal_type"]),
    "trend": (Trend, ["category", "title"]),
}


def resolve_periods(db: Session, period_id: str | None = None, since: str | None = None) -> list[str]:
    """One period, every daily period on/after ``since`` (YYYY-MM-DD), or all periods."""
    if period_id:
        return [period_id]
    query = db.query(Week.id)
    if since:
        query = query.filter(Week.period_type == "day", Week.id >= since)
    return [row[0] for row in query.order_by(Week.id).all()]


def fields_for(kind: str, record) -> list[str]:
    """Video rows in the tech feed only carry translatable `content`."""
    if kind == "tech" and getattr(record, "is_video", False):
        return ["content"]
    return SECTIONS[kind][1]


def plan_period(db: Session, period_id: str, force: bool = False) -> dict:
    """(kind, language, fields) -> rows that need translating in one period."""
    groups: dict = {}
    for kind, (model_cls, _fields) in SECTIONS.items():
        rows = (
            db.query(model_cls).filter(model_cls.week_id == period_id)
            .order_by(model_cls.id).all()
        )
        for row in rows:
            for lang in TRANSLATION_LANGUAGES:
                if force or translation_status(row, kind, lang) != "ok":
                    key = (kind, lang, tuple(fields_for(kind, row)))
                    groups.setdefault(key, []).append(row)
    return groups


def summarize_periods(db: Session, period_ids: list[str], force: bool = False) -> dict:
    """{period: {"kind:lang": row count}} without translating anything."""
    summary = {}
    for period_id in period_ids:
        counts: dict = {}
        for (kind, lang, _fields), rows in plan_period(db, period_id, force).items():
            label = f"{kind}:{lang}"
            counts[label] = counts.get(label, 0) + len(rows)
        if counts:
            summary[period_id] = counts
    return summary


def _english_item(row, fields: list[str]) -> dict:
    item = {}
    for field in fields:
        value = getattr(row, f"{field}_en", None)
        if value is not None:
            item[field] = value
    return item


def translate_groups(groups: dict, models: list[str] | None = None, workers: int = 3) -> dict:
    """Translate planned groups in parallel.

    Returns {(kind, row id): {language: entry}}; every entry carries `_src`
    computed from the English text of the row that was sent to the translator.
    """
    translated: dict = {}
    lock = threading.Lock()

    def work(key, rows):
        kind, lang, fields = key
        items = [_english_item(row, list(fields)) for row in rows]
        output = LLMProcessor().translate_batch(items, lang, list(fields), models=models)
        with lock:
            for row, item, entry in zip(rows, items, output):
                # Never write partial output over existing translations: an
                # incomplete entry would drop translated fields. The row stays
                # not ok and a later run retries it.
                if not entry_is_complete(item, entry, kind):
                    continue
                stamped = dict(entry)
                stamped[SRC_KEY] = record_source_hash(row, kind)
                translated.setdefault((kind, row.id), {})[lang] = stamped

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(work, key, rows): key for key, rows in groups.items()}
        for future in as_completed(futures):
            try:
                future.result()
            except Exception as e:
                kind, lang, _fields = futures[future]
                logger.warning(f"Backfill {kind}→{lang} failed: {e}")
    return translated


def backfill_periods(db: Session, period_ids: list[str], force: bool = False, cheap: bool = False) -> dict:
    """Plan, translate and write back each period. Returns {period: rows updated}."""
    models = LLMProcessor.CHEAP_TRANSLATOR_MODELS if cheap else None
    report = {}
    for period_id in period_ids:
        groups = plan_period(db, period_id, force)
        if not groups:
            continue
        rows_by_key = {(key[0], row.id): row for key, rows in groups.items() for row in rows}
        translated = translate_groups(groups, models=models)
        for key, entries in translated.items():
            row = rows_by_key[key]
            merged = dict(row.translations or {})
            merged.update(entries)
            _apply_translations_to_record(row, merged)
        db.commit()
        report[period_id] = len(translated)
        logger.info(f"Backfill {period_id}: {len(translated)} row(s) updated")
    return report


def backfill_with_new_session(period_ids: list[str], force: bool = False, cheap: bool = False) -> None:
    """Background-thread entry point with its own database session."""
    from app.database import get_session_local

    db = get_session_local()()
    try:
        report = backfill_periods(db, period_ids, force=force, cheap=cheap)
        logger.info(f"Translation backfill complete: {report}")
    except Exception:
        logger.exception("Translation backfill failed")
        db.rollback()
    finally:
        db.close()
