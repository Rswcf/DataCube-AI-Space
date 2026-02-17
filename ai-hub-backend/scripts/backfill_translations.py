#!/usr/bin/env python3
"""
Backfill translations for existing content.

Reads all existing periods from the database, translates EN content
to 6 additional languages (ZH, FR, ES, PT, JA, KO) using the free
model chain, and updates the translations JSONB column.

Usage:
    python -m scripts.backfill_translations                    # All periods
    python -m scripts.backfill_translations --period 2026-kw06 # Single period
    python -m scripts.backfill_translations --dry-run          # Preview only
"""

import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# Translation config per model type: (model_class, fields, field_name_map)
TRANSLATION_CONFIG = {
    "tech": {
        "fields": ["content", "category", "tags"],
        "name_map": {},
    },
    "video": {
        "fields": ["title", "summary"],
        "name_map": {},
    },
    "tip": {
        "fields": ["content", "tip", "category", "difficulty"],
        "name_map": {},
    },
    "primary_market": {
        "fields": ["content", "amount", "valuation"],
        "name_map": {},
    },
    "secondary_market": {
        "fields": ["content"],
        "name_map": {},
    },
    "ma": {
        "fields": ["content", "deal_value", "deal_type"],
        "name_map": {},
    },
    "trend": {
        "fields": ["category", "title"],
        "name_map": {},
    },
}


def db_record_to_en_dict(record, fields):
    """Extract EN field values from a DB record into a dict for translation."""
    result = {}
    for field in fields:
        val = getattr(record, f"{field}_en", None)
        if val is not None:
            result[field] = val
    return result


def translate_records(records, section_name, dry_run=False):
    """Translate a list of DB records and update their translations column."""
    from app.services.i18n_utils import TRANSLATION_LANGUAGES
    from app.services.llm_processor import LLMProcessor

    config = TRANSLATION_CONFIG[section_name]
    fields = config["fields"]
    name_map = config["name_map"]

    # Skip records that already have translations
    to_translate = [r for r in records if not r.translations]
    if not to_translate:
        logger.info(f"  {section_name}: all {len(records)} records already translated, skipping")
        return 0

    logger.info(f"  {section_name}: {len(to_translate)} of {len(records)} records need translation")

    if dry_run:
        return len(to_translate)

    # Build EN dicts for translation
    en_items = []
    for record in to_translate:
        en_dict = db_record_to_en_dict(record, fields)
        en_dict["_translations"] = {}
        en_items.append(en_dict)

    # Translate each language (sequential to be gentle on free models)
    for lang in TRANSLATION_LANGUAGES:
        try:
            processor = LLMProcessor()
            translated = processor.translate_batch(en_items, lang, fields)

            for i, en_item in enumerate(en_items):
                if i < len(translated) and translated[i]:
                    mapped = {}
                    for k, v in translated[i].items():
                        db_name = name_map.get(k, k)
                        mapped[db_name] = v
                    en_item["_translations"][lang] = mapped

            logger.info(f"    {section_name} → {lang}: done")
        except Exception as e:
            logger.warning(f"    {section_name} → {lang}: failed ({e})")

    # Write back to DB records
    updated = 0
    for i, record in enumerate(to_translate):
        translations = en_items[i].get("_translations")
        if translations:
            record.translations = translations
            updated += 1

    return updated


def backfill_period(db, week_id, dry_run=False):
    """Backfill translations for all content in a single period."""
    from app.models import (
        TechPost, PrimaryMarketPost, SecondaryMarketPost, MAPost,
        TipPost, Video, Trend,
    )

    logger.info(f"Processing period: {week_id}")

    total_updated = 0

    # Tech posts
    tech_posts = db.query(TechPost).filter(
        TechPost.week_id == week_id, TechPost.is_video.is_(False)
    ).all()
    total_updated += translate_records(tech_posts, "tech", dry_run)

    # Videos
    videos = db.query(Video).filter(Video.week_id == week_id).all()
    total_updated += translate_records(videos, "video", dry_run)

    # Tips
    tips = db.query(TipPost).filter(TipPost.week_id == week_id).all()
    total_updated += translate_records(tips, "tip", dry_run)

    # Primary market
    primary = db.query(PrimaryMarketPost).filter(PrimaryMarketPost.week_id == week_id).all()
    total_updated += translate_records(primary, "primary_market", dry_run)

    # Secondary market
    secondary = db.query(SecondaryMarketPost).filter(SecondaryMarketPost.week_id == week_id).all()
    total_updated += translate_records(secondary, "secondary_market", dry_run)

    # M&A
    ma = db.query(MAPost).filter(MAPost.week_id == week_id).all()
    total_updated += translate_records(ma, "ma", dry_run)

    # Trends
    trends = db.query(Trend).filter(Trend.week_id == week_id).all()
    total_updated += translate_records(trends, "trend", dry_run)

    if not dry_run and total_updated > 0:
        db.commit()
        logger.info(f"  Committed {total_updated} updated records for {week_id}")

    return total_updated


def main():
    parser = argparse.ArgumentParser(description="Backfill translations for existing content")
    parser.add_argument(
        "--period",
        type=str,
        default=None,
        help="Period ID to backfill (e.g., 2026-kw06 or 2026-02-07). Default: all periods",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview what would be translated without making changes",
    )
    args = parser.parse_args()

    try:
        from app.database import SessionLocal
    except ImportError:
        from app.database import get_session_local
        SessionLocal = get_session_local()

    from app.models import Week

    db = SessionLocal()
    try:
        if args.period:
            week_ids = [args.period]
        else:
            weeks = db.query(Week).order_by(Week.id).all()
            week_ids = [w.id for w in weeks]

        if not week_ids:
            logger.info("No periods found in database")
            return

        logger.info(f"{'DRY RUN: ' if args.dry_run else ''}Backfilling {len(week_ids)} period(s)")

        grand_total = 0
        for week_id in week_ids:
            try:
                updated = backfill_period(db, week_id, args.dry_run)
                grand_total += updated
            except Exception as e:
                logger.error(f"Failed to backfill {week_id}: {e}")
                db.rollback()

        action = "would translate" if args.dry_run else "translated"
        logger.info(f"Done! {action} {grand_total} records across {len(week_ids)} period(s)")

    finally:
        db.close()


if __name__ == "__main__":
    main()
