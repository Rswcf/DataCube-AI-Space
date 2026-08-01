"""Database-backed integration tests for the deals layer (Codex R7).

Requires a real PostgreSQL (the models use ARRAY/JSONB and the writer path
uses advisory locks + ON CONFLICT). Run in CI via the backend-integration
job: a postgres:16 service, `alembic upgrade head`, then
`pytest tests/test_deals_integration.py -v`.

Covered contracts:
- _save_deals idempotence (sequential re-run) and concurrency (two threads,
  independent sessions) — exactly one row per fingerprint
- manual `corrected` rows survive reprocessing
- genuinely distinct events (different amount/month) both persist
- evidence gate end-to-end (wrong-currency figure stripped)
- takedown propagation (delete_period removes Deal rows)
- API: no evidence in the collection endpoint, per-record delivery,
  CSV column policy + formula-injection sanitization, rate limiting
"""

import threading
from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.database import get_engine, get_session_local
from app.main import app
from app.models import Deal, RawArticle, Week
from app.services.collector import _save_deals, delete_period
import app.routers.deals as deals_router

WEEK_ID = "2026-08-01"
SOURCE_URL = "https://example.com/acme-round"


@pytest.fixture()
def db():
    session = get_session_local()()
    yield session
    session.rollback()
    session.close()


@pytest.fixture(autouse=True)
def clean_state(db):
    """Fresh period + raw articles before each test; deals wiped."""
    db.query(Deal).delete()
    db.query(RawArticle).filter(RawArticle.week_id == WEEK_ID).delete()
    if not db.query(Week).filter(Week.id == WEEK_ID).first():
        db.add(Week(
            id=WEEK_ID, label="Aug 1", year=2026, week_num=None,
            date_range="01.08.", is_current=False, period_type="day",
            sort_date=date(2026, 8, 1),
        ))
    db.add(RawArticle(
        week_id=WEEK_ID, source="Example Wire",
        title="Acme AI raises Series A",
        link=SOURCE_URL,
        summary="Acme AI raised $20 million in a Series A round led by Foo Capital.",
        published="2026-08-01", original_section="investment",
    ))
    db.commit()
    deals_router._RATE_BUCKETS.clear()
    deals_router._FACETS_CACHE.update(at=0.0, data=None)
    yield


def _investment_data(amount="$20M", evidence="Acme AI raised $20 million in a Series A round"):
    return {
        "primaryMarket": {"en": [{
            "company": "Acme AI", "amount": amount, "round": "Series A",
            "roundCategory": "Series A", "investors": ["Foo Capital"],
            "content": "Acme AI raised a Series A.", "evidence": evidence,
            "timestamp": "2026-08-01", "sourceUrl": SOURCE_URL,
        }]},
        "ma": {"en": []},
    }


def _deal_rows(db):
    return db.query(Deal).filter(Deal.company == "Acme AI").all()


def test_save_deals_idempotent(db):
    _save_deals(db, WEEK_ID, _investment_data())
    db.commit()
    _save_deals(db, WEEK_ID, _investment_data())
    db.commit()
    rows = _deal_rows(db)
    assert len(rows) == 1
    assert rows[0].amount_value == 20_000_000
    assert rows[0].currency == "USD"
    assert rows[0].evidence


def test_save_deals_concurrent_writers():
    """Two independent sessions writing the same period concurrently must
    produce exactly one row (advisory lock + unique fingerprint)."""
    factory = get_session_local()
    errors = []

    def worker():
        session = factory()
        try:
            _save_deals(session, WEEK_ID, _investment_data())
            session.commit()
        except Exception as exc:  # pragma: no cover
            errors.append(exc)
            session.rollback()
        finally:
            session.close()

    threads = [threading.Thread(target=worker) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert not errors
    session = factory()
    try:
        assert len(_deal_rows(session)) == 1
    finally:
        session.close()


def test_corrected_row_survives_reprocess(db):
    _save_deals(db, WEEK_ID, _investment_data())
    db.commit()
    row = _deal_rows(db)[0]
    row.status = "corrected"
    row.amount_raw = "$21M"
    db.commit()

    _save_deals(db, WEEK_ID, _investment_data())
    db.commit()
    rows = _deal_rows(db)
    assert len(rows) == 1
    assert rows[0].status == "corrected"
    assert rows[0].amount_raw == "$21M"


def test_distinct_events_both_persist(db):
    db.add(RawArticle(
        week_id=WEEK_ID, source="Example Wire",
        title="Acme AI raises again",
        link="https://example.com/acme-round-2",
        summary="Acme AI raised $50 million in a Series B round.",
        published="2026-08-01", original_section="investment",
    ))
    db.commit()
    data = _investment_data()
    data["primaryMarket"]["en"].append({
        "company": "Acme AI", "amount": "$50M", "round": "Series B",
        "roundCategory": "Series B", "investors": [],
        "content": "Acme AI raised a Series B.",
        "evidence": "Acme AI raised $50 million in a Series B round",
        "timestamp": "2026-08-01", "sourceUrl": "https://example.com/acme-round-2",
    })
    _save_deals(db, WEEK_ID, data)
    db.commit()
    assert len(_deal_rows(db)) == 2


def test_wrong_currency_figure_stripped(db):
    # Evidence says €20 million; claimed amount is $20M -> figure must drop.
    db.query(RawArticle).filter(RawArticle.week_id == WEEK_ID).delete()
    db.add(RawArticle(
        week_id=WEEK_ID, source="Example Wire",
        title="Acme AI raises Series A",
        link=SOURCE_URL,
        summary="Acme AI raised €20 million in a Series A round.",
        published="2026-08-01", original_section="investment",
    ))
    db.commit()
    _save_deals(db, WEEK_ID, _investment_data(
        amount="$20M",
        evidence="Acme AI raised €20 million in a Series A round"))
    db.commit()
    rows = _deal_rows(db)
    assert len(rows) == 1
    assert rows[0].amount_value is None
    assert rows[0].amount_raw is None


def test_takedown_propagates(db):
    _save_deals(db, WEEK_ID, _investment_data())
    db.commit()
    assert len(_deal_rows(db)) == 1
    delete_period(db, WEEK_ID)
    assert db.query(Deal).filter(Deal.week_id == WEEK_ID).count() == 0


@pytest.fixture()
def client(db):
    _save_deals(db, WEEK_ID, _investment_data())
    db.commit()
    with TestClient(app) as c:
        yield c


def test_api_collection_never_serves_evidence(client, db):
    body = client.get("/api/deals?limit=200").json()
    assert body["total"] >= 1
    for row in body["deals"]:
        assert row["evidence"] is None
    flagged = [r for r in body["deals"] if r["hasEvidence"]]
    assert flagged, "expected at least one row flagged hasEvidence"

    detail = client.get(f"/api/deals/{flagged[0]['id']}").json()
    assert detail["evidence"], "per-record endpoint must serve the excerpt"


def test_api_csv_policy_and_injection(client, db):
    db.add(Deal(
        week_id=WEEK_ID, deal_type="funding", company="=SUM(A1:A9) Corp",
        investors=["@evil"], content_en="+payload", status="legacy_unverified",
        fingerprint="testinjectionfingerprint000000",
    ))
    db.commit()
    resp = client.get("/api/deals/export.csv")
    assert resp.status_code == 200
    header = resp.text.splitlines()[0]
    assert "evidence" not in header
    assert "'=SUM(A1:A9) Corp" in resp.text
    assert "'@evil" in resp.text
    assert "'+payload" in resp.text


def test_api_rate_limit(client):
    codes = [client.get("/api/deals?limit=1").status_code for _ in range(61)]
    assert 429 in codes
    assert codes[0] == 200
