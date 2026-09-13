"""The translation backfill repairs misaligned rows and writes German columns.

Requires local PostgreSQL.
"""

from datetime import date

import pytest
from fastapi.testclient import TestClient

import app.services.translation_backfill as backfill
from app.database import get_session_local
from app.main import app
from app.models import TechPost, Week
from app.routers.admin import verify_api_key
from app.services.i18n_utils import TRANSLATION_LANGUAGES
from app.services.translation_integrity import translation_status

pytestmark = pytest.mark.integration

WEEK_ID = "2026-08-03"


class FakeTranslator:
    CHEAP_TRANSLATOR_MODELS = ["cheap/test-model"]
    models_seen: list = []

    def translate_batch(self, items, target_lang, fields, batch_size=10, models=None):
        FakeTranslator.models_seen.append(models)
        return [
            {field: f"[{target_lang}] {item[field]}" for field in fields if isinstance(item.get(field), str)}
            for item in items
        ]


@pytest.fixture()
def db():
    session = get_session_local()()
    yield session
    session.rollback()
    session.close()


@pytest.fixture(autouse=True)
def misaligned_period(db, monkeypatch):
    FakeTranslator.models_seen = []
    monkeypatch.setattr(backfill, "LLMProcessor", FakeTranslator)
    db.query(TechPost).filter(TechPost.week_id == WEEK_ID).delete()
    if not db.query(Week).filter(Week.id == WEEK_ID).first():
        db.add(Week(
            id=WEEK_ID, label="Aug 3", year=2026, week_num=None,
            date_range="03.08.", is_current=False, period_type="day",
            sort_date=date(2026, 8, 3),
        ))
    db.commit()
    # Two rows whose German/Chinese text belongs to the other story (the
    # 2026-08 shift), without integrity markers.
    for n, other in ((0, 1), (1, 0)):
        db.add(TechPost(
            week_id=WEEK_ID, content_en=f"English story {n}.", content_de=f"Deutsche Geschichte {other}.",
            category_en="AI", category_de="KI", author={"name": "Example"},
            tags_en=["AI"], tags_de=["KI"], icon_type="Brain", impact="medium",
            timestamp="2026-08-03", source="Example", source_url=f"https://example.com/{n}",
            metrics={}, is_video=False, display_order=n,
            translations={"zh": {"content": f"中文故事 {other}。"}},
        ))
    db.commit()
    yield


def _rows(db):
    db.expire_all()
    return (
        db.query(TechPost).filter(TechPost.week_id == WEEK_ID)
        .order_by(TechPost.display_order).all()
    )


def test_dry_run_counts_without_changes(db):
    summary = backfill.summarize_periods(db, [WEEK_ID])
    assert summary[WEEK_ID]["tech:zh"] == 2
    assert summary[WEEK_ID]["tech:de"] == 2
    assert _rows(db)[0].content_de == "Deutsche Geschichte 1."


def test_backfill_repairs_rows_and_german_columns(db):
    report = backfill.backfill_periods(db, [WEEK_ID], cheap=True)

    assert report == {WEEK_ID: 2}
    for row in _rows(db):
        assert row.content_de == f"[de] {row.content_en}"
        assert row.translations["zh"]["content"] == f"[zh] {row.content_en}"
        for lang in TRANSLATION_LANGUAGES:
            assert translation_status(row, "tech", lang) == "ok"
    assert FakeTranslator.models_seen
    assert all(models == ["cheap/test-model"] for models in FakeTranslator.models_seen)
    assert backfill.backfill_periods(db, [WEEK_ID]) == {}


def test_resolve_periods_since_selects_daily_periods(db):
    assert WEEK_ID in backfill.resolve_periods(db, since="2026-08-03")
    assert backfill.resolve_periods(db, period_id=WEEK_ID) == [WEEK_ID]


def test_admin_endpoint_dry_run(db):
    app.dependency_overrides[verify_api_key] = lambda: True
    try:
        response = TestClient(app).post(
            f"/api/admin/backfill-translations?period_id={WEEK_ID}&dry_run=true"
        )
    finally:
        app.dependency_overrides.pop(verify_api_key, None)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "dry_run"
    assert body["periods"][WEEK_ID]["tech:ko"] == 2
