"""
Tech feed endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Week, TechPost
from app.schemas import TechFeedResponse, TechPostResponse
from app.schemas.common import Author, Metrics
from app.services.i18n_utils import get_field, SUPPORTED_LANGUAGES

router = APIRouter(prefix="/tech", tags=["tech"])


def _langs_with_data(posts: list[TechPost]) -> list[str]:
    """Return language codes that have content (de/en always, others if translations exist)."""
    langs = {"de", "en"}
    for p in posts:
        if p.translations and isinstance(p.translations, dict):
            langs.update(p.translations.keys())
    # Return in canonical order
    return [lang for lang in SUPPORTED_LANGUAGES if lang in langs]


def db_post_to_response(post: TechPost, language: str) -> TechPostResponse:
    """Convert database post to API response for given language."""
    return TechPostResponse(
        id=post.id,
        author=Author(**post.author),
        content=get_field(post, "content", language) or "",
        tags=get_field(post, "tags", language) or [],
        category=get_field(post, "category", language) or "",
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

    Returns multilingual data with video posts interspersed among regular posts.
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

    available_langs = _langs_with_data(posts)
    result = {lang: [db_post_to_response(p, lang) for p in posts] for lang in available_langs}
    return result
