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
    assert by_name["European Commission Digital Strategy"]["ai_only"]


def test_commission_index_dates_links_and_structure_guard():
    from app.services.ec_news import parse_ec_news
    html = b'''<article class="ecl-content-item"><li class="ecl-content-block__primary-meta-item">News article</li>
    <li class="ecl-content-block__primary-meta-item">26 October 2026</li><a data-ecl-title-link href="/en/news/raise">AI in science</a>
    <div class="ecl-content-block__description">Research support</div></article>'''
    row = parse_ec_news(html, "https://digital-strategy.ec.europa.eu/en/news")[0]
    assert row["link"] == "https://digital-strategy.ec.europa.eu/en/news/raise"
    assert row["published"] == "2026-10-25T23:00:00"
    assert row["summary"] == "Research support"
    with pytest.raises(ValueError, match="structure changed"):
        parse_ec_news(b"<html>blocked</html>", "https://digital-strategy.ec.europa.eu/en/news")
