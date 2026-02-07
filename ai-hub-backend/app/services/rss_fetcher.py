"""
RSS feed fetching service.
"""

import feedparser
from datetime import datetime, timedelta
from typing import Optional
import logging
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

from app.config import get_settings

logger = logging.getLogger(__name__)


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

    logger.info(f"Parallel RSS fetch: {len(tasks)} sources, workers={settings.rss_max_workers}")
    with ThreadPoolExecutor(max_workers=settings.rss_max_workers) as executor:
        future_map = {
            executor.submit(
                fetch_feed_with_timeout,
                url,
                7,
                settings.rss_request_timeout_seconds,
            ): (section, name, url)
            for (section, name, url) in tasks
        }

        for future in as_completed(future_map):
            section, name, url = future_map[future]
            try:
                articles = future.result()
            except Exception as e:
                logger.error(f"[{section}] Error fetching {name}: {e}")
                continue

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

    return all_articles
