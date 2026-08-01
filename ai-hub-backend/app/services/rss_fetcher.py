"""
RSS feed fetching service.
"""

import feedparser
import time
from datetime import datetime, timedelta
from typing import Optional
import logging
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

from app.config import get_settings

logger = logging.getLogger(__name__)

# Reddit limits unauthenticated .rss to roughly one request per minute per IP
# (verified 2026-08-01: first request 200, the following burst 429s, recovery
# after ~65s). Bursty fetching therefore guarantees 429s — Reddit feeds are
# pulled on a dedicated serial lane with spacing plus one retry pass.
REDDIT_SPACING_SECONDS = 75
REDDIT_RETRY_DELAY_SECONDS = 120


def _is_reddit(url: str) -> bool:
    return "reddit.com" in url


def _fetch_reddit_serial(
    reddit_tasks: list[tuple[str, str, str]], timeout: int | float
) -> list[tuple[str, str, str, list[dict]]]:
    """Fetch Reddit feeds one by one with spacing, retrying failures once."""
    results: list[tuple[str, str, str, list[dict]]] = []
    failed: list[tuple[str, str, str]] = []

    for i, (section, name, url) in enumerate(reddit_tasks):
        if i > 0:
            time.sleep(REDDIT_SPACING_SECONDS)
        articles = fetch_feed_with_timeout(url, 7, timeout)
        if articles:
            results.append((section, name, url, articles))
        else:
            failed.append((section, name, url))

    if failed:
        logger.info(
            f"Reddit retry pass: {len(failed)} feed(s) after {REDDIT_RETRY_DELAY_SECONDS}s cooldown"
        )
        time.sleep(REDDIT_RETRY_DELAY_SECONDS)
        for i, (section, name, url) in enumerate(failed):
            if i > 0:
                time.sleep(REDDIT_SPACING_SECONDS)
            articles = fetch_feed_with_timeout(url, 7, timeout)
            results.append((section, name, url, articles))

    return results


def fetch_feed(url: str, days: int = 7) -> list[dict]:
    """Fetch and parse an RSS feed, returning entries from the last N days."""
    cutoff = datetime.now() - timedelta(days=days)
    feed = feedparser.parse(url)
    articles = []

    for entry in feed.entries:
        published = None
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            published = datetime(*entry.published_parsed[:6])
        elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
            published = datetime(*entry.updated_parsed[:6])

        if published and published < cutoff:
            continue

        articles.append({
            "title": getattr(entry, "title", ""),
            "link": getattr(entry, "link", ""),
            "summary": getattr(entry, "summary", ""),
            "published": published.isoformat() if published else "",
        })

    return articles


def fetch_feed_with_timeout(url: str, days: int = 7, timeout: int | float = 20) -> list[dict]:
    """Fetch and parse a single RSS/Atom feed with an HTTP timeout.

    Uses requests to download content with timeout, then parses via feedparser.
    """
    cutoff = datetime.now() - timedelta(days=days)
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; AI-Hub-Bot/1.0; +https://www.datacubeai.space)"
    }
    try:
        resp = requests.get(url, headers=headers, timeout=timeout)
        resp.raise_for_status()
        feed = feedparser.parse(resp.content)
    except Exception as e:
        logger.error(f"RSS request failed for {url}: {e}")
        return []

    articles = []
    for entry in getattr(feed, "entries", []) or []:
        published = None
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            published = datetime(*entry.published_parsed[:6])
        elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
            published = datetime(*entry.updated_parsed[:6])

        if published and published < cutoff:
            continue

        articles.append({
            "title": getattr(entry, "title", ""),
            "link": getattr(entry, "link", ""),
            "summary": getattr(entry, "summary", ""),
            "published": published.isoformat() if published else "",
        })

    return articles


def fetch_rss_feeds(
    sources: dict[str, list[dict]],
    exclude_names: Optional[set[str]] = None,
) -> list[dict]:
    """Sequential RSS fetcher (backwards compatible)."""
    exclude_names = exclude_names or set()
    all_articles = []
    seen_urls = set()
    for section, source_list in sources.items():
        for source in source_list:
            name = source.get("name", "Unknown")
            if name in exclude_names:
                logger.info(f"[{section}] Skipping {name} (excluded)")
                continue
            url = source.get("url")
            if not url:
                continue
            logger.info(f"[{section}] Fetching {name}...")
            try:
                articles = fetch_feed(url)
            except Exception as e:
                logger.error(f"  -> Error fetching {name}: {e}")
                articles = []

            added = 0
            for article in articles:
                if article["link"] and article["link"] not in seen_urls:
                    seen_urls.add(article["link"])
                    article["source"] = name
                    article["original_section"] = section
                    all_articles.append(article)
                    added += 1
            logger.info(f"  -> {len(articles)} fetched, {added} new (after dedup)")
    return all_articles


def fetch_rss_feeds_parallel(
    sources: dict[str, list[dict]],
    exclude_names: Optional[set[str]] = None,
) -> list[dict]:
    """Fetch all RSS feeds from sources config in parallel.

    Returns list of articles with 'source' and 'original_section' fields set.
    Deduplicates across all sources by URL.
    """
    settings = get_settings()
    exclude_names = exclude_names or set()

    tasks: list[tuple[str, str, str]] = []  # (section, name, url)
    for section, source_list in sources.items():
        for source in source_list:
            name = source.get("name", "Unknown")
            url = source.get("url")
            if not url or name in exclude_names:
                if name in exclude_names:
                    logger.info(f"[{section}] Skipping {name} (excluded)")
                continue
            tasks.append((section, name, url))

    seen_urls: set[str] = set()
    all_articles: list[dict] = []

    def collect(section: str, name: str, articles: list[dict]) -> None:
        added = 0
        for article in articles or []:
            link = article.get("link")
            if link and link not in seen_urls:
                seen_urls.add(link)
                article["source"] = name
                article["original_section"] = section
                all_articles.append(article)
                added += 1
        logger.info(f"[{section}] {name}: {len(articles or [])} fetched, {added} new")

    reddit_tasks = [t for t in tasks if _is_reddit(t[2])]
    other_tasks = [t for t in tasks if not _is_reddit(t[2])]

    logger.info(
        f"Parallel RSS fetch: {len(other_tasks)} sources (workers={settings.rss_max_workers}) "
        f"+ {len(reddit_tasks)} Reddit feeds on the serial lane"
    )
    with ThreadPoolExecutor(max_workers=settings.rss_max_workers) as executor:
        # Reddit runs serially in ONE worker slot while the rest fan out —
        # total stage-1 time is dominated by the Reddit lane (~75s per feed).
        reddit_future = (
            executor.submit(
                _fetch_reddit_serial, reddit_tasks, settings.rss_request_timeout_seconds
            )
            if reddit_tasks
            else None
        )

        future_map = {
            executor.submit(
                fetch_feed_with_timeout,
                url,
                7,
                settings.rss_request_timeout_seconds,
            ): (section, name, url)
            for (section, name, url) in other_tasks
        }

        for future in as_completed(future_map):
            section, name, url = future_map[future]
            try:
                articles = future.result()
            except Exception as e:
                logger.error(f"[{section}] Error fetching {name}: {e}")
                continue
            collect(section, name, articles)

        if reddit_future is not None:
            try:
                for section, name, url, articles in reddit_future.result():
                    collect(section, name, articles)
            except Exception as e:
                logger.error(f"Reddit serial lane failed: {e}")

    return all_articles
