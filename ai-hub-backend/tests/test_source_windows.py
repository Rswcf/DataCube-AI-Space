from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from app.services import collector, hn_fetcher, rss_fetcher, source_http


@pytest.mark.parametrize("day,hours,start", [
    ("2026-03-29", 23, "2026-03-28T23:00:00"),
    ("2026-10-25", 25, "2026-10-24T22:00:00"),
    ("2026-10-26", 24, "2026-10-25T23:00:00"),
])
def test_exact_berlin_calendar_window(day, hours, start):
    lo, hi = collector.get_week_boundaries(day)
    assert lo.isoformat() == start
    assert hi - lo == timedelta(hours=hours)
    assert not collector.is_article_in_week({"published": (lo - timedelta(seconds=1)).isoformat()}, lo, hi)
    assert collector.is_article_in_week({"published": lo.isoformat()}, lo, hi)
    assert not collector.is_article_in_week({"published": hi.isoformat()}, lo, hi)


def test_hn_delayed_run_queries_absolute_target_day(monkeypatch):
    lo, hi = collector.get_week_boundaries("2026-10-25")
    seen = {}
    def get(url, params, **kw):
        seen.update(params)
        hits = [{"objectID": str(i), "created_at_i": int(dt.replace(tzinfo=timezone.utc).timestamp()),
                 "title": "AI", "url": f"https://example.com/{i}"} for i, dt in enumerate((lo-timedelta(seconds=1), lo, hi))]
        return SimpleNamespace(raise_for_status=lambda: None, json=lambda: {"hits": hits})
    monkeypatch.setattr(hn_fetcher.requests, "get", get)
    rows = hn_fetcher._fetch_single_query("AI", 100, 1, 50, lo, hi)
    assert len(rows) == 1
    assert "created_at_i>=" in seen["numericFilters"] and "created_at_i<" in seen["numericFilters"]
    assert rows[0]["published"] == lo.isoformat()


def test_rss_rejects_html_and_filters_undated_and_outside_window(monkeypatch):
    response = SimpleNamespace(status_code=200, content=b"<html>Sign in</html>")
    monkeypatch.setattr(rss_fetcher, "fetch_source", lambda *a: response)
    report = {}
    assert rss_fetcher.fetch_feed_with_timeout("https://example.com/rss", report=report) == []
    assert report["status"] == "not_feed"
    response.content = b'''<rss version="2.0"><channel>
      <item><title>AI at start</title><link>https://example.com/1</link><pubDate>Mon, 26 Oct 2026 00:00:00 GMT</pubDate></item>
      <item><title>No date</title><link>https://example.com/2</link></item>
      <item><title>At end</title><link>https://example.com/3</link><pubDate>Tue, 27 Oct 2026 00:00:00 GMT</pubDate></item>
    </channel></rss>'''
    rows = rss_fetcher.fetch_feed_with_timeout("https://example.com/rss", report=report,
        window_start=datetime(2026, 10, 26), window_end=datetime(2026, 10, 27))
    assert [r["link"] for r in rows] == ["https://example.com/1"]
    assert report["status"] == "ok"


def test_robots_blocks_feed_and_redirect_is_rechecked(monkeypatch):
    called = []
    monkeypatch.setattr(source_http, "robots_allowed", lambda url, *a: "blocked.example" not in url)
    def get(url, **kwargs):
        called.append((url, kwargs))
        return SimpleNamespace(status_code=302, headers={"Location": "https://blocked.example/feed"})
    monkeypatch.setattr(source_http.requests, "get", get)
    with pytest.raises(source_http.SourceAccessError, match="robots disallows"):
        source_http.fetch_source("https://allowed.example/feed")
    assert len(called) == 1
    assert called[0][1]["allow_redirects"] is False


def test_source_configuration_disables_failed_sources_and_bounds_additions():
    sources = collector.load_sources()
    by_name = {s["name"]: s for rows in sources.values() for s in rows}
    for name in ("36Kr", "VentureBeat", "GlobeNewswire M&A", "The Register AI", "Reddit r/ChatGPT"):
        assert by_name[name]["enabled"] is False
        assert by_name[name]["disabled_reason"]
    assert by_name["arXiv AI/CL (preprints)"]["max_items"] == 8
    assert by_name["European Commission News"]["ai_only"]


def test_official_commission_rss_is_filtered_for_ai_before_generation(monkeypatch):
    def fetch(*args, **kwargs):
        kwargs["report"].update(status="ok")
        return [{"title": title, "summary": "", "published": "2026-10-26", "link": f"https://commission.europa.eu/{i}"}
                for i, title in enumerate(("New AI science policy", "Fisheries update"))]
    monkeypatch.setattr(rss_fetcher, "fetch_feed_with_timeout", fetch)
    rows = rss_fetcher.fetch_rss_feeds_parallel({"tech": [{"name": "European Commission News",
        "url": "https://commission.europa.eu/node/33506/rss_en", "ai_only": True}]})
    assert [r["title"] for r in rows] == ["New AI science policy"]
