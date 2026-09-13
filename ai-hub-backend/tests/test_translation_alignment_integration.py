"""Stage 3.5 translations land on the rows they were translated for.

Regression for the 2026-08 misalignment: translations were written onto saved
rows by position, so interleaved video rows shifted later tech cards onto
another story's text and left the last rows untranslated.

Requires local PostgreSQL (see tests/conftest.py and pytest.ini).
"""

from datetime import date

import pytest

import app.services.collector as collector
from app.database import get_session_local
from app.models import (
    MAPost, PrimaryMarketPost, SecondaryMarketPost, TechPost, TipPost, Trend, Video, Week,
)
from app.services.i18n_utils import TRANSLATION_LANGUAGES
from app.services.translation_integrity import translation_status

pytestmark = pytest.mark.integration

WEEK_ID = "2026-08-02"
VIDEO_IDS = ["vidalign0001", "vidalign0002"]


class FakeTranslator:
    """Deterministic stand-in for LLMProcessor: prefixes text with the language."""

    def translate_batch(self, items, target_lang, fields, batch_size=10, models=None):
        out = []
        for item in items:
            entry = {}
            for field in fields:
                value = item.get(field)
                if isinstance(value, str):
                    entry[field] = f"[{target_lang}] {value}"
                elif isinstance(value, list):
                    entry[field] = [f"[{target_lang}] {v}" for v in value]
            out.append(entry)
        return out


@pytest.fixture()
def db():
    session = get_session_local()()
    yield session
    session.rollback()
    session.close()


@pytest.fixture(autouse=True)
def clean_period(db, monkeypatch):
    monkeypatch.setattr(collector, "LLMProcessor", FakeTranslator)
    for model_cls in (TechPost, Video, TipPost, PrimaryMarketPost, SecondaryMarketPost, MAPost, Trend):
        db.query(model_cls).filter(model_cls.week_id == WEEK_ID).delete()
    db.query(Video).filter(Video.video_id.in_(VIDEO_IDS)).delete(synchronize_session=False)
    if not db.query(Week).filter(Week.id == WEEK_ID).first():
        db.add(Week(
            id=WEEK_ID, label="Aug 2", year=2026, week_num=None,
            date_range="02.08.", is_current=False, period_type="day",
            sort_date=date(2026, 8, 2),
        ))
    db.commit()
    yield


def _results():
    tech = [
        {
            "content": f"Story {i}: a distinct AI news item number {i}.",
            "category": "AI", "tags": ["AI"], "iconType": "Brain", "impact": "medium",
            "timestamp": "2026-08-02", "source": "Example",
            "sourceUrl": f"https://example.com/story-{i}",
        }
        for i in range(10)
    ]
    videos = [
        {"video_id": vid, "title": f"Video {n}", "summary": f"Video summary {n}.", "category": "Video"}
        for n, vid in enumerate(VIDEO_IDS)
    ]
    tips = [{
        "content": "Tip context A.", "tip": "Do A.", "category": "Prompting",
        "difficulty": "Beginner", "platform": "Reddit", "timestamp": "2026-08-02",
        "sourceUrl": "https://example.com/tip-a",
    }]
    return {
        "tech": {"en": tech},
        "videos": {"en": videos},
        "tips": {"en": tips},
        "investment": {"primaryMarket": {"en": []}, "secondaryMarket": {"en": []}, "ma": {"en": []}},
        "trends": {"trends": {"en": [{"category": "AI", "title": "Agents"}]}},
    }


def _assert_tech_rows_aligned(db):
    rows = (
        db.query(TechPost).filter(TechPost.week_id == WEEK_ID)
        .order_by(TechPost.display_order).all()
    )
    assert len(rows) == 12
    assert sum(1 for r in rows if r.is_video) == 2
    for row in rows:
        assert row.content_de == f"[de] {row.content_en}", row.display_order
        for lang in TRANSLATION_LANGUAGES:
            assert translation_status(row, "tech", lang) == "ok", (row.display_order, lang)
            if lang != "de":
                assert row.translations[lang]["content"] == f"[{lang}] {row.content_en}"


def test_full_collection_order_aligns_translations(db):
    """Production order: save first, translate, then write translations back."""
    results = _results()
    collector.stage4_save_to_database(db, WEEK_ID, results, [])
    collector.stage3_5_translate_content(results)
    collector._backfill_translations_to_db(db, WEEK_ID, results)
    db.expire_all()

    _assert_tech_rows_aligned(db)
    tip = db.query(TipPost).filter(TipPost.week_id == WEEK_ID).one()
    assert translation_status(tip, "tip", "zh") == "ok"
    video = db.query(Video).filter(Video.video_id == VIDEO_IDS[1]).one()
    assert video.summary_de == "[de] Video summary 1."
    assert translation_status(video, "video", "ja") == "ok"
    trend = db.query(Trend).filter(Trend.week_id == WEEK_ID).one()
    assert trend.title_de == "[de] Agents"


def test_process_only_order_aligns_translations(db):
    """Process-only order: translate first, then save."""
    results = _results()
    collector.stage3_5_translate_content(results)
    collector.stage4_save_to_database(db, WEEK_ID, results, [])
    db.expire_all()

    _assert_tech_rows_aligned(db)
