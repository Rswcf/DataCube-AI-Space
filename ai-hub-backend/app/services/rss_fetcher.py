"""
RSS feed fetching service.
"""

import feedparser
from datetime import datetime, timedelta
from typing import Optional
import logging

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


def fetch_rss_feeds(
    sources: dict[str, list[dict]],
    exclude_names: Optional[set[str]] = None,
) -> list[dict]:
    """
    Fetch all RSS feeds from sources config.

    Args:
        sources: Dict of section -> list of source configs
        exclude_names: Set of source names to skip (e.g., "Hacker News" if using enhanced)

    Returns:
        List of articles with source and original_section tags
    """
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
                added = 0

                for article in articles:
                    if article["link"] and article["link"] not in seen_urls:
                        seen_urls.add(article["link"])
                        article["source"] = name
                        article["original_section"] = section
                        all_articles.append(article)
                        added += 1

                logger.info(f"  -> {len(articles)} fetched, {added} new (after dedup)")

            except Exception as e:
                logger.error(f"  -> Error fetching {name}: {e}")

    return all_articles
