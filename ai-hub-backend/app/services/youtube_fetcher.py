"""
YouTube video fetching service using YouTube Data API v3.
"""

import re
import logging
from datetime import datetime, timedelta, timezone
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


# Channel allowlist (2026-08-01 research-team refresh). Allowlist-primary
# fetching replaced the 20-generic-query search approach: per-channel
# playlistItems cost ~1 quota unit vs 100 per search call (~95% quota cut),
# and it stops off-topic channels that merely keyword-match "AI" from
# leaking into the feed. Handles are resolved to upload playlists at
# runtime via channels.list (cached per process).
CHANNEL_ALLOWLIST = [
    "aiexplained-official",      # AI Explained — benchmark-driven news analysis
    "mreflow",                   # Matt Wolfe — weekly AI news/tools roundups
    "AIDailyBrief",              # The AI Daily Brief — daily ~20min news show
    "Fireship",                  # Fireship — dev-oriented explainers
    "TwoMinutePapers",           # Two Minute Papers — research summaries
    "bycloudAI",                 # bycloud — technical research breakdowns
    "ColeMedin",                 # Cole Medin — production AI-agent tutorials
    "indydevdan",                # IndyDevDan — agentic coding workflows
    "WesRoth",                   # Wes Roth — near-daily news (hypey titles; LLM ranks)
    "matthew_berman",            # Matthew Berman — model testing/news
    "samwitteveenai",            # Sam Witteveen — hands-on LLM/agent tutorials
    "futurepedia_io",            # Futurepedia — beginner tool tutorials
    "MachineLearningStreetTalk", # MLST — technical interviews
    "3blue1brown",               # 3Blue1Brown — visual math/AI explainers
    "AndrejKarpathy",            # Karpathy — rare but landmark uploads
]

# Small discovery net alongside the allowlist — catches breakout videos from
# channels we do not follow yet. Two queries = 200 quota units/day.
DISCOVERY_QUERIES = [
    "AI news today",
    "AI breakthrough explained",
]

_UPLOADS_PLAYLIST_CACHE: dict[str, str] = {}


def _uploads_playlist_id(youtube, handle: str) -> str | None:
    """Resolve a channel handle to its uploads playlist ID (cached)."""
    if handle in _UPLOADS_PLAYLIST_CACHE:
        return _UPLOADS_PLAYLIST_CACHE[handle]
    try:
        resp = youtube.channels().list(
            forHandle=handle, part="contentDetails"
        ).execute()
        items = resp.get("items", [])
        if not items:
            logger.warning(f"YouTube channel not found for handle @{handle}")
            return None
        playlist_id = items[0]["contentDetails"]["relatedPlaylists"]["uploads"]
        _UPLOADS_PLAYLIST_CACHE[handle] = playlist_id
        return playlist_id
    except Exception as e:
        logger.warning(f"Failed to resolve @{handle}: {e}")
        return None


def fetch_youtube_videos(
    queries: list[str] = None,
    max_results: int = 10,
    days: int = 7,
    min_view_count: int = 10000,
    *, window_start=None, window_end=None,
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
        queries = DISCOVERY_QUERIES

    try:
        youtube = build("youtube", "v3", developerKey=settings.youtube_api_key)
    except Exception as e:
        logger.error(f"Failed to initialize YouTube client: {e}")
        return []

    published_after = (window_start or (datetime.utcnow() - timedelta(days=days))).isoformat() + "Z"
    all_videos = []
    seen_ids = set()

    curated_channel_ids = set()

    def process_video_ids(video_ids: list[str]) -> None:
        """Fetch details for IDs and append those passing quality filters."""
        fresh = [v for v in video_ids if v not in seen_ids]
        for i in range(0, len(fresh), 50):
            chunk = fresh[i:i + 50]
            try:
                videos_response = youtube.videos().list(
                    id=",".join(chunk),
                    part="snippet,contentDetails,statistics",
                ).execute()
            except Exception as e:
                logger.error(f"videos.list failed: {e}")
                continue

            for video in videos_response.get("items", []):
                video_id = video["id"]
                if video_id in seen_ids:
                    continue

                snippet = video["snippet"]
                content_details = video["contentDetails"]
                statistics = video.get("statistics", {})

                view_count = int(statistics.get("viewCount", 0))
                is_curated = snippet.get("channelId") in curated_channel_ids
                if view_count < (1000 if is_curated else min_view_count):
                    continue
                published = datetime.fromisoformat(snippet["publishedAt"].replace("Z", "+00:00")).astimezone(timezone.utc).replace(tzinfo=None)
                if (window_start and published < window_start) or (window_end and published >= window_end):
                    continue

                duration_seconds, duration_formatted = parse_duration(
                    content_details.get("duration", "PT0S")
                )
                # Skip very short videos (< 1 min) or very long ones (> 1 hour)
                if duration_seconds < 60 or duration_seconds > (10800 if is_curated else 3600):
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

    # --- Allowlist phase: latest uploads from curated channels (~2 quota
    # units per channel vs 100 per search query) ---
    allowlist_ids: list[str] = []
    for handle in CHANNEL_ALLOWLIST:
        playlist_id = _uploads_playlist_id(youtube, handle)
        if not playlist_id:
            continue
        curated_channel_ids.add("UC" + playlist_id[2:])
        try:
            resp = youtube.playlistItems().list(
                playlistId=playlist_id, part="contentDetails", maxResults=50
            ).execute()
            for item in resp.get("items", []):
                details = item.get("contentDetails", {})
                vid = details.get("videoId")
                published = details.get("videoPublishedAt", "")
                if vid and published and published >= published_after and (not window_end or published < window_end.isoformat() + "Z"):
                    allowlist_ids.append(vid)
        except HttpError as e:
            logger.warning(f"playlistItems failed for @{handle}: {e}")
        except Exception as e:
            logger.warning(f"Allowlist fetch error for @{handle}: {e}")
    logger.info(f"Allowlist channels yielded {len(allowlist_ids)} fresh videos")
    process_video_ids(allowlist_ids)

    # --- Discovery phase: small search net for breakout videos ---
    for query in queries:
        logger.info(f"Searching YouTube for: {query}")
        try:
            search_response = youtube.search().list(
                q=query,
                part="id,snippet",
                type="video",
                order="viewCount",
                publishedAfter=published_after,
                **({"publishedBefore": window_end.isoformat() + "Z"} if window_end else {}),
                maxResults=max_results,
                relevanceLanguage="en",
            ).execute()
            video_ids = [
                item["id"]["videoId"]
                for item in search_response.get("items", [])
                if item["id"]["videoId"] not in seen_ids
            ]
            process_video_ids(video_ids)
        except HttpError as e:
            logger.error(f"YouTube API error for query '{query}': {e}")
        except Exception as e:
            logger.error(f"Error searching YouTube for '{query}': {e}")

    # Sort by view count and deduplicate
    all_videos.sort(key=lambda x: (x.get("channel_id") not in curated_channel_ids, -x["view_count"], x["video_id"]))

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

    try:
        from requests import Session
        class CaptionSession(Session):
            def request(self, method, url, **kwargs):
                kwargs.setdefault("timeout", 15)
                return super().request(method, url, **kwargs)
        api = YouTubeTranscriptApi(http_client=CaptionSession())
        available = api.list(video_id)
        preferences = ["en", "en-US", "en-GB", "de", "zh-Hans", "zh", "fr", "es", "pt", "ja", "ko"]
        try:
            transcript = available.find_transcript(preferences)
        except Exception:
            transcript = next(iter(available))
        data = transcript.fetch()
        text = " ".join(item["text"] for item in data.to_raw_data())
        return text[:10000] or None
    except Exception as exc:
        # Captions can be disabled or blocked by the provider. No proxies or bypass.
        logger.info("Transcript unavailable for %s (%s)", video_id, type(exc).__name__)
        return None
