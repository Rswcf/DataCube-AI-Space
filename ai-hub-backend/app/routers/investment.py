"""
Investment feed endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Week, PrimaryMarketPost, SecondaryMarketPost, MAPost
from app.schemas import InvestmentFeedResponse, PrimaryMarketResponse, SecondaryMarketResponse, MAResponse
from app.schemas.common import Author, Metrics

router = APIRouter(prefix="/investment", tags=["investment"])


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
    is_german = language == "de"
    return PrimaryMarketResponse(
        id=post.id,
        author=safe_author(post.author),
        content=post.content_de if is_german else post.content_en,
        company=post.company,
        amount=post.amount_de if is_german else post.amount_en,
        round=post.round,
        investors=post.investors,
        valuation=post.valuation_de if is_german else post.valuation_en,
        timestamp=post.timestamp,
        metrics=Metrics(**post.metrics) if post.metrics else Metrics(),
        sourceUrl=post.source_url,
    )


def secondary_to_response(post: SecondaryMarketPost, language: str) -> SecondaryMarketResponse:
    """Convert secondary market post to API response."""
    is_german = language == "de"
    return SecondaryMarketResponse(
        id=post.id,
        author=safe_author(post.author),
        content=post.content_de if is_german else post.content_en,
        ticker=post.ticker,
        price=post.price,
        change=post.change,
        direction=post.direction,
        marketCap=post.market_cap_de if is_german else post.market_cap_en,
        timestamp=post.timestamp,
        metrics=Metrics(**post.metrics) if post.metrics else Metrics(),
        sourceUrl=post.source_url,
    )


def ma_to_response(post: MAPost, language: str) -> MAResponse:
    """Convert M&A post to API response."""
    is_german = language == "de"
    return MAResponse(
        id=post.id,
        author=safe_author(post.author),
        content=post.content_de if is_german else post.content_en,
        acquirer=post.acquirer,
        target=post.target,
        dealValue=post.deal_value_de if is_german else post.deal_value_en,
        dealType=post.deal_type_de if is_german else post.deal_type_en,
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

    return InvestmentFeedResponse(
        primaryMarket={
            "de": [primary_to_response(p, "de") for p in primary_posts],
            "en": [primary_to_response(p, "en") for p in primary_posts],
        },
        secondaryMarket={
            "de": [secondary_to_response(p, "de") for p in secondary_posts],
            "en": [secondary_to_response(p, "en") for p in secondary_posts],
        },
        ma={
            "de": [ma_to_response(p, "de") for p in ma_posts],
            "en": [ma_to_response(p, "en") for p in ma_posts],
        },
    )
