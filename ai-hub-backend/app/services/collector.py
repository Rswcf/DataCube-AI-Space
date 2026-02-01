"""
Main data collection orchestrator.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

import yaml
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import (
    Week, TechPost, Video, PrimaryMarketPost, SecondaryMarketPost, MAPost,
    TipPost, Trend, TeamMember,
)
from app.services.rss_fetcher import fetch_rss_feeds
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
        ],
        "tips": [
            {"url": "https://simonwillison.net/atom/everything/", "name": "Simon Willison"},
            {"url": "https://www.reddit.com/r/ChatGPT/top/.rss?t=week", "name": "Reddit r/ChatGPT"},
            {"url": "https://www.reddit.com/r/ClaudeAI/top/.rss?t=week", "name": "Reddit r/ClaudeAI"},
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


def run_collection(db: Session, week_id: Optional[str] = None):
    """
    Run the full data collection pipeline.

    Args:
        db: Database session
        week_id: Week ID or None for current week
    """
    settings = get_settings()
    week_id = week_id or current_week_id()

    logger.info(f"Starting collection for {week_id}")

    # Ensure week exists and clear old data
    ensure_week(db, week_id)
    clear_week_data(db, week_id)

    # Load sources
    sources = load_sources()

    # Stage 1: Fetch all content
    logger.info("=== Stage 1: Fetching content ===")

    # Fetch HN with enhancement
    hn_articles = fetch_hn_stories(
        query="AI",
        min_points=settings.hn_min_points,
        days=settings.hn_days,
        limit=settings.hn_limit,
        enhance=True,
        max_enhance=30,
    )

    for article in hn_articles:
        article["original_section"] = "tech"

    # Fetch RSS feeds (excluding HN since we use enhanced version)
    rss_articles = fetch_rss_feeds(sources, exclude_names={"Hacker News"})

    # Fetch YouTube videos
    youtube_videos = fetch_youtube_videos(
        max_results=settings.youtube_max_results,
        days=settings.hn_days,
    )

    # Fetch transcripts for top videos
    for video in youtube_videos[:15]:
        transcript = fetch_video_transcript(video["video_id"])
        video["transcript"] = transcript

    all_articles = hn_articles + rss_articles
    logger.info(f"Total articles: {len(all_articles)}, YouTube videos: {len(youtube_videos)}")

    # Stage 2: LLM Processing
    logger.info("=== Stage 2: LLM Processing ===")

    processor = LLMProcessor()

    # Classify articles
    classified = processor.classify_articles(all_articles)

    tech_articles = [a for a in classified if a.get("section") == "tech"]
    investment_articles = [a for a in classified if a.get("section") == "investment"]
    tips_articles = [a for a in classified if a.get("section") == "tips"]

    logger.info(f"Classified: tech={len(tech_articles)}, investment={len(investment_articles)}, tips={len(tips_articles)}")

    # Process content
    tech_data = processor.process_tech_articles(tech_articles, count=settings.tech_output_count)
    video_data = processor.process_youtube_videos(youtube_videos, count=settings.video_output_count)
    investment_data = processor.process_investment_articles(investment_articles)
    tips_data = processor.process_tips_articles(tips_articles)
    trends_data = processor.generate_trends(tech_data, investment_data)

    # Debug: Log LLM processed video counts
    logger.info(f"LLM processed videos: DE={len(video_data.get('de', []))}, EN={len(video_data.get('en', []))}")

    # Stage 3: Save to database
    logger.info("=== Stage 3: Saving to database ===")

    # Build video lookup for metadata
    video_lookup = {v["video_id"]: v for v in youtube_videos}

    # Save videos
    video_posts = []
    logger.info(f"Saving {len(video_data.get('de', []))} video posts to database")
    for i, (de_v, en_v) in enumerate(zip(video_data.get("de", []), video_data.get("en", []))):
        vid = de_v.get("video_id") or en_v.get("video_id")
        if not vid:
            continue

        meta = video_lookup.get(vid, {})

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
            transcript=meta.get("transcript"),
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
                post = PrimaryMarketPost(
                    week_id=week_id,
                    content_de=de_p.get("content", ""),
                    content_en=en_p.get("content", ""),
                    company=de_p.get("company", ""),
                    amount_de=de_p.get("amount", ""),
                    amount_en=en_p.get("amount", ""),
                    round=de_p.get("round", ""),
                    investors=de_p.get("investors", []),
                    valuation_de=de_p.get("valuation"),
                    valuation_en=en_p.get("valuation"),
                    author=de_p.get("author", {}),
                    timestamp=de_p.get("timestamp", ""),
                    source_url=de_p.get("sourceUrl"),
                    metrics=de_p.get("metrics", {}),
                )
            elif model_class == SecondaryMarketPost:
                post = SecondaryMarketPost(
                    week_id=week_id,
                    content_de=de_p.get("content", ""),
                    content_en=en_p.get("content", ""),
                    ticker=de_p.get("ticker", ""),
                    price=de_p.get("price", ""),
                    change=de_p.get("change", ""),
                    direction=de_p.get("direction", "up"),
                    market_cap_de=de_p.get("marketCap"),
                    market_cap_en=en_p.get("marketCap"),
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

    db.commit()
    logger.info(f"Collection complete for {week_id}")
