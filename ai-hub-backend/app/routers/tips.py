"""
Tips feed endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Week, TipPost
from app.schemas import TipsFeedResponse, TipPostResponse
from app.schemas.common import Author, Metrics

router = APIRouter(prefix="/tips", tags=["tips"])


def tip_to_response(post: TipPost, language: str) -> TipPostResponse:
    """Convert tip post to API response."""
    is_german = language == "de"
    return TipPostResponse(
        id=post.id,
        author=Author(**post.author),
        platform=post.platform,
        content=post.content_de if is_german else post.content_en,
        tip=post.tip_de if is_german else post.tip_en,
        category=post.category_de if is_german else post.category_en,
        difficulty=post.difficulty_de if is_german else post.difficulty_en,
        timestamp=post.timestamp,
        metrics=Metrics(**post.metrics) if post.metrics else Metrics(),
        sourceUrl=post.source_url,
    )


@router.get("/{week_id}", response_model=TipsFeedResponse)
def get_tips_feed(week_id: str, db: Session = Depends(get_db)):
    """Get tips feed for a specific week."""
    # Verify week exists
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(status_code=404, detail=f"Week {week_id} not found")

    # Get all tips for this week
    posts = db.query(TipPost).filter(TipPost.week_id == week_id).all()

    return TipsFeedResponse(
        de=[tip_to_response(p, "de") for p in posts],
        en=[tip_to_response(p, "en") for p in posts],
    )
