"""
Main data collection orchestrator with two-stage processing and parallel LLM calls.
"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from typing import Optional

import yaml
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import (
    Week, TechPost, Video, PrimaryMarketPost, SecondaryMarketPost, MAPost,
    TipPost, Trend, TeamMember, RawArticle, RawVideo,
)
from app.services.rss_fetcher import fetch_rss_feeds, fetch_rss_feeds_parallel
from app.services.hn_fetcher import fetch_hn_stories
from app.services.youtube_fetcher import fetch_youtube_videos, fetch_video_transcript
from app.services.llm_processor import LLMProcessor

logger = logging.getLogger(__name__)


def current_week_id() -> str:
    """Return the current ISO week as '2025-kw04' format."""
    now = datetime.now()
    year, week, _ = now.isocalendar()
    return f"{year}-kw{week:02d}"


def week_date_range(year: int, week: int) -> str:
    """Return date range string like '20.01 - 26.01' for a given ISO week."""
    jan4 = datetime(year, 1, 4)
    start = jan4 + timedelta(weeks=week - 1, days=-jan4.weekday())
    end = start + timedelta(days=6)
    return f"{start.day:02d}.{start.month:02d} - {end.day:02d}.{end.month:02d}"


def get_week_boundaries(week_id: str) -> tuple[datetime, datetime]:
    """
    Return the start and end datetime for a given ISO week.

    Args:
        week_id: Week ID in format '2026-kw06'

    Returns:
        Tuple of (start, end) where:
        - start: Monday 00:00:00 of the week
        - end: Monday 00:00:00 of the next week (exclusive)
    """
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

    Args:
        date_str: Date string in various formats (RSS, ISO, etc.)

    Returns:
        datetime object or None if parsing fails
    """
    if not date_str:
        return None

    from dateutil import parser as dateutil_parser

    try:
        # dateutil.parser handles most formats automatically
        dt = dateutil_parser.parse(date_str)
        # Remove timezone info for comparison (treat all as local/UTC)
        if dt.tzinfo:
            dt = dt.replace(tzinfo=None)
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
            {"url": "https://www.reuters.com/markets/deals/rss", "name": "Reuters Deals"},
            {"url": "https://techcrunch.com/tag/mergers-and-acquisitions/feed/", "name": "TechCrunch M&A"},
            {"url": "https://www.marketwatch.com/rss/markets/deals", "name": "MarketWatch Deals"},
        ],
        "tips": [
            # Blogs (business-oriented)
            {"url": "https://simonwillison.net/atom/everything/", "name": "Simon Willison"},
            {"url": "https://www.oneusefulthing.org/feed", "name": "One Useful Thing (Ethan Mollick)"},

            # Reddit - LLM & Chat Tools
            {"url": "https://www.reddit.com/r/ChatGPT/top/.rss?t=week", "name": "Reddit r/ChatGPT"},
            {"url": "https://www.reddit.com/r/ClaudeAI/top/.rss?t=week", "name": "Reddit r/ClaudeAI"},
            {"url": "https://www.reddit.com/r/OpenAI/top/.rss?t=week", "name": "Reddit r/OpenAI"},
            {"url": "https://www.reddit.com/r/PromptEngineering/top/.rss?t=week", "name": "Reddit r/PromptEngineering"},

            # Reddit - Image Generation (marketing use)
            {"url": "https://www.reddit.com/r/midjourney/top/.rss?t=week", "name": "Reddit r/Midjourney"},

            # Reddit - AI Search & Research Tools
            {"url": "https://www.reddit.com/r/perplexity_ai/top/.rss?t=week", "name": "Reddit r/perplexity_ai"},
            {"url": "https://www.reddit.com/r/NotebookLM/top/.rss?t=week", "name": "Reddit r/NotebookLM"},

            # Reddit - General AI Discussion
            {"url": "https://www.reddit.com/r/artificial/top/.rss?t=week", "name": "Reddit r/artificial"},
            {"url": "https://www.reddit.com/r/singularity/top/.rss?t=week", "name": "Reddit r/singularity"},

            # Reddit - Video/Audio Generation (content creation)
            {"url": "https://www.reddit.com/r/aivideo/top/.rss?t=week", "name": "Reddit r/aivideo"},
            {"url": "https://www.reddit.com/r/ElevenLabs/top/.rss?t=week", "name": "Reddit r/ElevenLabs"},

            # Reddit - Pro Users
            {"url": "https://www.reddit.com/r/ChatGPTPro/top/.rss?t=week", "name": "Reddit r/ChatGPTPro"},
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
    week = db.query(Week).filter(Week.id == week_id).first()

    if not week:
        parts = week_id.split("-kw")
        year = int(parts[0])
        week_num = int(parts[1])

        # Set all existing weeks to non-current
        db.query(Week).update({Week.is_current: False})

        week = Week(
            id=week_id,
            label=f"KW {week_num:02d}",
            year=year,
            week_num=week_num,
            date_range=week_date_range(year, week_num),
            is_current=True,
        )
        db.add(week)
        db.commit()
        logger.info(f"Created week {week_id}")

    return week


def clear_week_data(db: Session, week_id: str):
    """Clear existing data for a week (for re-collection)."""
    db.query(TechPost).filter(TechPost.week_id == week_id).delete()
    db.query(Video).filter(Video.week_id == week_id).delete()
    db.query(PrimaryMarketPost).filter(PrimaryMarketPost.week_id == week_id).delete()
    db.query(SecondaryMarketPost).filter(SecondaryMarketPost.week_id == week_id).delete()
    db.query(MAPost).filter(MAPost.week_id == week_id).delete()
    db.query(TipPost).filter(TipPost.week_id == week_id).delete()
    db.query(Trend).filter(Trend.week_id == week_id).delete()
    db.commit()
    logger.info(f"Cleared existing data for {week_id}")


def clear_raw_data(db: Session, week_id: str):
    """Clear raw data for a week."""
    db.query(RawArticle).filter(RawArticle.week_id == week_id).delete()
    db.query(RawVideo).filter(RawVideo.week_id == week_id).delete()
    db.commit()
    logger.info(f"Cleared raw data for {week_id}")


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

        # Classify articles
        classified = processor.classify_articles(articles_for_llm)

        # Update database with classification results
        classification_map = {a["title"]: a for a in classified}

        for raw_article in articles_to_classify:
            classification = classification_map.get(raw_article.title)
            if classification:
                raw_article.section = classification.get("section", raw_article.original_section)
                raw_article.relevance = classification.get("relevance", 0.5)

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

    # Clear existing processed data
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
    for i, (de_v, en_v) in enumerate(zip(video_data.get("de", []), video_data.get("en", []))):
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
            title_de=de_v.get("title", ""),
            title_en=en_v.get("title", ""),
            summary_de=de_v.get("summary", ""),
            summary_en=en_v.get("summary", ""),
            original_title=meta.get("original_title", ""),
            channel_name=meta.get("channel_name", ""),
            channel_id=meta.get("channel_id"),
            thumbnail_url=meta.get("thumbnail_url", ""),
            published_at=meta.get("published_at", ""),
            duration_seconds=meta.get("duration_seconds", 0),
            duration_formatted=meta.get("duration_formatted", "0:00"),
            view_count=meta.get("view_count", 0),
            like_count=meta.get("like_count", 0),
            transcript=raw_video.transcript if raw_video else None,
            category=de_v.get("category") or en_v.get("category"),
        )
        db.add(video)

        # Create video post for tech feed
        video_post = TechPost(
            week_id=week_id,
            content_de=de_v.get("summary", ""),
            content_en=en_v.get("summary", ""),
            category_de=de_v.get("category", "Video"),
            category_en=en_v.get("category", "Video"),
            author={"name": meta.get("channel_name", "YouTube"), "handle": "@youtube", "avatar": "YT", "verified": True},
            tags_de=["Video", "YouTube"],
            tags_en=["Video", "YouTube"],
            icon_type="Zap",
            impact="medium",
            timestamp=meta.get("published_at", "")[:10] if meta.get("published_at") else "",
            source=meta.get("channel_name", "YouTube"),
            source_url=f"https://www.youtube.com/watch?v={vid}",
            metrics={"comments": 0, "retweets": 0, "likes": meta.get("like_count", 0), "views": meta.get("view_count_formatted", "0")},
            is_video=True,
            video_id=vid,
            video_duration=meta.get("duration_formatted"),
            video_view_count=meta.get("view_count_formatted"),
            video_thumbnail_url=meta.get("thumbnail_url"),
        )
        video_posts.append(video_post)

    if skipped_videos > 0:
        logger.info(f"Skipped {skipped_videos} videos (already exist in other weeks)")
    logger.info(f"Created {len(video_posts)} video TechPost entries")

    # Save tech posts with interspersed videos
    regular_posts = []
    for i, (de_p, en_p) in enumerate(zip(tech_data.get("de", []), tech_data.get("en", []))):
        post = TechPost(
            week_id=week_id,
            content_de=de_p.get("content", ""),
            content_en=en_p.get("content", ""),
            category_de=de_p.get("category", ""),
            category_en=en_p.get("category", ""),
            author=de_p.get("author", {"name": "Unknown", "handle": "@unknown", "avatar": "??", "verified": False}),
            tags_de=de_p.get("tags", []),
            tags_en=en_p.get("tags", []),
            icon_type=de_p.get("iconType", "Brain"),
            impact=de_p.get("impact", "medium"),
            timestamp=de_p.get("timestamp", ""),
            source=de_p.get("source", ""),
            source_url=de_p.get("sourceUrl"),
            metrics=de_p.get("metrics", {}),
            is_video=False,
        )
        regular_posts.append(post)

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

        for de_p, en_p in zip(de_posts, en_posts):
            if model_class == PrimaryMarketPost:
                # Use default values instead of skipping entries without amount
                post = PrimaryMarketPost(
                    week_id=week_id,
                    content_de=de_p.get("content", ""),
                    content_en=en_p.get("content", ""),
                    company=de_p.get("company", ""),
                    amount_de=de_p.get("amount", "N/A"),
                    amount_en=en_p.get("amount", "N/A"),
                    round=de_p.get("round", ""),
                    round_category=de_p.get("roundCategory") or en_p.get("roundCategory"),
                    investors=de_p.get("investors", []),
                    valuation_de=de_p.get("valuation"),
                    valuation_en=en_p.get("valuation"),
                    author=de_p.get("author", {}),
                    timestamp=de_p.get("timestamp", ""),
                    source_url=de_p.get("sourceUrl"),
                    metrics=de_p.get("metrics", {}),
                )
            elif model_class == SecondaryMarketPost:
                # Note: price, change, marketCap are now fetched from real-time API
                # We only store ticker and content from LLM processing
                post = SecondaryMarketPost(
                    week_id=week_id,
                    content_de=de_p.get("content", ""),
                    content_en=en_p.get("content", ""),
                    ticker=de_p.get("ticker", ""),
                    price="",  # Fetched from real-time API
                    change="",  # Fetched from real-time API
                    direction="up",  # Determined by real-time API
                    market_cap_de=None,  # Fetched from real-time API
                    market_cap_en=None,  # Fetched from real-time API
                    author=de_p.get("author", {}),
                    timestamp=de_p.get("timestamp", ""),
                    source_url=de_p.get("sourceUrl"),
                    metrics=de_p.get("metrics", {}),
                )
            else:  # MAPost
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
                    author=de_p.get("author", {}),
                    timestamp=de_p.get("timestamp", ""),
                    source_url=de_p.get("sourceUrl"),
                    metrics=de_p.get("metrics", {}),
                )
            db.add(post)

    # Save tips
    for de_p, en_p in zip(tips_data.get("de", []), tips_data.get("en", [])):
        post = TipPost(
            week_id=week_id,
            content_de=de_p.get("content", ""),
            content_en=en_p.get("content", ""),
            tip_de=de_p.get("tip", ""),
            tip_en=en_p.get("tip", ""),
            category_de=de_p.get("category", ""),
            category_en=en_p.get("category", ""),
            platform=de_p.get("platform", "X"),
            difficulty_de=de_p.get("difficulty", "Mittel"),
            difficulty_en=en_p.get("difficulty", "Intermediate"),
            author=de_p.get("author", {}),
            timestamp=de_p.get("timestamp", ""),
            source_url=de_p.get("sourceUrl"),
            metrics=de_p.get("metrics", {}),
        )
        db.add(post)

    # Save trends
    trends_section = trends_data.get("trends", {})
    if isinstance(trends_section, dict):
        de_trends = trends_section.get("de", [])
        en_trends = trends_section.get("en", [])
    else:
        de_trends = []
        en_trends = []

    for de_t, en_t in zip(de_trends, en_trends):
        if not isinstance(de_t, dict) or not isinstance(en_t, dict):
            continue
        trend = Trend(
            week_id=week_id,
            category_de=de_t.get("category", ""),
            category_en=en_t.get("category", ""),
            title_de=de_t.get("title", ""),
            title_en=en_t.get("title", ""),
            posts=de_t.get("posts"),
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
        logger.info(f"Saved processed data for {week_id}")
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
    week_id = week_id or current_week_id()
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
    week_id = week_id or current_week_id()
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


def run_collection(db: Session, week_id: Optional[str] = None):
    """
    Run the full data collection pipeline (all stages).

    Args:
        db: Database session
        week_id: Week ID or None for current week
    """
    week_id = week_id or current_week_id()

    logger.info(f"Starting full collection for {week_id}")

    # Stage 1: Fetch and store raw data
    fetch_stats = stage1_fetch_and_store(db, week_id)

    # Initialize LLM processor
    processor = LLMProcessor()

    # Stage 2: Classification
    stage2_classify_articles(db, week_id, processor)

    # Stage 3: Parallel processing
    results = stage3_parallel_processing(db, week_id, processor)

    # Load raw videos for metadata
    raw_videos = db.query(RawVideo).filter(RawVideo.week_id == week_id).all()

    # Stage 4: Save to database
    stage4_save_to_database(db, week_id, results, raw_videos)

    logger.info(f"Collection complete for {week_id}")


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
            author=de_p.get("author", {}),
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
    week_id = week_id or current_week_id()
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
