"""M&A-only saves keep EN-native rows (regression: zero rows were saved).

Requires local PostgreSQL.
"""

from datetime import date

import pytest

from app.database import get_session_local
from app.models import MAPost, Week
from app.services.collector import stage4_save_ma_to_database

pytestmark = pytest.mark.integration

WEEK_ID = "2026-08-04"


@pytest.fixture()
def db():
    session = get_session_local()()
    yield session
    session.rollback()
    session.close()


@pytest.fixture(autouse=True)
def clean_period(db):
    db.query(MAPost).filter(MAPost.week_id == WEEK_ID).delete()
    if not db.query(Week).filter(Week.id == WEEK_ID).first():
        db.add(Week(
            id=WEEK_ID, label="Aug 4", year=2026, week_num=None,
            date_range="04.08.", is_current=False, period_type="day",
            sort_date=date(2026, 8, 4),
        ))
    db.commit()
    yield


def test_ma_only_save_keeps_english_native_rows(db):
    investment = {"ma": {"en": [{
        "acquirer": "Acme", "target": "Widget AI", "dealValue": "$100M", "dealType": "Acquisition",
        "industry": "AI Enterprise", "content": "Acme acquires Widget AI.",
        "timestamp": "2026-08-04", "sourceUrl": "https://example.com/acme-widget",
    }]}}

    stage4_save_ma_to_database(db, WEEK_ID, investment)

    rows = db.query(MAPost).filter(MAPost.week_id == WEEK_ID).all()
    assert len(rows) == 1
    assert rows[0].content_en == "Acme acquires Widget AI."
    assert rows[0].content_de == "Acme acquires Widget AI."  # EN fallback until translated
    assert rows[0].acquirer == "Acme"
    assert rows[0].deal_type_en == "Acquisition"
