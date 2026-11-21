"""arXiv announcement batches must reach the edition through the source cache.

The fixture is a trimmed copy of the real cs.AI feed as archived at
2026-11-10 00:01 UTC (abstracts and authors removed). Every item carries the
announcement date, Mon 09 Nov 2026 00:00 -0500 (05:00 UTC). arXiv rebuilds the
feed at 05:00 UTC, so the collection run for 2026-11-09 (next morning, Berlin
time) only sees the 10 Nov batch. Production logs showed `fetched: 0` for
arXiv on all 17 editions from 2026-11-04 to 2026-11-20.
"""
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.database import get_session_local
from app.models import RawArticle, RawVideo, Week
from app.models.source_cache import SourceCache, SourceHealth
from app.services import collector, rss_fetcher, source_prefetch

pytestmark = pytest.mark.integration
PERIOD = "2026-11-09"
FEED = (Path(__file__).parent / "fixtures" / "arxiv_cs_ai_2026-11-09.xml").read_bytes()
NEXT_DAY_FEED = FEED.replace(b"Mon, 09 Nov 2026", b"Tue, 10 Nov 2026")
SOURCES = {"tech": [{"url": "https://rss.arxiv.org/rss/cs.AI+cs.CL", "name": "arXiv AI/CL (preprints)",
                     "max_items": 8, "preprint": True}]}


def clock(moment):
    class Clock(datetime):
        @classmethod
        def utcnow(cls):
            return moment
    return Clock


@pytest.fixture
def db():
    session = get_session_local()()
    for model in (RawArticle, RawVideo):
        session.query(model).filter(model.week_id == PERIOD).delete()
    session.query(SourceCache).delete()
    session.query(SourceHealth).delete()
    session.commit()
    yield session
    session.rollback()
    session.close()


def serve(monkeypatch, body):
    monkeypatch.setattr(rss_fetcher, "fetch_source",
                        lambda url, timeout: SimpleNamespace(status_code=200, content=body))


def test_arxiv_batch_reaches_raw_pool_through_cache(db, monkeypatch):
    monkeypatch.setattr(collector, "load_sources", lambda: SOURCES)

    # Prefetch on the announcement day (production ran one at 21:01 UTC).
    serve(monkeypatch, FEED)
    monkeypatch.setattr(source_prefetch, "datetime", clock(datetime(2026, 11, 9, 21, 1)))
    monkeypatch.setattr(rss_fetcher, "datetime", clock(datetime(2026, 11, 9, 21, 1)))
    source_prefetch.cache_sources(db, SOURCES)
    assert db.query(SourceCache).count() == 8  # bounded by max_items

    # Collection the next morning: the feed now holds only the 10 Nov batch.
    serve(monkeypatch, NEXT_DAY_FEED)
    monkeypatch.setattr(rss_fetcher, "datetime", clock(datetime(2026, 11, 10, 6, 25)))
    monkeypatch.setattr(collector, "fetch_hn_stories", lambda **kw: [])
    monkeypatch.setattr(collector, "fetch_youtube_videos", lambda **kw: [])
    collector.ensure_week(db, PERIOD)
    counts = collector.stage1_fetch_and_store(db, PERIOD)

    report = counts["sources"]["arXiv AI/CL (preprints)"]
    assert report["status"] == "quiet" and report["fetched"] == 0  # what the live log showed
    assert report["cached"] == 8
    assert counts["pool"] == {"arXiv AI/CL (preprints)": {"unclassified": 8}}
    rows = db.query(RawArticle).filter(RawArticle.week_id == PERIOD).all()
    assert len(rows) == 8 and all(r.summary.startswith("PREPRINT:") for r in rows)
    assert db.query(Week).filter(Week.id == PERIOD).count() == 1

    # After stage 2 the pool shows where the rows went.
    rows[0].section = "deferred"
    rows[1].section = "offtopic"
    db.commit()
    assert collector.pool_by_source(db, PERIOD) == {
        "arXiv AI/CL (preprints)": {"deferred": 1, "offtopic": 1, "unclassified": 6}}
