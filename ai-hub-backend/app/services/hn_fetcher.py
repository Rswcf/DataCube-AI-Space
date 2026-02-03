"""
Hacker News fetching service using Algolia API.
"""

import requests
from datetime import datetime, timedelta
from typing import Optional
from bs4 import BeautifulSoup
import logging
import re
from concurrent.futures import ThreadPoolExecutor, as_completed

from app.config import get_settings

logger = logging.getLogger(__name__)


# Default HN search queries for business-oriented AI coverage
# Optimized for consultants and analytics teams (non-developers)
HN_DEFAULT_QUERIES = [
    # General AI
    "AI",                  # General AI news
    "LLM",                 # Large Language Models
    "generative AI",       # Generative AI (business term)

    # Major Products & Companies
    "ChatGPT",             # OpenAI's ChatGPT
    "Claude",              # Anthropic's Claude
    "Gemini",              # Google's Gemini
    "OpenAI",              # Company news
    "Anthropic",           # Company news
    "Perplexity",          # AI search tool (research utility)

    # Emerging Models (free/low-cost options)
    "DeepSeek",            # High-quality free model
    "Grok",                # xAI model

    # Image & Video Generation (marketing use)
    "Sora",                # Video generation
    "Midjourney",          # Image generation
    "Stable Diffusion",    # Open-source image generation

    # Business Applications
    "AI startup",          # Startup news
    "AI funding",          # Investment news
    "AI acquisition",      # M&A news
    "AI enterprise",       # Enterprise applications
]


def _fetch_single_query(
    query: str,
    min_points: int,
    days: int,
    limit: int,
) -> list[dict]:
    """
    Fetch HN stories for a single query from Algolia API.

    Args:
        query: Search query
        min_points: Minimum points filter
        days: Look back period
        limit: Maximum number of stories

    Returns:
        List of HN stories with metadata
    """
    url = "https://hn.algolia.com/api/v1/search_by_date"
    params = {
        "query": query,
        "tags": "story",
        "numericFilters": f"points>{min_points}",
        "hitsPerPage": limit * 2,
    }

    settings = get_settings()
    try:
        resp = requests.get(
            url,
            params=params,
            timeout=settings.hn_request_timeout_seconds,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.error(f"Error fetching HN stories for query '{query}': {e}")
        return []

    cutoff = datetime.now() - timedelta(days=days)
    stories = []

    for hit in data.get("hits", []):
        created_at_i = hit.get("created_at_i", 0)
        created_at = datetime.fromtimestamp(created_at_i) if created_at_i else None

        if created_at and created_at < cutoff:
            continue

        stories.append({
            "title": hit.get("title", ""),
            "link": hit.get("url", ""),
            "hn_url": f"https://news.ycombinator.com/item?id={hit['objectID']}",
            "hn_id": hit.get("objectID"),
            "points": hit.get("points", 0),
            "num_comments": hit.get("num_comments", 0),
            "summary": "",
            "published": created_at.isoformat() if created_at else "",
            "source": "Hacker News",
        })

        if len(stories) >= limit:
            break

    return stories


def fetch_hn_top_stories(
    queries: list[str] = None,
    min_points: int = 100,
    days: int = 7,
    limit: int = 50,
) -> list[dict]:
    """
    Fetch top HN stories from Algolia API using multiple queries.

    Searches for multiple AI-related keywords and merges results,
    deduplicating by HN story ID and sorting by points.

    Args:
        queries: List of search queries (default: HN_DEFAULT_QUERIES)
        min_points: Minimum points filter
        days: Look back period
        limit: Maximum number of stories to return

    Returns:
        List of HN stories with metadata, sorted by points
    """
    if queries is None:
        queries = HN_DEFAULT_QUERIES

    settings = get_settings()
    all_stories: list[dict] = []
    seen_ids: set[str] = set()

    # Fetch stories for each query in parallel
    logger.info(f"HN parallel query fetch: {len(queries)} queries, workers={settings.hn_max_workers}")
    with ThreadPoolExecutor(max_workers=settings.hn_max_workers) as executor:
        futures = {
            executor.submit(_fetch_single_query, query, min_points, days, limit): query
            for query in queries
        }

        for future in as_completed(futures):
            query = futures[future]
            try:
                stories = future.result() or []
            except Exception as e:
                logger.error(f"HN query failed for '{query}': {e}")
                stories = []

            for story in stories:
                hn_id = story.get("hn_id")
                if hn_id and hn_id not in seen_ids:
                    seen_ids.add(hn_id)
                    all_stories.append(story)

    # Sort by points and limit results
    all_stories.sort(key=lambda x: x["points"], reverse=True)
    logger.info(f"Found {len(all_stories)} unique HN stories across {len(queries)} queries")

    return all_stories[:limit]


def fetch_hn_comments(story_id: str, limit: int = 5) -> list[str]:
    """Fetch top comments from an HN post."""
    url = f"https://hn.algolia.com/api/v1/items/{story_id}"

    settings = get_settings()
    try:
        resp = requests.get(url, timeout=settings.hn_request_timeout_seconds)
        resp.raise_for_status()
        data = resp.json()

        comments = []
        for child in data.get("children", [])[:limit]:
            text = child.get("text", "")
            if text and len(text) > 50:
                clean_text = BeautifulSoup(text, "lxml").get_text()
                comments.append(clean_text[:500])

        return comments

    except Exception as e:
        logger.error(f"HN comments error: {e}")
        return []


def detect_content_type(url: str) -> str:
    """Detect URL content type."""
    if not url:
        return "empty"

    url_lower = url.lower()

    if "youtube.com" in url_lower or "youtu.be" in url_lower:
        return "youtube"
    if url_lower.endswith(".pdf"):
        return "pdf"

    podcast_domains = ["spotify.com/episode", "podcasts.apple.com", "anchor.fm"]
    if any(d in url_lower for d in podcast_domains):
        return "podcast"

    if "twitter.com" in url_lower or "x.com" in url_lower:
        return "twitter"

    return "webpage"


def fetch_youtube_transcript(url: str) -> Optional[str]:
    """Fetch YouTube video transcript."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
    except ImportError:
        logger.warning("youtube-transcript-api not installed")
        return None

    patterns = [
        r"(?:v=|/v/|youtu\.be/)([a-zA-Z0-9_-]{11})",
        r"(?:embed/)([a-zA-Z0-9_-]{11})",
    ]

    video_id = None
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            video_id = match.group(1)
            break

    if not video_id:
        return None

    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

        for lang in ["en", "de"]:
            try:
                transcript = transcript_list.find_transcript([lang])
                entries = transcript.fetch()
                text = " ".join(e["text"] for e in entries)
                return text[:5000]
            except Exception:
                continue

        for transcript in transcript_list:
            if transcript.is_generated:
                entries = transcript.fetch()
                text = " ".join(e["text"] for e in entries)
                return text[:5000]

        return None

    except (TranscriptsDisabled, NoTranscriptFound):
        return None
    except Exception as e:
        logger.error(f"YouTube transcript error: {e}")
        return None


def fetch_webpage_content(url: str) -> Optional[str]:
    """Fetch webpage main content."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
        settings = get_settings()
        resp = requests.get(url, headers=headers, timeout=min(15, settings.hn_request_timeout_seconds))
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "lxml")

        for tag in soup(["script", "style", "nav", "header", "footer", "aside", "ads"]):
            tag.decompose()

        article = soup.find("article") or soup.find("main") or soup.find("body")

        if article:
            paragraphs = article.find_all("p")
            text = "\n".join(p.get_text().strip() for p in paragraphs if p.get_text().strip())
            return text[:5000] if text else None

        return None

    except Exception as e:
        logger.error(f"Webpage fetch error for {url}: {e}")
        return None


def enhance_hn_articles(stories: list[dict], max_items: int = 30) -> list[dict]:
    """Add full content and comments to HN articles."""
    enhanced = []

    for i, story in enumerate(stories[:max_items]):
        logger.info(f"[{i+1}/{min(len(stories), max_items)}] Processing: {story['title'][:50]}...")

        content_type = detect_content_type(story["link"])
        content = None

        if content_type == "youtube":
            content = fetch_youtube_transcript(story["link"])
            if content:
                logger.info(f"  YouTube transcript: {len(content)} chars")

        elif content_type == "webpage":
            content = fetch_webpage_content(story["link"])
            if content:
                logger.info(f"  Webpage content: {len(content)} chars")

        elif content_type in ("podcast", "pdf", "twitter", "empty"):
            logger.info(f"  Skipping {content_type}")

        # Fetch HN comments
        comments = []
        if story.get("hn_id"):
            comments = fetch_hn_comments(story["hn_id"], limit=3)
            if comments:
                logger.info(f"  HN comments: {len(comments)} top comments")

        # Combine content
        full_content = []
        if content:
            full_content.append(f"[Article Content]\n{content}")
        if comments:
            full_content.append(f"[HN Discussion Highlights]\n" + "\n---\n".join(comments))

        story["summary"] = "\n\n".join(full_content) if full_content else story["title"]
        story["content_type"] = content_type
        story["has_full_content"] = bool(content)

        enhanced.append(story)

    return enhanced


def _enhance_single_story(story: dict) -> dict:
    """Enhance a single HN story with content and comments."""
    content_type = detect_content_type(story.get("link"))
    content = None

    if content_type == "youtube":
        content = fetch_youtube_transcript(story.get("link", ""))
    elif content_type == "webpage":
        content = fetch_webpage_content(story.get("link", ""))

    comments = []
    if story.get("hn_id"):
        comments = fetch_hn_comments(story["hn_id"], limit=3)

    full_content = []
    if content:
        full_content.append(f"[Article Content]\n{content}")
    if comments:
        full_content.append(f"[HN Discussion Highlights]\n" + "\n---\n".join(comments))

    story["summary"] = "\n\n".join(full_content) if full_content else story.get("title", "")
    story["content_type"] = content_type
    story["has_full_content"] = bool(content)
    return story


def enhance_hn_articles_parallel(stories: list[dict], max_items: int = 30) -> list[dict]:
    """Enhance HN stories in parallel using a thread pool."""
    settings = get_settings()
    if not stories:
        return []

    tasks = [s for s in stories[:max_items]]
    enhanced: list[dict] = []

    logger.info(
        f"HN parallel enhance: {len(tasks)} stories, workers={settings.hn_enhance_max_workers}"
    )
    with ThreadPoolExecutor(max_workers=settings.hn_enhance_max_workers) as executor:
        futures = {executor.submit(_enhance_single_story, story): story for story in tasks}
        for future in as_completed(futures):
            try:
                enhanced_story = future.result()
                enhanced.append(enhanced_story)
            except Exception as e:
                s = futures[future]
                logger.error(f"Failed to enhance story '{s.get('title','')[:40]}...': {e}")

    return enhanced


def fetch_hn_stories(
    queries: list[str] = None,
    min_points: int = 100,
    days: int = 7,
    limit: int = 50,
    enhance: bool = True,
    max_enhance: int = 30,
) -> list[dict]:
    """
    Main entry point for fetching HN stories.

    Args:
        queries: List of search queries (default: HN_DEFAULT_QUERIES)
        min_points: Minimum points filter
        days: Look back period
        limit: Maximum stories to fetch
        enhance: Whether to fetch full content
        max_enhance: Maximum stories to enhance

    Returns:
        List of HN stories with optional full content
    """
    logger.info("Fetching HN stories...")
    stories = fetch_hn_top_stories(queries, min_points, days, limit)
    logger.info(f"Found {len(stories)} HN stories")

    if enhance and stories:
        logger.info("Enhancing HN articles with content (parallel)...")
        stories = enhance_hn_articles_parallel(stories, max_enhance)

    return stories
