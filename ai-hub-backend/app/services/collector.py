"""
Main data collection orchestrator with two-stage processing and parallel LLM calls.
"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

import yaml
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import (
    Week, TechPost, Video, PrimaryMarketPost, SecondaryMarketPost, MAPost,
    TipPost, Trend, TeamMember, RawArticle, RawVideo,
)
from app.services.period_utils import (
    is_daily_id, current_day_id, ensure_period,
)
from app.services.rss_fetcher import fetch_rss_feeds_parallel
from app.services.hn_fetcher import fetch_hn_stories
from app.services.youtube_fetcher import fetch_youtube_videos, fetch_video_transcript
from app.services.llm_processor import LLMProcessor

logger = logging.getLogger(__name__)


def _nn(value, default=""):
    """Coalesce None/missing to default for NOT NULL DB columns.

    `.get("x", default)` only returns `default` when the key is missing.
    LLM JSON often contains `{"x": null}` (key present, value null), which
    then maps to None and violates NOT NULL on commit, aborting the whole
    stage4 transaction. Use this helper at every save site that writes a
    NOT NULL column sourced from LLM JSON.
    """
    return value if value is not None else default


def _source_author(item: dict) -> dict:
    """Honest attribution for an aggregated item: its real source.

    Replaces the fake-social scaffold (invented @handles, verified badges,
    zeroed engagement metrics) inherited from the internal-tool era.
    """
    name = item.get("source") or item.get("platform")
    if not name:
        url = item.get("sourceUrl") or item.get("source_url") or ""
        try:
            from urllib.parse import urlparse

            host = urlparse(str(url)).netloc
            name = host.removeprefix("www.") if host else ""
        except (ValueError, AttributeError):
            name = ""
    name = str(name) if name else "DataCube AI"
    words = [w for w in name.replace(".", " ").split() if w]
    initials = "".join(w[0] for w in words[:2]).upper() or "AI"
    return {"name": name, "handle": "", "avatar": initials, "verified": False}


# Maps Stage 3.5 DB field names back to the LLM/prompt field names used by
# the stage-4 save sites (only M&A differs).
_TRANSLATION_REVERSE_MAPS = {"ma": {"deal_value": "dealValue", "deal_type": "dealType"}}


def _mirror_de_from_translations(results: dict) -> None:
    """Build the DE arrays from EN items + Stage 3.5 German translations.

    EN is the only natively generated language since 2026-08 (the site
    generalized from a DACH-internal tool to a global audience). German is
    translated in Stage 3.5 like the other languages, then mirrored here into
    full DE item dicts so the existing `_de`-column save sites keep working
    unchanged. The 'de' key is removed from `_translations` afterwards —
    native columns own German, the JSONB column owns the other six languages.
    Items whose DE translation failed keep their EN values (same graceful
    degradation the JSONB languages already have via `get_field`).
    """

    def build(section: str, en_items: list) -> list:
        reverse = _TRANSLATION_REVERSE_MAPS.get(section, {})
        de_items = []
        for item in en_items:
            if not isinstance(item, dict):
                continue
            de_item = {k: v for k, v in item.items() if k != "_translations"}
            translations = item.get("_translations")
            de_fields = translations.pop("de", None) if isinstance(translations, dict) else None
            if de_fields:
                for db_name, value in de_fields.items():
                    de_item[reverse.get(db_name, db_name)] = value
            de_items.append(de_item)
        return de_items

    tech = results.get("tech")
    if isinstance(tech, dict):
        tech["de"] = build("tech", tech.get("en", []))
    videos = results.get("videos")
    if isinstance(videos, dict):
        videos["de"] = build("video", videos.get("en", []))
    tips = results.get("tips")
    if isinstance(tips, dict):
        tips["de"] = build("tip", tips.get("en", []))
    inv = results.get("investment")
    if isinstance(inv, dict):
        for key, section in (
            ("primaryMarket", "primary_market"),
            ("secondaryMarket", "secondary_market"),
            ("ma", "ma"),
        ):
            sub = inv.get(key)
            if isinstance(sub, dict):
                sub["de"] = build(section, sub.get("en", []))
    trends = results.get("trends")
    if isinstance(trends, dict) and isinstance(trends.get("trends"), dict):
        trends["trends"]["de"] = build("trend", trends["trends"].get("en", []))


def _pair_de_en(de_items: list, en_items: list, section: str) -> list:
    """Pair DE+EN items, padding with {} on length mismatch.

    The original `zip(de, en)` silently truncates to the shorter list,
    which dropped real records when the LLM returned (say) 8 DE but 5 EN.
    Now we pad with empty dicts so every record gets at least one
    language saved (downstream `_nn()` coalesces empties), and we log a
    loud warning so the mismatch surfaces in Railway logs.
    """
    de = de_items or []
    en = en_items or []
    if len(de) != len(en):
        logger.warning(
            "Stage4 %s: DE/EN length mismatch (de=%d, en=%d) — padding shorter side with {}",
            section, len(de), len(en),
        )
    n = max(len(de), len(en))
    paired = []
    for i in range(n):
        d = de[i] if i < len(de) else {}
        e = en[i] if i < len(en) else {}
        paired.append((d if isinstance(d, dict) else {}, e if isinstance(e, dict) else {}))
    return paired


# ---------------------------------------------------------------------------
# Persistent collection status tracking (DB-backed, survives restarts)
# ---------------------------------------------------------------------------


def set_collection_status(
    period_id: str,
    status: str,
    stage: str = "",
    counts: dict | None = None,
    raw_counts: dict | None = None,
    error: str | None = None,
):
    """Update the persistent collection status for a period."""
    from app.database import get_session_local
    from app.models.collection_run import CollectionRun
    from datetime import datetime

    db = get_session_local()()
    try:
        run = db.query(CollectionRun).filter(CollectionRun.period_id == period_id).first()
        if not run:
            run = CollectionRun(
                period_id=period_id,
                status=status,
                started_at=datetime.utcnow(),
            )
            db.add(run)
        else:
            # Fresh transition to running = fresh run: clear leftover error +
            # completed_at from prior attempt, refresh started_at. Otherwise
            # the status endpoint shows misleading stale failure details
            # while a new run is in progress.
            #
            # We also reset started_at when the *current* row is `running`
            # but stale (older than the fresh-run reentry window). That
            # row belongs to a crashed previous worker (zombie); keeping
            # its started_at would make our fresh-run reentry guard
            # _is_collection_running() see the new run as a stale zombie
            # and refuse the second trigger of the day.
            now = datetime.utcnow()
            if status == "running":
                if run.status != "running":
                    run.error = None
                    run.completed_at = None
                    run.started_at = now
                elif run.started_at and (now - run.started_at).total_seconds() > _FRESH_RUNNING_SECONDS:
                    # Reclaiming a stale 'running' row from a crashed worker.
                    run.error = None
                    run.completed_at = None
                    run.started_at = now
        run.status = status
        if stage:
            run.stage = stage
        if counts is not None:
            run.counts = counts
        if raw_counts is not None:
            run.raw_counts = raw_counts
        if error is not None:
            run.error = error[:500] if error else None
        elif status in ("completed", "empty"):
            # Explicit success/empty: clear any leftover error text.
            run.error = None
        if status in ("completed", "failed", "empty"):
            run.completed_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        logger.warning(f"Failed to persist collection status for {period_id}: {e}")
        db.rollback()
    finally:
        db.close()


# A run that has been "running" longer than this is treated as a zombie:
# whichever process owned it has crashed without updating status, and the
# next workflow trigger should be allowed to proceed instead of seeing
# `running` and skipping the period.
_ZOMBIE_RUNNING_SECONDS = 90 * 60  # 90 minutes


def get_collection_status(period_id: str) -> dict | None:
    """Return the current collection status for a period, or None if unknown.

    Zombie detection: if `status == 'running'` but `started_at` is older
    than _ZOMBIE_RUNNING_SECONDS, the row is reported as `failed` with a
    'zombie' marker. Without this, a backend crash mid-collection leaves
    the period stuck in `running` forever, and the daily-collect workflow
    sees the stale state and skips the trigger — meaning that day stays
    blank until manually unblocked.
    """
    from app.database import get_session_local
    from app.models.collection_run import CollectionRun

    db = get_session_local()()
    try:
        run = db.query(CollectionRun).filter(CollectionRun.period_id == period_id).first()
        if not run:
            return None
        status = run.status
        zombie = False
        if status == "running" and run.started_at:
            age = (datetime.utcnow() - run.started_at).total_seconds()
            if age > _ZOMBIE_RUNNING_SECONDS:
                status = "failed"
                zombie = True
        result: dict = {"status": status}
        if zombie:
            result["zombie"] = True
            result["error"] = (
                f"Stuck in 'running' for >{_ZOMBIE_RUNNING_SECONDS // 60} min — "
                "treating as failed so workflow can retrigger."
            )
        if run.stage:
            result["stage"] = run.stage
        if run.counts:
            result["counts"] = run.counts
        if run.raw_counts:
            result["raw_counts"] = run.raw_counts
        if run.error and not zombie:
            result["error"] = run.error
        if run.started_at:
            result["started_at"] = run.started_at.isoformat()
        if run.completed_at:
            result["completed_at"] = run.completed_at.isoformat()
        return result
    except Exception as e:
        logger.warning(f"Failed to read collection status for {period_id}: {e}")
        return None
    finally:
        db.close()


def get_week_boundaries(week_id: str) -> tuple[datetime, datetime]:
    """
    Return the start and end datetime for a given period.

    For daily periods, returns UTC boundaries that cover the full Berlin-time
    day plus a 6-hour buffer before midnight to account for timezone differences
    in article publish dates.  The collection runs at ~22:00 UTC (23:00 Berlin),
    so articles from the previous ~30 hours should be eligible.

    Args:
        week_id: Period ID — '2026-kw06' (weekly) or '2026-03-04' (daily)

    Returns:
        Tuple of (start, end) as naive UTC datetimes where start is inclusive
        and end is exclusive.
    """
    if is_daily_id(week_id):
        settings = get_settings()
        tz = ZoneInfo(settings.app_timezone)  # Europe/Berlin

        # Build Berlin-time midnight for the target day
        day = datetime.strptime(week_id, "%Y-%m-%d")
        berlin_midnight = day.replace(tzinfo=tz)

        # Convert to UTC so we compare apples-to-apples after
        # parse_article_date normalises everything to UTC.
        utc_start = berlin_midnight.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)
        utc_end = (berlin_midnight + timedelta(days=1)).astimezone(ZoneInfo("UTC")).replace(tzinfo=None)

        # Widen the window by 6 hours before start to catch articles whose
        # timezone was stripped (e.g. +02:00 → naive looks 2 h earlier) and
        # articles published late the previous UTC day that belong to today
        # in Berlin.
        utc_start -= timedelta(hours=6)

        return utc_start, utc_end

    parts = week_id.split("-kw")
    year = int(parts[0])
    week_num = int(parts[1])

    # ISO week: Jan 4 is always in week 1
    jan4 = datetime(year, 1, 4)
    start = jan4 + timedelta(weeks=week_num - 1, days=-jan4.weekday())
    end = start + timedelta(days=7)  # Next Monday 00:00

    return start, end


def parse_article_date(date_str: Optional[str]) -> Optional[datetime]:
    """
    Parse article published date from various formats.

    Timezone-aware dates are converted to UTC before stripping tzinfo so that
    the resulting naive datetime is always in UTC.  This ensures correct
    comparison against the UTC-based boundaries from ``get_week_boundaries``.

    Args:
        date_str: Date string in various formats (RSS, ISO, etc.)

    Returns:
        Naive UTC datetime or None if parsing fails.
    """
    if not date_str:
        return None

    from dateutil import parser as dateutil_parser

    try:
        dt = dateutil_parser.parse(date_str)
        if dt.tzinfo:
            # Convert to UTC, then drop tzinfo for naive comparison
            dt = dt.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)
        return dt
    except (ValueError, TypeError):
        pass

    return None


def is_article_in_week(article: dict, week_start: datetime, week_end: datetime) -> bool:
    """
    Check if an article belongs to the target week.

    Uses lenient matching: articles without parseable dates are included.

    Args:
        article: Article dict with 'published' field
        week_start: Start of target week (Monday 00:00)
        week_end: End of target week (next Monday 00:00, exclusive)

    Returns:
        True if article should be included in this week
    """
    pub_date = parse_article_date(article.get("published"))

    if pub_date:
        # Has parseable date: strict week boundary check
        return week_start <= pub_date < week_end
    else:
        # No parseable date: lenient - include article
        return True


def load_sources() -> dict:
    """Load RSS sources from YAML config (if available)."""
    # Default sources if no config file
    default_sources = {
        "tech": [
            {"url": "https://hnrss.org/newest?q=AI&points=50", "name": "Hacker News", "enhanced": True},
            {"url": "https://huggingface.co/blog/feed.xml", "name": "Hugging Face Blog"},
            {"url": "https://www.technologyreview.com/topic/artificial-intelligence/feed", "name": "MIT Technology Review"},
            {"url": "https://the-decoder.com/feed/", "name": "The Decoder"},
        ],
        "investment": [
            {"url": "https://techcrunch.com/tag/funding/feed/", "name": "TechCrunch Funding"},
            {"url": "https://news.crunchbase.com/feed/", "name": "Crunchbase News"},
            {"url": "https://www.techmeme.com/feed.xml", "name": "Techmeme"},
            # New investment sources
            {"url": "https://sifted.eu/feed", "name": "Sifted"},
            {"url": "https://www.pehub.com/feed/", "name": "PEHub"},
            {"url": "https://nvca.org/feed/", "name": "NVCA"},
            {"url": "https://venturebeat.com/feed/", "name": "VentureBeat"},
            # Chinese investment source
            {"url": "https://36kr.com/feed", "name": "36Kr", "lang": "zh"},
            # Phase 2: Additional sources
            {"url": "https://tech.eu/feed", "name": "Tech.eu"},
            {"url": "https://technode.com/feed/", "name": "TechNode"},
            {"url": "https://pandaily.com/feed/", "name": "Pandaily"},
        ],
        "ma": [
            # Mergers & Acquisitions specific sources
            {"url": "https://techcrunch.com/tag/mergers-and-acquisitions/feed/", "name": "TechCrunch M&A"},
            {"url": "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K&output=atom", "name": "SEC EDGAR 8-K"},
            {"url": "https://www.ft.com/mergers-acquisitions?format=rss", "name": "FT M&A"},
            {"url": "https://finance.yahoo.com/rss/topstories", "name": "Yahoo Finance"},
            {"url": "https://www.globenewswire.com/RssFeed/subjectcode/15-Mergers%20and%20Acquisitions/feedTitle/GlobeNewswire%20-%20Mergers%20and%20Acquisitions", "name": "GlobeNewswire M&A"},
            {"url": "https://www.prnewswire.com/rss/news-releases-list.rss", "name": "PR Newswire"},
            {"url": "https://news.google.com/rss/search?q=mergers+acquisitions+AI&hl=en-US", "name": "Google News M&A"},
        ],
        "tips": [
            # Blogs (business-oriented)
            {"url": "https://simonwillison.net/atom/everything/", "name": "Simon Willison"},
            {"url": "https://www.oneusefulthing.org/feed", "name": "One Useful Thing (Ethan Mollick)"},

            # Reddit - LLM & Chat Tools
            {"url": "https://www.reddit.com/r/ChatGPT/top/.rss?t=day", "name": "Reddit r/ChatGPT"},
            {"url": "https://www.reddit.com/r/ClaudeAI/top/.rss?t=day", "name": "Reddit r/ClaudeAI"},
            {"url": "https://www.reddit.com/r/OpenAI/top/.rss?t=day", "name": "Reddit r/OpenAI"},
            {"url": "https://www.reddit.com/r/PromptEngineering/top/.rss?t=day", "name": "Reddit r/PromptEngineering"},

            # Reddit - Image Generation (marketing use)
            {"url": "https://www.reddit.com/r/midjourney/top/.rss?t=day", "name": "Reddit r/Midjourney"},

            # Reddit - AI Search & Research Tools
            {"url": "https://www.reddit.com/r/perplexity_ai/top/.rss?t=day", "name": "Reddit r/perplexity_ai"},
            {"url": "https://www.reddit.com/r/NotebookLM/top/.rss?t=day", "name": "Reddit r/NotebookLM"},

            # Reddit - General AI Discussion
            {"url": "https://www.reddit.com/r/artificial/top/.rss?t=day", "name": "Reddit r/artificial"},
            {"url": "https://www.reddit.com/r/singularity/top/.rss?t=day", "name": "Reddit r/singularity"},

            # Reddit - Video/Audio Generation (content creation)
            {"url": "https://www.reddit.com/r/aivideo/top/.rss?t=day", "name": "Reddit r/aivideo"},
            {"url": "https://www.reddit.com/r/ElevenLabs/top/.rss?t=day", "name": "Reddit r/ElevenLabs"},

            # Reddit - Pro Users
            {"url": "https://www.reddit.com/r/ChatGPTPro/top/.rss?t=day", "name": "Reddit r/ChatGPTPro"},
        ],
    }

    try:
        import os
        sources_path = os.path.join(os.path.dirname(__file__), "..", "..", "sources.yaml")
        if os.path.exists(sources_path):
            with open(sources_path, "r") as f:
                return yaml.safe_load(f)
    except Exception as e:
        logger.warning(f"Could not load sources.yaml: {e}")

    return default_sources


def ensure_week(db: Session, week_id: str) -> Week:
    """Ensure week exists in database, create if not."""
    return ensure_period(db, week_id, is_current=True)


def clear_week_data(db: Session, week_id: str):
    """Clear existing processed data for a week. Does NOT commit — caller must commit."""
    db.query(TechPost).filter(TechPost.week_id == week_id).delete()
    db.query(Video).filter(Video.week_id == week_id).delete()
    db.query(PrimaryMarketPost).filter(PrimaryMarketPost.week_id == week_id).delete()
    db.query(SecondaryMarketPost).filter(SecondaryMarketPost.week_id == week_id).delete()
    db.query(MAPost).filter(MAPost.week_id == week_id).delete()
    db.query(TipPost).filter(TipPost.week_id == week_id).delete()
    db.query(Trend).filter(Trend.week_id == week_id).delete()
    logger.info(f"Cleared existing data for {week_id} (uncommitted)")


def clear_raw_data(db: Session, week_id: str):
    """Clear raw data for a week."""
    db.query(RawArticle).filter(RawArticle.week_id == week_id).delete()
    db.query(RawVideo).filter(RawVideo.week_id == week_id).delete()
    db.commit()
    logger.info(f"Cleared raw data for {week_id}")


def delete_period(db: Session, period_id: str) -> dict:
    """
    Delete a period (week or day) and all its associated data.

    For weekly IDs, also deletes child day records first (FK safety).

    Args:
        db: Database session
        period_id: Period ID (e.g. '2026-kw05' or '2026-02-07')

    Returns:
        dict with deleted period info

    Raises:
        ValueError: If period does not exist
    """
    week = db.query(Week).filter(Week.id == period_id).first()
    if not week:
        raise ValueError(f"Period '{period_id}' not found")

    deleted_children = []

    # If this is a week, find and delete child days first (FK constraint)
    if not is_daily_id(period_id):
        children = db.query(Week).filter(Week.parent_week_id == period_id).all()
        for child in children:
            # Clear content data for each child day
            clear_week_data(db, child.id)
            clear_raw_data(db, child.id)
            deleted_children.append(child.id)
            db.delete(child)
        db.commit()

    # Clear content data for the period itself
    clear_week_data(db, period_id)
    clear_raw_data(db, period_id)

    # Delete the Week row
    db.delete(week)
    db.commit()

    logger.info(f"Deleted period {period_id} and {len(deleted_children)} children")

    return {
        "deleted": period_id,
        "children_deleted": deleted_children,
    }


def intersperse_videos(posts: list, videos: list, interval: int = 5, start: int = 3) -> list:
    """
    Intersperse video posts among regular posts.

    Args:
        posts: List of regular tech posts
        videos: List of video posts
        interval: Insert video every N posts
        start: First video position

    Returns:
        Combined list with videos interspersed
    """
    result = []
    video_idx = 0
    post_idx = 0

    for i in range(len(posts) + len(videos)):
        # Check if we should insert a video at this position
        if video_idx < len(videos) and (i == start - 1 or (i > start - 1 and (i - start + 1) % interval == 0)):
            result.append(videos[video_idx])
            video_idx += 1
        elif post_idx < len(posts):
            result.append(posts[post_idx])
            post_idx += 1
        elif video_idx < len(videos):
            result.append(videos[video_idx])
            video_idx += 1

    return result


def stage1_fetch_and_store(db: Session, week_id: str) -> dict:
    """
    Stage 1: Fetch all content from sources and store raw data.

    Articles are filtered to only include those published within the target week's
    ISO boundaries. Articles without parseable dates are included (lenient matching).

    Args:
        db: Database session
        week_id: Week ID

    Returns:
        dict with counts of fetched items
    """
    settings = get_settings()

    logger.info("=== Stage 1: Fetching & Storing Raw Data ===")

    # Get week boundaries for filtering
    week_start, week_end = get_week_boundaries(week_id)
    logger.info(f"Week boundaries: {week_start.strftime('%Y-%m-%d')} to {week_end.strftime('%Y-%m-%d')} (exclusive)")

    # Ensure week exists and clear old raw data
    ensure_week(db, week_id)
    clear_raw_data(db, week_id)

    # Load sources
    sources = load_sources()

    # Fetch HN with enhancement (uses default HN_DEFAULT_QUERIES for comprehensive coverage)
    # BUG-H2: Wrap external fetchers in try/except with partial fallbacks
    hn_articles: list[dict] = []
    rss_articles: list[dict] = []
    youtube_videos: list[dict] = []

    def _fetch_hn():
        try:
            logger.info("Fetching Hacker News stories (parallel)...")
            items = fetch_hn_stories(
                min_points=settings.hn_min_points,
                days=settings.hn_days,
                limit=settings.hn_limit,
                enhance=True,
                max_enhance=30,
            )
            for article in items:
                article["original_section"] = "tech"
            return items
        except Exception as e:
            logger.error(f"Failed to fetch HN stories: {e}")
            return []

    def _fetch_rss():
        try:
            # Exclude HN since we use enhanced version
            logger.info("Fetching RSS feeds (parallel)...")
            return fetch_rss_feeds_parallel(sources, exclude_names={"Hacker News"})
        except Exception as e:
            logger.error(f"Failed to fetch RSS feeds: {e}")
            return []

    def _fetch_youtube():
        try:
            logger.info("Fetching YouTube videos...")
            return fetch_youtube_videos(
                max_results=settings.youtube_max_results,
                days=settings.hn_days,
            )
        except Exception as e:
            logger.error(f"Failed to fetch YouTube videos: {e}")
            return []

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(_fetch_hn): "hn",
            executor.submit(_fetch_rss): "rss",
            executor.submit(_fetch_youtube): "yt",
        }
        for future in as_completed(futures):
            tag = futures[future]
            try:
                data = future.result()
            except Exception as e:
                logger.error(f"Stage 1 subtask {tag} failed: {e}")
                data = []
            if tag == "hn":
                hn_articles = data
            elif tag == "rss":
                rss_articles = data
            else:
                youtube_videos = data

    # Fetch transcripts for top videos
    # BUG-H1: Add video_id existence check before accessing
    logger.info("Fetching video transcripts...")
    for video in youtube_videos[:15]:
        video_id = video.get("video_id")
        if not video_id:
            logger.warning(f"Video missing video_id, skipping transcript fetch: {video.get('original_title', 'Unknown')}")
            continue
        try:
            transcript = fetch_video_transcript(video_id)
            video["transcript"] = transcript
        except Exception as e:
            logger.warning(f"Failed to fetch transcript for video {video_id}: {e}")
            video["transcript"] = None

    # Filter articles by week boundary
    all_articles_raw = hn_articles + rss_articles
    all_articles = [a for a in all_articles_raw if is_article_in_week(a, week_start, week_end)]
    filtered_count = len(all_articles_raw) - len(all_articles)
    if filtered_count > 0:
        logger.info(f"Filtered out {filtered_count} articles outside week boundary")
    logger.info(f"Total articles after filtering: {len(all_articles)}, YouTube videos: {len(youtube_videos)}")

    # Store raw articles
    for article in all_articles:
        raw_article = RawArticle(
            week_id=week_id,
            source=article.get("source", "Unknown"),
            title=article.get("title", ""),
            link=article.get("link", ""),
            summary=article.get("summary", ""),
            published=article.get("published", ""),
            original_section=article.get("original_section", "tech"),
            raw_data={
                "points": article.get("points"),
                "comments": article.get("comments"),
                "hn_url": article.get("hn_url"),
            },
        )
        db.add(raw_article)

    # Store raw videos
    for video in youtube_videos:
        raw_video = RawVideo(
            week_id=week_id,
            video_id=video.get("video_id", ""),
            title=video.get("original_title", ""),
            channel_name=video.get("channel_name", ""),
            channel_id=video.get("channel_id"),
            description=video.get("description"),
            transcript=video.get("transcript"),
            thumbnail_url=video.get("thumbnail_url"),
            published_at=video.get("published_at"),
            duration_seconds=video.get("duration_seconds"),
            duration_formatted=video.get("duration_formatted"),
            view_count=video.get("view_count"),
            like_count=video.get("like_count"),
            raw_data=video,  # Store full original data
        )
        db.add(raw_video)

    db.commit()
    logger.info(f"Stored {len(all_articles)} raw articles and {len(youtube_videos)} raw videos")

    return {
        "articles": len(all_articles),
        "videos": len(youtube_videos),
    }


def stage2_classify_articles(db: Session, week_id: str, processor: LLMProcessor) -> None:
    """
    Stage 2: Classify articles using LLM (skip tips sources).

    Tips sources (Reddit, Simon Willison) are inherently tips content,
    so they skip LLM classification and use original_section directly.

    Args:
        db: Database session
        week_id: Week ID
        processor: LLM processor instance
    """
    logger.info("=== Stage 2: LLM Classification ===")

    # Load raw articles
    raw_articles = db.query(RawArticle).filter(RawArticle.week_id == week_id).all()

    if not raw_articles:
        logger.warning("No raw articles found for classification")
        return

    # Separate tips articles from articles that need classification
    tips_articles = []
    articles_to_classify = []

    for a in raw_articles:
        if a.original_section == "tips":
            # Tips sources skip classification - use original_section directly
            a.section = "tips"
            a.relevance = 0.8  # Default high relevance for tips sources
            tips_articles.append(a)
        else:
            articles_to_classify.append(a)

    logger.info(f"Tips articles (skip classification): {len(tips_articles)}")
    logger.info(f"Articles to classify: {len(articles_to_classify)}")

    # Only classify non-tips articles
    if articles_to_classify:
        articles_for_llm = [
            {
                "source": a.source,
                "title": a.title,
                "summary": a.summary,
                "link": a.link,
                "published": a.published,
                "original_section": a.original_section,
            }
            for a in articles_to_classify
        ]

        try:
            # Classify articles
            classified = processor.classify_articles(articles_for_llm)

            # Update database with classification results
            classification_map = {a["title"]: a for a in classified}

            for raw_article in articles_to_classify:
                classification = classification_map.get(raw_article.title)
                if classification:
                    raw_article.section = classification.get("section", raw_article.original_section)
                    raw_article.relevance = classification.get("relevance", 0.5)
        except Exception as e:
            logger.error(f"Classification failed, falling back to original_section hints: {e}")
            for raw_article in articles_to_classify:
                raw_article.section = raw_article.original_section or "tech"
                raw_article.relevance = 0.5

    db.commit()
    logger.info(f"Classification complete: {len(tips_articles)} tips preserved, "
                f"{len(articles_to_classify)} articles classified")


def stage3_parallel_processing(db: Session, week_id: str, processor: LLMProcessor) -> dict:
    """
    Stage 3: Process content in parallel using ThreadPoolExecutor.

    Args:
        db: Database session
        week_id: Week ID
        processor: LLM processor instance

    Returns:
        dict with processed data for each section
    """
    logger.info("=== Stage 3: Parallel LLM Processing ===")

    settings = get_settings()

    # Load classified articles
    raw_articles = db.query(RawArticle).filter(RawArticle.week_id == week_id).all()

    # Group by section
    tech_articles = [
        {
            "source": a.source,
            "title": a.title,
            "summary": a.summary,
            "link": a.link,
            "published": a.published,
        }
        for a in raw_articles if a.section == "tech"
    ]
    investment_articles = [
        {
            "source": a.source,
            "title": a.title,
            "summary": a.summary,
            "link": a.link,
            "published": a.published,
        }
        for a in raw_articles if a.section == "investment"
    ]
    tips_articles = [
        {
            "source": a.source,
            "title": a.title,
            "summary": a.summary,
            "link": a.link,
            "published": a.published,
        }
        for a in raw_articles if a.section == "tips"
    ]

    # Load raw videos
    raw_videos = db.query(RawVideo).filter(RawVideo.week_id == week_id).all()
    videos_for_llm = [v.raw_data for v in raw_videos if v.raw_data]

    logger.info(f"Processing: tech={len(tech_articles)}, investment={len(investment_articles)}, "
                f"tips={len(tips_articles)}, videos={len(videos_for_llm)}")

    results = {}

    # BUG-H3: Create per-thread LLMProcessor instances to avoid thread-safety issues
    # The OpenAI client may not be thread-safe, so each thread gets its own instance
    def process_tech():
        thread_processor = LLMProcessor()
        return thread_processor.process_tech_articles(tech_articles, count=settings.tech_output_count)

    def process_investment():
        thread_processor = LLMProcessor()
        return thread_processor.process_investment_articles(
            investment_articles,
            count=settings.investment_output_count,
        )

    def process_tips():
        thread_processor = LLMProcessor()
        return thread_processor.process_tips_articles(
            tips_articles,
            count=settings.tips_output_count,
        )

    def process_videos():
        thread_processor = LLMProcessor()
        return thread_processor.process_youtube_videos(videos_for_llm, count=settings.video_output_count)

    # Run in parallel with ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=settings.llm_max_workers) as executor:
        futures = {
            executor.submit(process_tech): "tech",
            executor.submit(process_investment): "investment",
            executor.submit(process_tips): "tips",
            executor.submit(process_videos): "videos",
        }

        for future in as_completed(futures):
            task_name = futures[future]
            try:
                results[task_name] = future.result()
                logger.info(f"Completed: {task_name}")
            except Exception as e:
                logger.error(f"Error processing {task_name}: {e}")
                # Provide fallback empty results
                if task_name == "investment":
                    results[task_name] = {
                        "primaryMarket": {"de": [], "en": []},
                        "secondaryMarket": {"de": [], "en": []},
                        "ma": {"de": [], "en": []},
                    }
                else:
                    results[task_name] = {"de": [], "en": []}

    # Generate trends (depends on tech and investment results)
    logger.info("Generating trends...")
    results["trends"] = processor.generate_trends(
        results.get("tech", {"de": [], "en": []}),
        results.get("investment", {})
    )

    return results


def _build_translation_tasks(results: dict) -> list:
    """Build list of (section_name, en_items, fields_to_translate, field_name_map).

    field_name_map converts LLM output keys (camelCase) to DB column names (snake_case).
    """
    tasks: list[tuple] = []

    # Tech
    en_tech = results.get("tech", {}).get("en", [])
    if en_tech:
        tasks.append(("tech", en_tech, ["content", "category", "tags"], {}))

    # Videos
    en_videos = results.get("videos", {}).get("en", [])
    if en_videos:
        tasks.append(("video", en_videos, ["title", "summary"], {}))

    # Tips
    en_tips = results.get("tips", {}).get("en", [])
    if en_tips:
        tasks.append(("tip", en_tips, ["content", "tip", "category", "difficulty"], {}))

    # Investment subcategories
    inv = results.get("investment", {})
    if isinstance(inv, dict):
        pm = inv.get("primaryMarket", {})
        en_pm = pm.get("en", []) if isinstance(pm, dict) else []
        if en_pm:
            tasks.append(("primary_market", en_pm, ["content", "amount", "valuation"], {}))

        sm = inv.get("secondaryMarket", {})
        en_sm = sm.get("en", []) if isinstance(sm, dict) else []
        if en_sm:
            tasks.append(("secondary_market", en_sm, ["content"], {}))

        ma = inv.get("ma", {})
        en_ma = ma.get("en", []) if isinstance(ma, dict) else []
        if en_ma:
            tasks.append(("ma", en_ma, ["content", "dealValue", "dealType"],
                         {"dealValue": "deal_value", "dealType": "deal_type"}))

    # Trends
    trends = results.get("trends", {})
    if isinstance(trends, dict):
        trends_section = trends.get("trends", {})
        en_trends = trends_section.get("en", []) if isinstance(trends_section, dict) else []
        if en_trends:
            tasks.append(("trend", en_trends, ["category", "title"], {}))

    return tasks


def stage3_5_translate_content(results: dict) -> dict:
    """
    Stage 3.5: Translate EN content to 6 additional languages using free models.

    Adds ``_translations`` dict to each EN item in the results. Format:
    ``{"zh": {"content": "...", ...}, "fr": {...}, ...}``

    Translation failures are gracefully skipped (field just won't exist).

    Args:
        results: The results dict from stage 3

    Returns:
        The same results dict, mutated with _translations on EN items
    """
    from app.services.i18n_utils import TRANSLATION_LANGUAGES

    logger.info("=== Stage 3.5: Translating Content to 6 Languages ===")

    translation_tasks = _build_translation_tasks(results)

    if not translation_tasks:
        logger.warning("No EN content found to translate")
        return results

    # Initialize _translations on every EN item
    for _, items, _, _ in translation_tasks:
        for item in items:
            if isinstance(item, dict):
                item.setdefault("_translations", {})

    total_items = sum(len(items) for _, items, _, _ in translation_tasks)
    logger.info(f"Translating {total_items} items across {len(translation_tasks)} sections "
                f"into {len(TRANSLATION_LANGUAGES)} languages")

    def do_translate(section_idx: int, target_lang: str):
        section_name, items, fields, name_map = translation_tasks[section_idx]
        thread_processor = LLMProcessor()
        translated = thread_processor.translate_batch(items, target_lang, fields)

        for i, item in enumerate(items):
            if i < len(translated) and translated[i] and isinstance(item, dict):
                mapped = {}
                for k, v in translated[i].items():
                    db_name = name_map.get(k, k)
                    mapped[db_name] = v
                item["_translations"][target_lang] = mapped

    # Run translations in parallel (3 workers to respect free model rate limits)
    work_units = [
        (si, lang)
        for si in range(len(translation_tasks))
        for lang in TRANSLATION_LANGUAGES
    ]

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {}
        for si, lang in work_units:
            future = executor.submit(do_translate, si, lang)
            futures[future] = f"{translation_tasks[si][0]}→{lang}"

        for future in as_completed(futures):
            task_name = futures[future]
            try:
                future.result()
                logger.info(f"Translation done: {task_name}")
            except Exception as e:
                logger.warning(f"Translation failed (skipping): {task_name}: {e}")

    # EN is the only natively generated language — mirror the German
    # translations into full DE item arrays for the stage-4 save sites.
    _mirror_de_from_translations(results)

    logger.info("Stage 3.5 complete")
    return results


def _backfill_translations_to_db(db: Session, week_id: str, results: dict):
    """
    Update already-saved records with translations from Stage 3.5.

    Stage 3.5 mutates results in place, adding _translations dicts
    to each EN item. This function reads those and writes them to DB.
    """
    def _update_translations(model_cls, items_key, results_data):
        en_items = results_data.get(items_key, {}).get("en", [])
        if not en_items:
            return
        records = (
            db.query(model_cls)
            .filter(model_cls.week_id == week_id)
            .order_by(model_cls.id)
            .all()
        )
        for i, record in enumerate(records):
            if i < len(en_items):
                trans = en_items[i].get("_translations")
                if trans:
                    record.translations = trans

    _update_translations(TechPost, "tech", results)
    _update_translations(Video, "videos", results)
    _update_translations(TipPost, "tips", results)

    # Investment sub-sections
    inv = results.get("investment", {})
    if isinstance(inv, dict):
        pm_en = inv.get("primaryMarket", {}).get("en", [])
        if pm_en:
            records = db.query(PrimaryMarketPost).filter(
                PrimaryMarketPost.week_id == week_id
            ).order_by(PrimaryMarketPost.id).all()
            for i, record in enumerate(records):
                if i < len(pm_en) and pm_en[i].get("_translations"):
                    record.translations = pm_en[i]["_translations"]

        sm_en = inv.get("secondaryMarket", {}).get("en", [])
        if sm_en:
            records = db.query(SecondaryMarketPost).filter(
                SecondaryMarketPost.week_id == week_id
            ).order_by(SecondaryMarketPost.id).all()
            for i, record in enumerate(records):
                if i < len(sm_en) and sm_en[i].get("_translations"):
                    record.translations = sm_en[i]["_translations"]

        ma_en = inv.get("ma", {}).get("en", [])
        if ma_en:
            records = db.query(MAPost).filter(
                MAPost.week_id == week_id
            ).order_by(MAPost.id).all()
            for i, record in enumerate(records):
                if i < len(ma_en) and ma_en[i].get("_translations"):
                    record.translations = ma_en[i]["_translations"]

    # Trends
    trends = results.get("trends", {})
    if isinstance(trends, dict):
        trends_section = trends.get("trends", {})
        trends_en = trends_section.get("en", []) if isinstance(trends_section, dict) else []
        if trends_en:
            records = db.query(Trend).filter(
                Trend.week_id == week_id
            ).order_by(Trend.id).all()
            for i, record in enumerate(records):
                if i < len(trends_en) and trends_en[i].get("_translations"):
                    record.translations = trends_en[i]["_translations"]

    try:
        db.commit()
    except Exception as e:
        logger.warning(f"Failed to save translations for {week_id}: {e}")
        db.rollback()


def stage4_save_to_database(db: Session, week_id: str, results: dict, raw_videos: list) -> None:
    """
    Stage 4: Save processed data to database.

    Args:
        db: Database session
        week_id: Week ID
        results: Processed data from stage 3
        raw_videos: List of RawVideo objects for metadata lookup

    Raises:
        Exception: Re-raises any exception after rolling back the transaction
    """
    logger.info("=== Stage 4: Saving to Database ===")

    # --- Pre-save validation: reject empty results if raw data existed ---
    raw_article_count = db.query(RawArticle).filter(RawArticle.week_id == week_id).count()
    raw_video_count = db.query(RawVideo).filter(RawVideo.week_id == week_id).count()

    tech_count = len(results.get("tech", {}).get("de", []))
    tips_count = len(results.get("tips", {}).get("de", []))
    video_count = len(results.get("videos", {}).get("de", []))
    inv = results.get("investment", {})
    inv_count = (
        len(inv.get("primaryMarket", {}).get("de", []))
        + len(inv.get("secondaryMarket", {}).get("de", []))
        + len(inv.get("ma", {}).get("de", []))
    )
    total_output = tech_count + tips_count + video_count + inv_count

    if total_output == 0 and raw_article_count > 0:
        logger.error(
            f"VALIDATION FAILED: {raw_article_count} raw articles but 0 processed output. "
            f"Refusing to clear existing data for {week_id}."
        )
        set_collection_status(
            week_id, "empty",
            stage="stage4_validation",
            raw_counts={"articles": raw_article_count, "videos": raw_video_count},
        )
        return  # Do NOT clear or save — preserve existing data

    # Clear existing processed data (same transaction as inserts)
    clear_week_data(db, week_id)

    tech_data = results.get("tech", {"de": [], "en": []})
    video_data = results.get("videos", {"de": [], "en": []})
    investment_data = results.get("investment", {})
    tips_data = results.get("tips", {"de": [], "en": []})
    trends_data = results.get("trends", {"trends": {"de": [], "en": []}})

    # Build video lookup for metadata
    video_lookup = {v.video_id: v for v in raw_videos}

    # Save videos (skip duplicates due to global unique constraint on video_id)
    video_posts = []
    skipped_videos = 0
    logger.info(f"Saving {len(video_data.get('de', []))} video posts to database")
    for i, (de_v, en_v) in enumerate(_pair_de_en(video_data.get("de", []), video_data.get("en", []), "videos")):
        vid = de_v.get("video_id") or en_v.get("video_id")
        if not vid:
            continue

        # Check if video already exists (from another week)
        existing_video = db.query(Video).filter(Video.video_id == vid).first()
        if existing_video:
            skipped_videos += 1
            continue

        raw_video = video_lookup.get(vid)
        meta = raw_video.raw_data if raw_video else {}

        video = Video(
            week_id=week_id,
            video_id=vid,
            title_de=_nn(de_v.get("title"), ""),
            title_en=_nn(en_v.get("title"), ""),
            summary_de=_nn(de_v.get("summary"), ""),
            summary_en=_nn(en_v.get("summary"), ""),
            original_title=_nn(meta.get("original_title"), ""),
            channel_name=_nn(meta.get("channel_name"), ""),
            channel_id=meta.get("channel_id"),
            thumbnail_url=_nn(meta.get("thumbnail_url"), ""),
            published_at=_nn(meta.get("published_at"), ""),
            duration_seconds=_nn(meta.get("duration_seconds"), 0),
            duration_formatted=_nn(meta.get("duration_formatted"), "0:00"),
            view_count=_nn(meta.get("view_count"), 0),
            like_count=_nn(meta.get("like_count"), 0),
            transcript=raw_video.transcript if raw_video else None,
            category=de_v.get("category") or en_v.get("category"),
            translations=en_v.get("_translations") or None,
        )
        db.add(video)

        # Create video post for tech feed
        # Map video translations (summary→content) for TechPost
        video_trans = en_v.get("_translations")
        tech_video_trans = None
        if video_trans:
            tech_video_trans = {}
            for lang, fields in video_trans.items():
                tech_video_trans[lang] = {"content": fields.get("summary", "")}

        video_post = TechPost(
            week_id=week_id,
            content_de=_nn(de_v.get("summary"), ""),
            content_en=_nn(en_v.get("summary"), ""),
            category_de=_nn(de_v.get("category"), "Video"),
            category_en=_nn(en_v.get("category"), "Video"),
            author={"name": _nn(meta.get("channel_name"), "YouTube"), "handle": "", "avatar": "YT", "verified": False},
            tags_de=["Video", "YouTube"],
            tags_en=["Video", "YouTube"],
            icon_type="Zap",
            impact="medium",
            timestamp=(meta.get("published_at") or "")[:10],
            source=_nn(meta.get("channel_name"), "YouTube"),
            source_url=f"https://www.youtube.com/watch?v={vid}",
            metrics={"comments": 0, "retweets": 0, "likes": meta.get("like_count", 0), "views": meta.get("view_count_formatted", "0")},
            is_video=True,
            video_id=vid,
            video_duration=meta.get("duration_formatted"),
            video_view_count=meta.get("view_count_formatted"),
            video_thumbnail_url=meta.get("thumbnail_url"),
            translations=tech_video_trans,
        )
        video_posts.append(video_post)

    if skipped_videos > 0:
        logger.info(f"Skipped {skipped_videos} videos (already exist in other weeks)")
    logger.info(f"Created {len(video_posts)} video TechPost entries")

    # Save tech posts with interspersed videos
    regular_posts = []
    skipped_tech = 0
    for i, (de_p, en_p) in enumerate(_pair_de_en(tech_data.get("de", []), tech_data.get("en", []), "tech")):
        # Drop records where BOTH languages have empty content — these
        # are LLM hallucinations or pad-fill from _pair_de_en. Saving
        # them pollutes the feed with blank cards.
        if not (de_p.get("content") or en_p.get("content")):
            skipped_tech += 1
            continue
        post = TechPost(
            week_id=week_id,
            content_de=_nn(de_p.get("content"), ""),
            content_en=_nn(en_p.get("content"), ""),
            category_de=_nn(de_p.get("category"), ""),
            category_en=_nn(en_p.get("category"), ""),
            author=_source_author(en_p),
            tags_de=_nn(de_p.get("tags"), []),
            tags_en=_nn(en_p.get("tags"), []),
            icon_type=_nn(de_p.get("iconType"), "Brain"),
            impact=_nn(de_p.get("impact"), "medium"),
            timestamp=_nn(de_p.get("timestamp"), ""),
            source=_nn(de_p.get("source"), ""),
            source_url=de_p.get("sourceUrl"),
            metrics=_nn(de_p.get("metrics"), {}),
            is_video=False,
            translations=en_p.get("_translations") or None,
        )
        regular_posts.append(post)
    if skipped_tech:
        logger.warning(f"Stage4 tech: skipped {skipped_tech} record(s) with empty content")

    # Intersperse videos among regular posts
    all_tech_posts = intersperse_videos(regular_posts, video_posts)

    for i, post in enumerate(all_tech_posts):
        post.display_order = i
        db.add(post)

    # Save investment posts
    for category, model_class, de_key, en_key in [
        ("primaryMarket", PrimaryMarketPost, "de", "en"),
        ("secondaryMarket", SecondaryMarketPost, "de", "en"),
        ("ma", MAPost, "de", "en"),
    ]:
        cat_data = investment_data.get(category, {})
        # Handle case where LLM returned a list instead of dict
        if isinstance(cat_data, dict):
            de_posts = cat_data.get("de", [])
            en_posts = cat_data.get("en", [])
        else:
            logger.warning(f"Investment category {category} has unexpected format, skipping")
            de_posts = []
            en_posts = []

        skipped_inv = 0
        for de_p, en_p in _pair_de_en(de_posts, en_posts, f"investment.{category}"):
            if model_class == PrimaryMarketPost:
                # Drop records missing the only key identifier (company).
                # An empty-company funding row is just noise in the feed.
                if not (de_p.get("company") or en_p.get("company")):
                    skipped_inv += 1
                    continue
                # amount_de/en are nullable since migration 0011; API layer (investment.py)
                # normalizes NULL back to "N/A" for UI. LLM returns `null` for
                # undisclosed amounts (e.g. SEC EDGAR unregistered equity sales).
                post = PrimaryMarketPost(
                    week_id=week_id,
                    content_de=_nn(de_p.get("content"), ""),
                    content_en=_nn(en_p.get("content"), ""),
                    company=_nn(de_p.get("company") or en_p.get("company"), ""),
                    amount_de=de_p.get("amount"),
                    amount_en=en_p.get("amount"),
                    round=de_p.get("round") or en_p.get("round") or "Unknown",
                    round_category=de_p.get("roundCategory") or en_p.get("roundCategory"),
                    investors=_nn(de_p.get("investors"), []),
                    valuation_de=de_p.get("valuation"),
                    valuation_en=en_p.get("valuation"),
                    author=_source_author(en_p),
                    timestamp=_nn(de_p.get("timestamp"), ""),
                    source_url=de_p.get("sourceUrl"),
                    metrics=_nn(de_p.get("metrics"), {}),
                    translations=en_p.get("_translations") or None,
                )
            elif model_class == SecondaryMarketPost:
                # Drop secondary-market entries with no ticker — without a
                # ticker we can't fetch real-time data and the row is dead weight.
                if not (de_p.get("ticker") or en_p.get("ticker")):
                    skipped_inv += 1
                    continue
                # Note: price, change, marketCap are now fetched from real-time API
                # We only store ticker and content from LLM processing
                post = SecondaryMarketPost(
                    week_id=week_id,
                    content_de=_nn(de_p.get("content"), ""),
                    content_en=_nn(en_p.get("content"), ""),
                    ticker=_nn(de_p.get("ticker") or en_p.get("ticker"), ""),
                    price="",  # Fetched from real-time API
                    change="",  # Fetched from real-time API
                    direction="up",  # Determined by real-time API
                    market_cap_de=None,  # Fetched from real-time API
                    market_cap_en=None,  # Fetched from real-time API
                    author=_source_author(en_p),
                    timestamp=_nn(de_p.get("timestamp"), ""),
                    source_url=de_p.get("sourceUrl"),
                    metrics=_nn(de_p.get("metrics"), {}),
                    translations=en_p.get("_translations") or None,
                )
            else:  # MAPost
                # M&A needs at least an acquirer OR target. Empty for both
                # = LLM hallucination (often false-positives from off-topic feeds).
                if not (
                    de_p.get("acquirer") or en_p.get("acquirer")
                    or de_p.get("target") or en_p.get("target")
                ):
                    skipped_inv += 1
                    continue
                post = MAPost(
                    week_id=week_id,
                    content_de=_nn(de_p.get("content"), ""),
                    content_en=_nn(en_p.get("content"), ""),
                    acquirer=_nn(de_p.get("acquirer") or en_p.get("acquirer"), ""),
                    target=_nn(de_p.get("target") or en_p.get("target"), ""),
                    deal_value_de=de_p.get("dealValue"),
                    deal_value_en=en_p.get("dealValue"),
                    deal_type_de=_nn(de_p.get("dealType"), ""),
                    deal_type_en=_nn(en_p.get("dealType"), ""),
                    industry=de_p.get("industry") or en_p.get("industry"),
                    author=_source_author(en_p),
                    timestamp=_nn(de_p.get("timestamp"), ""),
                    source_url=de_p.get("sourceUrl"),
                    metrics=_nn(de_p.get("metrics"), {}),
                    translations=en_p.get("_translations") or None,
                )
            db.add(post)
        if skipped_inv:
            logger.warning(f"Stage4 investment.{category}: skipped {skipped_inv} record(s) missing key field")

    # Save tips
    skipped_tips = 0
    for de_p, en_p in _pair_de_en(tips_data.get("de", []), tips_data.get("en", []), "tips"):
        # Drop tips with no content AND no tip text — guarantees nothing-to-show
        if not (de_p.get("content") or en_p.get("content") or de_p.get("tip") or en_p.get("tip")):
            skipped_tips += 1
            continue
        post = TipPost(
            week_id=week_id,
            content_de=_nn(de_p.get("content"), ""),
            content_en=_nn(en_p.get("content"), ""),
            tip_de=_nn(de_p.get("tip"), ""),
            tip_en=_nn(en_p.get("tip"), ""),
            category_de=_nn(de_p.get("category"), ""),
            category_en=_nn(en_p.get("category"), ""),
            platform=_nn(de_p.get("platform"), "X"),
            difficulty_de=_nn(de_p.get("difficulty"), "Mittel"),
            difficulty_en=_nn(en_p.get("difficulty"), "Intermediate"),
            author=_source_author(en_p),
            timestamp=_nn(de_p.get("timestamp"), ""),
            source_url=de_p.get("sourceUrl"),
            metrics=_nn(de_p.get("metrics"), {}),
            translations=en_p.get("_translations") or None,
        )
        db.add(post)
    if skipped_tips:
        logger.warning(f"Stage4 tips: skipped {skipped_tips} empty record(s)")

    # Save trends
    trends_section = trends_data.get("trends", {})
    if isinstance(trends_section, dict):
        de_trends = trends_section.get("de", [])
        en_trends = trends_section.get("en", [])
    else:
        de_trends = []
        en_trends = []

    for de_t, en_t in _pair_de_en(de_trends, en_trends, "trends"):
        if not isinstance(de_t, dict) or not isinstance(en_t, dict):
            continue
        trend = Trend(
            week_id=week_id,
            category_de=_nn(de_t.get("category"), ""),
            category_en=_nn(en_t.get("category"), ""),
            title_de=_nn(de_t.get("title"), ""),
            title_en=_nn(en_t.get("title"), ""),
            posts=de_t.get("posts"),
            translations=en_t.get("_translations") or None,
        )
        db.add(trend)

    # Save/update team members
    existing_members = db.query(TeamMember).all()
    if not existing_members:
        team_section = trends_data.get("teamMembers", {})
        if isinstance(team_section, dict):
            de_members = team_section.get("de", [])
            en_members = team_section.get("en", [])
        else:
            de_members = []
            en_members = []

        for de_m, en_m in zip(de_members, en_members):
            member = TeamMember(
                name=de_m.get("name", ""),
                role_de=de_m.get("role", ""),
                role_en=en_m.get("role", ""),
                handle=de_m.get("handle", ""),
                avatar=de_m.get("avatar", ""),
            )
            db.add(member)

    # BUG-H4: Add transaction rollback handling
    try:
        db.commit()
        logger.info(f"Saved all processed data for {week_id} (atomic commit)")
    except Exception as e:
        logger.error(f"Failed to save data for {week_id}, rolling back: {e}")
        db.rollback()
        raise


def run_fetch_only(db: Session, week_id: Optional[str] = None) -> dict:
    """
    Run only Stage 1: Fetch and store raw data.

    Args:
        db: Database session
        week_id: Week ID or None for current week

    Returns:
        dict with fetch statistics
    """
    week_id = week_id or current_day_id()
    logger.info(f"Starting fetch-only for {week_id}")

    return stage1_fetch_and_store(db, week_id)


def run_process_only(db: Session, week_id: Optional[str] = None) -> dict:
    """
    Run Stages 2-4: Process raw data (requires raw data to exist).

    Args:
        db: Database session
        week_id: Week ID or None for current week

    Returns:
        dict with processing statistics
    """
    week_id = week_id or current_day_id()
    logger.info(f"Starting process-only for {week_id}")

    # Check if raw data exists
    raw_count = db.query(RawArticle).filter(RawArticle.week_id == week_id).count()
    if raw_count == 0:
        raise ValueError(f"No raw data found for {week_id}. Run fetch first.")

    processor = LLMProcessor()

    # Stage 2: Classification
    stage2_classify_articles(db, week_id, processor)

    # Stage 3: Parallel processing
    results = stage3_parallel_processing(db, week_id, processor)

    # Stage 3.5: Translate EN content to 6 additional languages
    stage3_5_translate_content(results)

    # Load raw videos for metadata
    raw_videos = db.query(RawVideo).filter(RawVideo.week_id == week_id).all()

    # Stage 4: Save to database
    stage4_save_to_database(db, week_id, results, raw_videos)

    return {
        "week_id": week_id,
        "tech_count": len(results.get("tech", {}).get("de", [])),
        "investment_categories": list(results.get("investment", {}).keys()),
        "tips_count": len(results.get("tips", {}).get("de", [])),
        "videos_count": len(results.get("videos", {}).get("de", [])),
    }


# Reject re-entry from a duplicate trigger that fires while a fresh run
# is still in progress. Anything older than the zombie window is treated
# as crashed and reclaimable (handled by get_collection_status).
_FRESH_RUNNING_SECONDS = 5 * 60  # 5 minutes


def _is_collection_running(period_id: str) -> bool:
    """Return True iff there is a fresh `running` row for this period.

    Used as a lightweight per-period reentry lock: prevents the dual-cron
    slots (21:07 + 22:07 UTC) and a manual workflow_dispatch from firing
    two pipelines for the same period concurrently. There is no strong
    DB-level lock — this is best-effort and racy by design, but it
    eliminates the common case of two parallel workers stomping on each
    other's `clear_week_data()` + INSERT cycle.
    """
    from app.database import get_session_local
    from app.models.collection_run import CollectionRun

    db = get_session_local()()
    try:
        run = db.query(CollectionRun).filter(CollectionRun.period_id == period_id).first()
        if not run or run.status != "running" or not run.started_at:
            return False
        age = (datetime.utcnow() - run.started_at).total_seconds()
        return age < _FRESH_RUNNING_SECONDS
    except Exception as e:
        logger.warning(f"Failed to check running state for {period_id}: {e}")
        return False
    finally:
        db.close()


def run_collection(db: Session, week_id: Optional[str] = None):
    """
    Run the full data collection pipeline (all stages).

    Args:
        db: Database session
        week_id: Week ID or None for current day
    """
    week_id = week_id or current_day_id()

    # Reject duplicate triggers within the fresh-run window.
    if _is_collection_running(week_id):
        logger.warning(
            f"Skip: collection for {week_id} is already running (fresh < "
            f"{_FRESH_RUNNING_SECONDS}s). Refusing to start a parallel pipeline."
        )
        return

    logger.info(f"Starting full collection for {week_id}")
    set_collection_status(week_id, "running", stage="stage1")
    finalised = False

    try:
        # Stage 1: Fetch and store raw data
        stage1_counts = stage1_fetch_and_store(db, week_id)
        set_collection_status(week_id, "running", stage="stage2", raw_counts=stage1_counts)

        # Initialize LLM processor
        processor = LLMProcessor()

        # Stage 2: Classification
        stage2_classify_articles(db, week_id, processor)
        set_collection_status(week_id, "running", stage="stage3")

        # Stage 3: Parallel processing (produces DE + EN)
        results = stage3_parallel_processing(db, week_id, processor)
        set_collection_status(week_id, "running", stage="stage4_base")

        # Load raw videos for metadata
        raw_videos = db.query(RawVideo).filter(RawVideo.week_id == week_id).all()

        # Stage 4a: Save base DE/EN content immediately
        # This makes content visible even if translations fail
        stage4_save_to_database(db, week_id, results, raw_videos)

        _inv = results.get("investment", {}) or {}
        counts = {
            "tech": len(results.get("tech", {}).get("de", [])),
            "tips": len(results.get("tips", {}).get("de", [])),
            "investment": (
                len((_inv.get("primaryMarket") or {}).get("de", []))
                + len((_inv.get("secondaryMarket") or {}).get("de", []))
                + len((_inv.get("ma") or {}).get("de", []))
            ),
            "videos": len(results.get("videos", {}).get("de", [])),
        }

        if sum(counts.values()) == 0:
            set_collection_status(week_id, "empty", stage="stage4_base", counts=counts)
            finalised = True
            logger.warning(f"Collection produced 0 items for {week_id}")
            return

        # Stage 3.5: Translate EN content to 6 additional languages
        # Now runs AFTER base save — failures here are non-blocking
        set_collection_status(week_id, "running", stage="stage3_5")
        try:
            stage3_5_translate_content(results)
            _backfill_translations_to_db(db, week_id, results)
            logger.info(f"Translations saved for {week_id}")
        except Exception as e:
            logger.warning(f"Translation stage failed (non-fatal): {e}")
            # Base DE/EN content is already saved — translations will be missing
            # but content is still accessible

        set_collection_status(week_id, "completed", stage="done", counts=counts)
        finalised = True
        logger.info(f"Collection complete for {week_id}")
    except Exception as e:
        try:
            set_collection_status(week_id, "failed", error=str(e))
            finalised = True
        except Exception as inner:
            logger.error(f"Could not mark {week_id} failed after error '{e}': {inner}")
        logger.error(f"Collection failed for {week_id}: {e}")
        raise
    finally:
        # Last-resort: never leave the row stuck in 'running'. If we
        # somehow returned without writing a terminal status (early
        # `return` paths above all set one explicitly, but defend
        # against future edits), mark it failed so the next workflow
        # trigger can retry instead of skipping.
        if not finalised:
            try:
                set_collection_status(
                    week_id, "failed",
                    error="run_collection exited without setting terminal status",
                )
            except Exception as inner:
                logger.error(f"Final-status fallback for {week_id} failed: {inner}")


def stage4_save_ma_to_database(db: Session, week_id: str, investment_data: dict) -> None:
    """Save only M&A posts to database (does not touch other sections)."""
    logger.info("=== Stage 4 (M&A only): Saving to Database ===")

    # Clear existing M&A posts for the week
    db.query(MAPost).filter(MAPost.week_id == week_id).delete()

    ma_data = investment_data.get("ma", {}) if isinstance(investment_data, dict) else {}
    de_posts = ma_data.get("de", []) if isinstance(ma_data, dict) else []
    en_posts = ma_data.get("en", []) if isinstance(ma_data, dict) else []

    for de_p, en_p in zip(de_posts, en_posts):
        post = MAPost(
            week_id=week_id,
            content_de=de_p.get("content", ""),
            content_en=en_p.get("content", ""),
            acquirer=de_p.get("acquirer", ""),
            target=de_p.get("target", ""),
            deal_value_de=de_p.get("dealValue"),
            deal_value_en=en_p.get("dealValue"),
            deal_type_de=de_p.get("dealType", ""),
            deal_type_en=en_p.get("dealType", ""),
            industry=de_p.get("industry") or en_p.get("industry"),
            author=_source_author(en_p),
            timestamp=de_p.get("timestamp", ""),
            source_url=de_p.get("sourceUrl"),
            metrics=de_p.get("metrics", {}),
        )
        db.add(post)

    try:
        db.commit()
        logger.info(f"Saved M&A data for {week_id}")
    except Exception as e:
        logger.error(f"Failed to save M&A data for {week_id}, rolling back: {e}")
        db.rollback()
        raise


def run_ma_collection(db: Session, week_id: Optional[str] = None):
    """
    Run a lightweight collection that only updates M&A posts.

    - Fetch M&A RSS sources in parallel
    - Process with dedicated LLM prompt
    - Save only M&A posts (does not clear other sections)
    """
    settings = get_settings()
    week_id = week_id or current_day_id()
    logger.info(f"Starting M&A-only collection for {week_id}")

    # Ensure week exists but do not clear everything
    ensure_week(db, week_id)

    # Load only M&A sources
    sources = load_sources()
    ma_sources = {"ma": sources.get("ma", [])}

    # Fetch M&A articles in parallel
    try:
        rss_articles = fetch_rss_feeds_parallel(ma_sources)
    except Exception as e:
        logger.error(f"Failed to fetch M&A RSS feeds: {e}")
        rss_articles = []

    # Filter by week boundaries and store raw articles (original_section='investment' for compatibility)
    week_start, week_end = get_week_boundaries(week_id)
    filtered = [a for a in rss_articles if is_article_in_week(a, week_start, week_end)]
    for article in filtered:
        raw_article = RawArticle(
            week_id=week_id,
            source=article.get("source", "Unknown"),
            title=article.get("title", ""),
            link=article.get("link", ""),
            summary=article.get("summary", ""),
            published=article.get("published", ""),
            original_section="investment",
            raw_data={},
        )
        db.add(raw_article)
    db.commit()

    # Build minimal article list for LLM
    articles = [
        {
            "source": a.get("source", "Unknown"),
            "title": a.get("title", ""),
            "summary": a.get("summary", ""),
            "link": a.get("link", ""),
            "published": a.get("published", ""),
        }
        for a in filtered
    ]

    # Process with LLM (M&A only)
    processor = LLMProcessor()
    investment_result = processor.process_ma_articles(
        articles,
        count=settings.investment_output_count,
    )

    # Save only M&A results
    stage4_save_ma_to_database(db, week_id, investment_result)

    logger.info(f"M&A-only collection complete for {week_id}")
