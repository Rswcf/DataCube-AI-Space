from datetime import date

import pytest

from app.database import get_session_local
from app.models import RawArticle, RawVideo, TipPost, Week
from app.models.source_cache import SourceCache, SourceHealth
from app.services import collector, source_prefetch
from app.services.tip_source_repair import apply_manifest, content_digest, metadata, plan_repair

pytestmark = pytest.mark.integration
PERIOD = "2026-10-26"


@pytest.fixture
def db():
    session = get_session_local()()
    for model in (RawArticle, RawVideo, TipPost):
        session.query(model).filter(model.week_id == PERIOD).delete()
    session.query(SourceCache).delete()
    session.query(SourceHealth).delete()
    session.commit()
    yield session
    session.rollback()
    session.close()


def input_article(number=1):
    return {"title": f"AI workflow {number}", "source": "Expert", "link": f"https://expert.example/{number}",
            "summary": "Test on a copy before editing production", "published": "2026-10-26T12:00:00", "original_section": "tips"}


def test_prefetch_is_idempotent_and_never_creates_public_editions(db, monkeypatch):
    before = db.query(Week).count()
    def fetch(*args, reports, **kwargs):
        reports.update(Expert={"status": "ok"}, Broken={"status": "not_feed"})
        return [input_article()]
    monkeypatch.setattr(source_prefetch, "fetch_rss_feeds_parallel", fetch)
    for _ in range(2):
        result = source_prefetch.cache_sources(db, {})
        assert result["status"] == "degraded" and result["model_calls"] == 0
    assert db.query(SourceCache).count() == 1
    assert db.query(SourceHealth).count() == 2
    assert db.query(Week).count() == before
    monkeypatch.setattr(collector, "load_sources", lambda: {"tips": [{"name": "Expert"}]})
    lo, hi = collector.get_week_boundaries(PERIOD)
    assert len(source_prefetch.cached_articles(db, lo, hi)) == 1
    monkeypatch.setattr(collector, "load_sources", lambda: {"tips": []})
    assert source_prefetch.cached_articles(db, lo, hi) == []
    assert db.query(SourceCache).count() == 1


def test_no_usable_sources_is_failure_and_health_is_retained(db, monkeypatch):
    def fetch(*args, reports, **kw):
        reports["Broken"] = {"status": "failed"}
        return []
    monkeypatch.setattr(source_prefetch, "fetch_rss_feeds_parallel", fetch)
    with pytest.raises(RuntimeError, match="No source"):
        source_prefetch.cache_sources(db, {})
    assert db.query(SourceHealth).one().report["status"] == "failed"


def test_stage1_keeps_earlier_polls_and_deduplicates_retry(db, monkeypatch):
    collector.ensure_week(db, PERIOD)
    db.add(RawArticle(week_id=PERIOD, **{**input_article(), "source": "Hacker News", "summary": "[HN Discussion Highlights]"}))
    db.commit()
    monkeypatch.setattr(collector, "fetch_hn_stories", lambda **kw: [])
    monkeypatch.setattr(collector, "fetch_youtube_videos", lambda **kw: [])
    monkeypatch.setattr(collector, "fetch_rss_feeds_parallel", lambda *a, **kw: [input_article(), input_article(2)])
    monkeypatch.setattr(source_prefetch, "cached_articles", lambda *a: [input_article(3)])
    for _ in range(2):
        assert collector.stage1_fetch_and_store(db, PERIOD)["articles"] == 3
    assert db.query(RawArticle).filter(RawArticle.week_id == PERIOD, RawArticle.link == input_article()["link"]).one().source == "Expert"
    assert {r.link for r in db.query(RawArticle).filter(RawArticle.week_id == PERIOD)} == {
        input_article(i)["link"] for i in (1, 2, 3)}


def test_historical_repair_and_restore_preserve_ids_content_translations_and_guard_conflicts(db):
    collector.ensure_week(db, PERIOD)
    db.add(RawArticle(week_id=PERIOD, **input_article()))
    for url in (input_article()["link"], "https://invented.example/fake"):
        db.add(TipPost(week_id=PERIOD, content_en="Keep this text", content_de="Text bewahren", tip_en="Use a copy",
            tip_de="Kopie nutzen", category_en="Tools", category_de="Tools", platform="Reddit", difficulty_en="Beginner",
            difficulty_de="Anfänger", author={"name": "Reddit"}, timestamp="2026-02-01", source_url=url,
            metrics={}, translations={"zh": {"content": "保留原文", "tip": "使用副本"}}))
    db.commit()
    rows = db.query(TipPost).filter(TipPost.week_id == PERIOD).order_by(TipPost.id).all()
    original = [(r.id, content_digest(r), metadata(r)) for r in rows]
    plan = plan_repair(db, PERIOD, PERIOD)
    assert plan["summary"] == {"rows": 2, "retained_input_urls": 1, "removed_unmatched_urls": 1}
    assert apply_manifest(db, plan)["rows"] == 2
    assert [r.timestamp for r in rows] == [date(2026, 10, 26).isoformat()] * 2
    assert rows[1].source_url is None
    assert [(r.id, content_digest(r)) for r in rows] == [(i, h) for i, h, _ in original]
    assert plan_repair(db, PERIOD, PERIOD)["rows"] == []
    rows[0].timestamp = "2026-10-25"
    db.commit()
    with pytest.raises(ValueError, match="changed"):
        apply_manifest(db, plan, restore=True)
    rows[0].timestamp = "2026-10-26"
    db.commit()
    assert apply_manifest(db, plan, restore=True)["rows"] == 2
    assert [(r.id, content_digest(r), metadata(r)) for r in rows] == original
