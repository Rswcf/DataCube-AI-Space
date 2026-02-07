"""
API-based data migration service for importing JSON data directly.
"""

import logging
from sqlalchemy.orm import Session

from app.models import (
    Week, TechPost, Video, PrimaryMarketPost, SecondaryMarketPost, MAPost,
    TipPost, Trend, TeamMember,
)
from app.services.period_utils import ensure_period

logger = logging.getLogger(__name__)


def import_week_from_json(
    db: Session,
    week_id: str,
    tech_data: dict | None = None,
    investment_data: dict | None = None,
    tips_data: dict | None = None,
    trends_data: dict | None = None,
) -> dict:
    """
    Import week data from JSON dictionaries.
    """
    counts = {
        "tech": 0,
        "investment": 0,
        "tips": 0,
        "trends": 0,
    }

    # Ensure week exists
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        week = ensure_period(db, week_id, is_current=True)

    # Import tech data
    if tech_data:
        de_posts = tech_data.get("de", [])
        en_posts = tech_data.get("en", [])

        for i, (de_p, en_p) in enumerate(zip(de_posts, en_posts)):
            post = TechPost(
                week_id=week_id,
                content_de=de_p.get("content", ""),
                content_en=en_p.get("content", ""),
                category_de=de_p.get("category", ""),
                category_en=en_p.get("category", ""),
                author=de_p.get("author", {}),
                tags_de=de_p.get("tags", []),
                tags_en=en_p.get("tags", []),
                icon_type=de_p.get("iconType", "Brain"),
                impact=de_p.get("impact", "medium"),
                timestamp=de_p.get("timestamp", ""),
                source=de_p.get("source", ""),
                source_url=de_p.get("sourceUrl"),
                metrics=de_p.get("metrics", {}),
                display_order=i,
                is_video=de_p.get("isVideo", False),
                video_id=de_p.get("videoId"),
                video_duration=de_p.get("videoDuration"),
                video_view_count=de_p.get("videoViewCount"),
                video_thumbnail_url=de_p.get("videoThumbnailUrl"),
            )
            db.add(post)
            counts["tech"] += 1

    # Import investment data
    if investment_data:
        # Primary market
        primary = investment_data.get("primaryMarket", {})
        for de_p, en_p in zip(primary.get("de", []), primary.get("en", [])):
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
            db.add(post)
            counts["investment"] += 1

        # Secondary market
        secondary = investment_data.get("secondaryMarket", {})
        for de_p, en_p in zip(secondary.get("de", []), secondary.get("en", [])):
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
            db.add(post)
            counts["investment"] += 1

        # M&A
        ma = investment_data.get("ma", {})
        for de_p, en_p in zip(ma.get("de", []), ma.get("en", [])):
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
            counts["investment"] += 1

    # Import tips data
    if tips_data:
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
            counts["tips"] += 1

    # Import trends data
    if trends_data:
        for de_t, en_t in zip(
            trends_data.get("trends", {}).get("de", []),
            trends_data.get("trends", {}).get("en", []),
        ):
            trend = Trend(
                week_id=week_id,
                category_de=de_t.get("category", ""),
                category_en=en_t.get("category", ""),
                title_de=de_t.get("title", ""),
                title_en=en_t.get("title", ""),
                posts=de_t.get("posts"),
            )
            db.add(trend)
            counts["trends"] += 1

        # Import team members (only if not already present)
        existing_members = db.query(TeamMember).count()
        if existing_members == 0:
            for de_m, en_m in zip(
                trends_data.get("teamMembers", {}).get("de", []),
                trends_data.get("teamMembers", {}).get("en", []),
            ):
                member = TeamMember(
                    name=de_m.get("name", ""),
                    role_de=de_m.get("role", ""),
                    role_en=en_m.get("role", ""),
                    handle=de_m.get("handle", ""),
                    avatar=de_m.get("avatar", ""),
                )
                db.add(member)

    db.commit()
    logger.info(f"Imported {week_id}: {counts}")
    return counts
