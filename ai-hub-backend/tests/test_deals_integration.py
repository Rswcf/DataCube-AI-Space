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

from app.database import get_session_local
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
    # Commit the parent Week before inserting articles: without a
    # relationship() SQLAlchemy does not order cross-mapper inserts by FK,
    # so a single flush can emit raw_articles before weeks.
    db.commit()
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


WEEK_ID_2 = "2026-08-02"
SOURCE_URL_2 = "https://example.com/beta-round"


def test_save_deals_concurrent_cross_period(db):
    """Concurrent writers on DIFFERENT periods must not block or interfere:
    the advisory lock is per-period, so both rows land."""
    if not db.query(Week).filter(Week.id == WEEK_ID_2).first():
        db.add(Week(
            id=WEEK_ID_2, label="Aug 2", year=2026, week_num=None,
            date_range="02.08.", is_current=False, period_type="day",
            sort_date=date(2026, 8, 2),
        ))
    db.commit()
    db.query(RawArticle).filter(RawArticle.week_id == WEEK_ID_2).delete()
    db.add(RawArticle(
        week_id=WEEK_ID_2, source="Example Wire",
        title="Beta AI raises Series B",
        link=SOURCE_URL_2,
        summary="Beta AI raised $30 million in a Series B round.",
        published="2026-08-02", original_section="investment",
    ))
    db.commit()

    beta_data = {
        "primaryMarket": {"en": [{
            "company": "Beta AI", "amount": "$30M", "round": "Series B",
            "roundCategory": "Series B", "investors": [],
            "content": "Beta AI raised a Series B.",
            "evidence": "Beta AI raised $30 million in a Series B round",
            "timestamp": "2026-08-02", "sourceUrl": SOURCE_URL_2,
        }]},
        "ma": {"en": []},
    }

    factory = get_session_local()
    errors = []

    def worker(week_id, data):
        session = factory()
        try:
            _save_deals(session, week_id, data)
            session.commit()
        except Exception as exc:  # pragma: no cover
            errors.append(exc)
            session.rollback()
        finally:
            session.close()

    threads = [
        threading.Thread(target=worker, args=(WEEK_ID, _investment_data())),
        threading.Thread(target=worker, args=(WEEK_ID_2, beta_data)),
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert not errors
    session = factory()
    try:
        assert len(_deal_rows(session)) == 1
        assert session.query(Deal).filter(Deal.company == "Beta AI").count() == 1
    finally:
        session.close()


def test_distinct_months_both_persist(db):
    """Same company/round/amount announced in DIFFERENT months are distinct
    events — month is part of the fingerprint, so both rows must survive."""
    db.add(RawArticle(
        week_id=WEEK_ID, source="Example Wire",
        title="Acme AI July round",
        link="https://example.com/acme-july",
        summary="Acme AI raised $20 million in a Series A round led by Foo Capital.",
        published="2026-07-15", original_section="investment",
    ))
    db.commit()
    data = _investment_data()
    data["primaryMarket"]["en"].append({
        "company": "Acme AI", "amount": "$20M", "round": "Series A",
        "roundCategory": "Series A", "investors": ["Foo Capital"],
        "content": "Acme AI raised a Series A (July report).",
        "evidence": "Acme AI raised $20 million in a Series A round",
        "timestamp": "2026-07-15", "sourceUrl": "https://example.com/acme-july",
    })
    _save_deals(db, WEEK_ID, data)
    db.commit()
    rows = _deal_rows(db)
    assert len(rows) == 2
    months = sorted(r.announced_date.strftime("%Y-%m") for r in rows)
    assert months == ["2026-07", "2026-08"]


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


def test_api_detail_rate_limit(client, db):
    """The per-record evidence endpoint has its own 30/min bucket."""
    deal_id = _deal_rows(db)[0].id
    codes = [client.get(f"/api/deals/{deal_id}").status_code for _ in range(31)]
    assert codes[0] == 200
    assert codes[-1] == 429
