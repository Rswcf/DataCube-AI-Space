"""
Investment feed endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Week, PrimaryMarketPost, SecondaryMarketPost, MAPost
from app.schemas import InvestmentFeedResponse, PrimaryMarketResponse, SecondaryMarketResponse, MAResponse
from app.schemas.common import Author, Metrics
from app.services.i18n_utils import get_field, SUPPORTED_LANGUAGES

router = APIRouter(prefix="/investment", tags=["investment"])


def _langs_with_data(*post_lists) -> list[str]:
    """Return language codes that have content across multiple post lists."""
    langs = {"de", "en"}
    for posts in post_lists:
        for p in posts:
            if p.translations and isinstance(p.translations, dict):
                langs.update(p.translations.keys())
    return [lang for lang in SUPPORTED_LANGUAGES if lang in langs]


def safe_author(author_dict: dict) -> Author:
    """Create Author with fallback values for missing fields."""
    return Author(
        name=author_dict.get("name", "Unknown"),
        handle=author_dict.get("handle", "@unknown"),
        avatar=author_dict.get("avatar", "??"),
        verified=author_dict.get("verified", False),
    )


def primary_to_response(post: PrimaryMarketPost, language: str) -> PrimaryMarketResponse:
    """Convert primary market post to API response."""
    return PrimaryMarketResponse(
        id=post.id,
        author=safe_author(post.author),
        content=get_field(post, "content", language) or "",
        company=post.company,
        amount=get_field(post, "amount", language) or "N/A",
        round=post.round,
        roundCategory=post.round_category,
        investors=post.investors,
        valuation=get_field(post, "valuation", language),
        timestamp=post.timestamp,
        metrics=Metrics(**post.metrics) if post.metrics else Metrics(),
        sourceUrl=post.source_url,
    )


def secondary_to_response(post: SecondaryMarketPost, language: str) -> SecondaryMarketResponse:
    """Convert secondary market post to API response."""
    return SecondaryMarketResponse(
        id=post.id,
        author=safe_author(post.author),
        content=get_field(post, "content", language) or "",
        ticker=post.ticker,
        price=post.price,
        change=post.change,
        direction=post.direction,
        marketCap=get_field(post, "market_cap", language),
        timestamp=post.timestamp,
        metrics=Metrics(**post.metrics) if post.metrics else Metrics(),
        sourceUrl=post.source_url,
    )


def ma_to_response(post: MAPost, language: str) -> MAResponse:
    """Convert M&A post to API response."""
    return MAResponse(
        id=post.id,
        author=safe_author(post.author),
        content=get_field(post, "content", language) or "",
        acquirer=post.acquirer,
        target=post.target,
        dealValue=get_field(post, "deal_value", language),
        dealType=get_field(post, "deal_type", language) or "",
        industry=post.industry,
        timestamp=post.timestamp,
        metrics=Metrics(**post.metrics) if post.metrics else Metrics(),
        sourceUrl=post.source_url,
    )


@router.get("/{week_id}", response_model=InvestmentFeedResponse)
def get_investment_feed(week_id: str, db: Session = Depends(get_db)):
    """Get investment feed for a specific week."""
    # Verify week exists
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(status_code=404, detail=f"Week {week_id} not found")

    # Get all posts for this week
    primary_posts = db.query(PrimaryMarketPost).filter(PrimaryMarketPost.week_id == week_id).all()
    secondary_posts = db.query(SecondaryMarketPost).filter(SecondaryMarketPost.week_id == week_id).all()
    ma_posts = db.query(MAPost).filter(MAPost.week_id == week_id).all()

    available_langs = _langs_with_data(primary_posts, secondary_posts, ma_posts)

    return InvestmentFeedResponse(
        primaryMarket={
            lang: [primary_to_response(p, lang) for p in primary_posts]
            for lang in available_langs
        },
        secondaryMarket={
            lang: [secondary_to_response(p, lang) for p in secondary_posts]
            for lang in available_langs
        },
        ma={
            lang: [ma_to_response(p, lang) for p in ma_posts]
            for lang in available_langs
        },
    )
