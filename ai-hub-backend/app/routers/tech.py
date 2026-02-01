"""
Tech feed endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Week, TechPost
from app.schemas import TechFeedResponse, TechPostResponse
from app.schemas.common import Author, Metrics

router = APIRouter(prefix="/tech", tags=["tech"])


def db_post_to_response(post: TechPost, language: str) -> TechPostResponse:
    """Convert database post to API response for given language."""
    is_german = language == "de"

    return TechPostResponse(
        id=post.id,
        author=Author(**post.author),
        content=post.content_de if is_german else post.content_en,
        tags=post.tags_de if is_german else post.tags_en,
        category=post.category_de if is_german else post.category_en,
        iconType=post.icon_type,
        impact=post.impact,
        timestamp=post.timestamp,
        metrics=Metrics(**post.metrics) if post.metrics else Metrics(),
        source=post.source,
        sourceUrl=post.source_url,
        isVideo=post.is_video,
        videoId=post.video_id,
        videoDuration=post.video_duration,
        videoViewCount=post.video_view_count,
        videoThumbnailUrl=post.video_thumbnail_url,
    )


@router.get("/{week_id}", response_model=TechFeedResponse)
def get_tech_feed(week_id: str, db: Session = Depends(get_db)):
    """
    Get tech feed for a specific week.

    Returns bilingual data with video posts interspersed among regular posts.
    Video posts are positioned at indices 3, 8, 13, 18, 23 (every 5 posts starting at 3).
    """
    # Verify week exists
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(status_code=404, detail=f"Week {week_id} not found")

    # Get all posts for this week, ordered by display_order
    posts = (
        db.query(TechPost)
        .filter(TechPost.week_id == week_id)
        .order_by(TechPost.display_order)
        .all()
    )

    return TechFeedResponse(
        de=[db_post_to_response(p, "de") for p in posts],
        en=[db_post_to_response(p, "en") for p in posts],
    )
