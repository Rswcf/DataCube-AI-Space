"""Bounded RSS acquisition with dates, permissions and per-source diagnostics."""
import logging
import re
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlsplit

import feedparser

from app.config import get_settings
from app.services.source_http import fetch_source, SourceAccessError
from app.services.source_integrity import canonical_url

logger = logging.getLogger(__name__)

_HREF = re.compile(r"""<a\s[^>]*href=["']([^"']+)["']""", re.I)


def original_link(summary_html: str, aggregator_host: str) -> str | None:
    """First article URL in an aggregator entry that points off the aggregator.

    Techmeme entries link the original report first (image and headline),
    then the publisher's home page. Home pages and the aggregator's own
    permalinks are skipped. Returns None when no article URL is present.
    """
    for href in _HREF.findall(summary_html or ""):
        url = canonical_url(href)
        if not url:
            continue
        parts = urlsplit(url)
        if parts.hostname == aggregator_host or parts.hostname.endswith("." + aggregator_host):
            continue
        if parts.path in {"", "/"}:
            continue
        return href
    return None


def fetch_feed_with_timeout(url, days=7, timeout=20, *, window_start=None, window_end=None, report=None, max_items=200):
    report = report if report is not None else {}
    report.update(url=url, status="failed", fetched=0)
    try:
        resp = fetch_source(url, timeout)
        report["http"] = resp.status_code
        feed = feedparser.parse(resp.content[:3000000])
        if not feed.version:
            report["status"] = "not_feed"
            return []
        entries = feed.entries
        cutoff = window_start if window_start is not None else datetime.utcnow() - timedelta(days=days)
        articles = []
        for entry in entries:
            dt = entry.get("published_parsed") or entry.get("updated_parsed")
            published = datetime(*dt[:6]) if dt else None
            if not published or published < cutoff or published > datetime.utcnow() + timedelta(minutes=5) or (window_end and published >= window_end):
                continue
            link = entry.get("link", "")
            if not canonical_url(link):
                continue
            articles.append({"title": entry.get("title", ""), "link": link,
                             "summary": entry.get("summary", "")[:6000], "published": published.isoformat()})
        articles.sort(key=lambda a: (a["published"], a["link"]), reverse=True)
        report.update(status="ok" if articles else "quiet", fetched=len(articles),
                      available_entries=len(entries), retained=min(len(articles), max_items))
        return articles[:max_items]
    except SourceAccessError as exc:
        report.update(status="policy_blocked", error=str(exc))
    except Exception as exc:
        report.update(status="failed", error=type(exc).__name__)
        response = getattr(exc, "response", None)
        if response is not None:
            report["http"] = response.status_code
        logger.warning("Source fetch failed for %s (%s)", url, type(exc).__name__)
    return []


def fetch_feed(url, days=7):
    return fetch_feed_with_timeout(url, days)


def fetch_rss_feeds_parallel(sources, exclude_names=None, *, window_start=None, window_end=None, reports=None):
    settings = get_settings()
    reports = reports if reports is not None else {}
    tasks = [(section, s) for section, rows in sources.items() for s in rows
             if s.get("url") and s.get("enabled", True) and s.get("name") not in (exclude_names or set())]
    def fetch(section, source):
        report = {}
        rows = fetch_feed_with_timeout(source["url"], 7, settings.rss_request_timeout_seconds,
                                       window_start=window_start, window_end=window_end, report=report,
                                       max_items=source.get("max_items", 200))
        return section, source, rows, report
    combined = []
    with ThreadPoolExecutor(max_workers=settings.rss_max_workers) as executor:
        futures = [executor.submit(fetch, section, source) for section, source in tasks]
        for f in as_completed(futures):
            section, source, rows, report = f.result()
            reports[source["name"]] = report
            retained = 0
            for row in rows:
                if source.get("ai_only") and not re.search(r"\b(artificial intelligence|AI|machine learning|semiconductor|chips? act)\b", row["title"] + " " + row["summary"], re.I):
                    continue
                if source.get("original_link"):
                    # Link the original report; keep the aggregator permalink as `via`.
                    original = original_link(row["summary"], source["original_link"])
                    if original:
                        row["via"], row["link"] = row["link"], original
                if source.get("preprint"):
                    row["summary"] = "PREPRINT: research claims are not independently validated. " + row["summary"]
                row.update(source=source["name"], original_section=section)
                combined.append(row)
                retained += 1
            # Count items actually admitted after topic filtering, rather
            # than all dated feed entries (important for broad policy feeds).
            report["retained"] = retained
    # Completion speed must not determine source ownership or input order.
    combined.sort(key=lambda a: (a["published"], a["source"], a["link"]))
    seen, result = set(), []
    for article in combined:
        key = canonical_url(article["link"])
        if key not in seen:
            seen.add(key)
            result.append(article)
    return result


def fetch_rss_feeds(sources, exclude_names=None):
    return fetch_rss_feeds_parallel(sources, exclude_names)
