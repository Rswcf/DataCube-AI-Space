"""Techmeme entries must link the original report, not the aggregator page."""
import hashlib
from datetime import datetime
from types import SimpleNamespace

import pytest

from app.services import rss_fetcher, source_prefetch
from app.services.source_integrity import canonical_url
from app.services.collector import load_sources
from app.services.rss_fetcher import fetch_rss_feeds_parallel, original_link

# Same structure as a real Techmeme item (2026-11-21); text is synthetic.
ENTRY = """<A HREF="https://www.example-news.com/2026/11/20/ai-lab-raises.html?gift=1"><IMG SRC="http://www.techmeme.com/261121/i7.jpg"></A>
<P><A HREF="https://www.techmeme.com/261121/p7#a261121p7" TITLE="Techmeme permalink">#</A>
<A HREF="https://www.example-news.com/">Example News</A>:<BR>
<B><A HREF="https://www.example-news.com/2026/11/20/ai-lab-raises.html?gift=1">AI lab raises $1B</A></B> &mdash; Lede.</P>"""

FEED = f"""<?xml version="1.0"?><rss version="2.0"><channel><title>Techmeme</title>
<item><title>AI lab raises $1B (Example News)</title>
<link>https://www.techmeme.com/261121/p7#a261121p7</link>
<description><![CDATA[{ENTRY}]]></description>
<pubDate>Sat, 21 Nov 2026 10:10:01 -0500</pubDate></item>
<item><title>Permalink only</title><link>https://www.techmeme.com/261121/p8#a261121p8</link>
<description><![CDATA[<A HREF="https://www.techmeme.com/261121/p8">#</A> <A HREF="https://www.example-news.com/">Home</A>]]></description>
<pubDate>Sat, 21 Nov 2026 10:00:00 -0500</pubDate></item>
</channel></rss>""".encode()


class Clock(datetime):
    """Pinned so the 7-day feed window does not expire the fixture."""
    @classmethod
    def utcnow(cls):
        return datetime(2026, 11, 21, 18, 0)


def test_original_link_skips_aggregator_and_home_pages():
    assert original_link(ENTRY, "techmeme.com") == "https://www.example-news.com/2026/11/20/ai-lab-raises.html?gift=1"
    assert original_link('<a href="https://www.techmeme.com/x">#</a> <a href="https://site.com/">Site</a>',
                         "techmeme.com") is None
    assert original_link("", "techmeme.com") is None


def test_techmeme_rows_link_original_and_keep_permalink(monkeypatch):
    monkeypatch.setattr(rss_fetcher, "datetime", Clock)
    monkeypatch.setattr(rss_fetcher, "fetch_source",
                        lambda url, timeout: SimpleNamespace(status_code=200, content=FEED))
    techmeme = next(s for rows in load_sources().values() for s in rows if s["name"] == "Techmeme")
    assert techmeme["original_link"] == "techmeme.com"
    rows = fetch_rss_feeds_parallel({"investment": [techmeme]}, window_start=None)
    by_title = {r["title"]: r for r in rows}
    first = by_title["AI lab raises $1B (Example News)"]
    assert first["link"].startswith("https://www.example-news.com/2026/11/20/")
    assert first["via"] == "https://www.techmeme.com/261121/p7#a261121p7"
    assert first["source"] == "Techmeme"  # source health and cache admission use the config name
    fallback = by_title["Permalink only"]
    assert fallback["link"].startswith("https://www.techmeme.com/") and "via" not in fallback


@pytest.mark.integration
def test_prefetch_replaces_rows_cached_under_the_permalink(monkeypatch):
    from app.database import get_session_local
    from app.models.source_cache import SourceCache, SourceHealth

    db = get_session_local()()
    try:
        db.query(SourceCache).delete()
        db.query(SourceHealth).delete()
        permalink = "https://www.techmeme.com/261121/p7#a261121p7"
        old_key = hashlib.sha256(canonical_url(permalink).encode()).hexdigest()
        db.add(SourceCache(key=old_key, published_at=datetime(2026, 11, 21, 15, 10),
                           payload={"link": permalink, "source": "Techmeme"}))
        db.commit()
        monkeypatch.setattr(rss_fetcher, "fetch_source",
                            lambda url, timeout: SimpleNamespace(status_code=200, content=FEED))
        monkeypatch.setattr(rss_fetcher, "datetime", Clock)
        monkeypatch.setattr(source_prefetch, "datetime", Clock)
        techmeme = next(s for rows in load_sources().values() for s in rows if s["name"] == "Techmeme")
        source_prefetch.cache_sources(db, {"investment": [techmeme]})
        links = sorted(row.payload["link"] for row in db.query(SourceCache).all())
        assert links == ["https://www.example-news.com/2026/11/20/ai-lab-raises.html?gift=1",
                         "https://www.techmeme.com/261121/p8#a261121p8"]
    finally:
        db.rollback()
        db.close()
