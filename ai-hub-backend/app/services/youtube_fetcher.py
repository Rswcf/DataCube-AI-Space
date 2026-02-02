"""
YouTube video fetching service using YouTube Data API v3.
"""

import re
import logging
from datetime import datetime, timedelta
from typing import Optional
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.config import get_settings

logger = logging.getLogger(__name__)


def parse_duration(duration: str) -> tuple[int, str]:
    """
    Parse ISO 8601 duration to seconds and formatted string.

    Args:
        duration: ISO 8601 duration like "PT12M34S"

    Returns:
        Tuple of (seconds, formatted_string like "12:34")
    """
    pattern = r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"
    match = re.match(pattern, duration)

    if not match:
        return 0, "0:00"

    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)

    total_seconds = hours * 3600 + minutes * 60 + seconds

    if hours > 0:
        formatted = f"{hours}:{minutes:02d}:{seconds:02d}"
    else:
        formatted = f"{minutes}:{seconds:02d}"

    return total_seconds, formatted


def format_view_count(count: int) -> str:
    """Format view count for display (e.g., '1.2M', '500K')."""
    if count >= 1_000_000:
        return f"{count / 1_000_000:.1f}M"
    elif count >= 1_000:
        return f"{count / 1_000:.1f}K"
    else:
        return str(count)


def fetch_youtube_videos(
    queries: list[str] = None,
    max_results: int = 10,
    days: int = 7,
    min_view_count: int = 10000,
) -> list[dict]:
    """
    Fetch AI-related YouTube videos using YouTube Data API v3.

    Args:
        queries: List of search queries (default: AI-related queries)
        max_results: Maximum videos per query
        days: Look back period
        min_view_count: Minimum view count filter

    Returns:
        List of video metadata dictionaries
    """
    settings = get_settings()

    if not settings.youtube_api_key:
        logger.warning("YouTube API key not configured")
        return []

    if queries is None:
        # Business-oriented queries for consultants and analytics teams
        queries = [
            # AI News (general)
            "AI news this week",
            "AI business news",

            # Major Tool Tutorials
            "ChatGPT tutorial",
            "ChatGPT for business",
            "Claude AI tutorial",
            "Gemini tutorial",
            "Perplexity AI tutorial",
            "NotebookLM tutorial",

            # Workplace Productivity (core category)
            "AI productivity tips",
            "AI tools for work",
            "best AI tools",
            "AI for Excel",
            "AI presentation",
            "AI automation workflow",
            "prompt engineering guide",

            # Image & Video (marketing use)
            "Midjourney tips",
            "AI image generation",
            "Sora tutorial",

            # Business & Strategy
            "AI in finance",
            "AI for consulting",
            "AI strategy business",
            "AI transformation",

            # German Content
            "KI News deutsch",
            "ChatGPT Tutorial deutsch",
            "KI Tools deutsch",
        ]

    try:
        youtube = build("youtube", "v3", developerKey=settings.youtube_api_key)
    except Exception as e:
        logger.error(f"Failed to initialize YouTube client: {e}")
        return []

    published_after = (datetime.utcnow() - timedelta(days=days)).isoformat() + "Z"
    all_videos = []
    seen_ids = set()

    for query in queries:
        logger.info(f"Searching YouTube for: {query}")

        try:
            search_response = youtube.search().list(
                q=query,
                part="id,snippet",
                type="video",
                order="viewCount",
                publishedAfter=published_after,
                maxResults=max_results,
                relevanceLanguage="en",
            ).execute()

            video_ids = [
                item["id"]["videoId"]
                for item in search_response.get("items", [])
                if item["id"]["videoId"] not in seen_ids
            ]

            if not video_ids:
                continue

            # Get video details (duration, view count, etc.)
            videos_response = youtube.videos().list(
                id=",".join(video_ids),
                part="snippet,contentDetails,statistics",
            ).execute()

            for video in videos_response.get("items", []):
                video_id = video["id"]

                if video_id in seen_ids:
                    continue

                snippet = video["snippet"]
                content_details = video["contentDetails"]
                statistics = video.get("statistics", {})

                view_count = int(statistics.get("viewCount", 0))

                # Filter by view count
                if view_count < min_view_count:
                    continue

                duration_seconds, duration_formatted = parse_duration(
                    content_details.get("duration", "PT0S")
                )

                # Skip very short videos (< 1 min) or very long ones (> 1 hour)
                if duration_seconds < 60 or duration_seconds > 3600:
                    continue

                seen_ids.add(video_id)
                all_videos.append({
                    "video_id": video_id,
                    "original_title": snippet.get("title", ""),
                    "description": snippet.get("description", "")[:500],
                    "channel_name": snippet.get("channelTitle", ""),
                    "channel_id": snippet.get("channelId", ""),
                    "thumbnail_url": snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                    "published_at": snippet.get("publishedAt", ""),
                    "duration_seconds": duration_seconds,
                    "duration_formatted": duration_formatted,
                    "view_count": view_count,
                    "view_count_formatted": format_view_count(view_count),
                    "like_count": int(statistics.get("likeCount", 0)),
                    "tags": snippet.get("tags", []),
                })

        except HttpError as e:
            logger.error(f"YouTube API error for query '{query}': {e}")
        except Exception as e:
            logger.error(f"Error searching YouTube for '{query}': {e}")

    # Sort by view count and deduplicate
    all_videos.sort(key=lambda x: x["view_count"], reverse=True)

    logger.info(f"Found {len(all_videos)} YouTube videos total")
    return all_videos


def fetch_video_transcript(video_id: str) -> Optional[str]:
    """
    Fetch transcript for a YouTube video.

    Args:
        video_id: YouTube video ID

    Returns:
        Transcript text or None
    """
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except ImportError:
        logger.warning("youtube-transcript-api not installed")
        return None

    # Try different language combinations
    language_preferences = [
        ['en', 'de'],  # English or German manual
        ['en-US', 'en-GB'],  # English variants
        ['de-DE', 'de-AT'],  # German variants
    ]

    for languages in language_preferences:
        try:
            # Use the new API: get_transcript directly
            transcript_entries = YouTubeTranscriptApi.get_transcript(video_id, languages=languages)
            text = " ".join(entry["text"] for entry in transcript_entries)
            logger.debug(f"Got transcript for {video_id} ({len(text)} chars)")
            return text[:10000]  # Limit length
        except Exception:
            continue

    # Try to get any available transcript (auto-generated included)
    try:
        transcript_entries = YouTubeTranscriptApi.get_transcript(video_id)
        text = " ".join(entry["text"] for entry in transcript_entries)
        logger.debug(f"Got auto transcript for {video_id} ({len(text)} chars)")
        return text[:10000]
    except Exception as e:
        logger.debug(f"No transcript available for {video_id}: {e}")
        return None
