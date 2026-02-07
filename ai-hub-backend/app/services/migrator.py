"""
Data migration service for importing existing JSON data.
"""

import json
import logging
from pathlib import Path
from sqlalchemy.orm import Session

from app.models import (
    Week, TechPost, Video, PrimaryMarketPost, SecondaryMarketPost, MAPost,
    TipPost, Trend, TeamMember,
)
from app.services.period_utils import ensure_period, week_date_range

logger = logging.getLogger(__name__)

# Path to the frontend's public/data directory
# This should be configured based on deployment
DEFAULT_DATA_PATH = Path(__file__).parent.parent.parent.parent / "ai-information-hub" / "public" / "data"


def migrate_week_data(
    db: Session,
    week_id: str,
    data_path: Path = DEFAULT_DATA_PATH,
) -> dict:
    """
    Migrate a week's JSON data to the database.

    Args:
        db: Database session
        week_id: Week ID (e.g., "2025-kw04")
        data_path: Path to the data directory

    Returns:
        Dictionary with counts of migrated items
    """
    week_path = data_path / week_id

    if not week_path.exists():
        raise FileNotFoundError(f"Week data not found: {week_path}")

    counts = {
        "tech": 0,
        "investment": 0,
        "tips": 0,
        "trends": 0,
    }

    # Ensure week exists
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        week = ensure_period(db, week_id, is_current=False)

    # Migrate tech.json
    tech_file = week_path / "tech.json"
    if tech_file.exists():
        with open(tech_file, "r") as f:
            tech_data = json.load(f)

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
                is_video=False,
            )
            db.add(post)
            counts["tech"] += 1

    # Migrate investment.json
    investment_file = week_path / "investment.json"
    if investment_file.exists():
        with open(investment_file, "r") as f:
            investment_data = json.load(f)

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

    # Migrate tips.json
    tips_file = week_path / "tips.json"
    if tips_file.exists():
        with open(tips_file, "r") as f:
            tips_data = json.load(f)

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

    # Migrate trends.json
    trends_file = week_path / "trends.json"
    if trends_file.exists():
        with open(trends_file, "r") as f:
            trends_data = json.load(f)

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

        # Migrate team members (only if not already present)
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
    logger.info(f"Migrated {week_id}: {counts}")
    return counts


def migrate_weeks_json(db: Session, data_path: Path = DEFAULT_DATA_PATH) -> int:
    """
    Migrate weeks.json to database.

    Returns:
        Number of weeks migrated
    """
    weeks_file = data_path / "weeks.json"

    if not weeks_file.exists():
        logger.warning("weeks.json not found")
        return 0

    with open(weeks_file, "r") as f:
        data = json.load(f)

    count = 0
    for w in data.get("weeks", []):
        existing = db.query(Week).filter(Week.id == w["id"]).first()
        if existing:
            continue

        week = ensure_period(db, w["id"], is_current=w.get("current", False))
        week.label = w.get("label", week.label)
        week.year = w.get("year", week.year)
        week.date_range = w.get("dateRange", week.date_range)

        # Preserve imported weekly weekNum when available.
        if week.period_type == "week" and w.get("weekNum") is not None:
            week.week_num = w.get("weekNum")

        db.add(week)
        count += 1

    db.commit()
    logger.info(f"Migrated {count} weeks")
    return count
