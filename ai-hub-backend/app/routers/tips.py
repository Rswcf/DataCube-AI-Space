"""
Tips feed endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Week, TipPost
from app.schemas import TipsFeedResponse, TipPostResponse
from app.schemas.common import Author, Metrics
from app.services.i18n_utils import get_field, SUPPORTED_LANGUAGES

router = APIRouter(prefix="/tips", tags=["tips"])


def _langs_with_data(posts: list[TipPost]) -> list[str]:
    """Return language codes that have content."""
    langs = {"de", "en"}
    for p in posts:
        if p.translations and isinstance(p.translations, dict):
            langs.update(p.translations.keys())
    return [lang for lang in SUPPORTED_LANGUAGES if lang in langs]


def tip_to_response(post: TipPost, language: str) -> TipPostResponse:
    """Convert tip post to API response."""
    timestamp = post.timestamp
    if (post.metrics or {}).get("sourceStatus") != "input_verified":
        # The UI labels unverified legacy dates as edition dates. This also
        # protects older editions outside the audited database repair range.
        try:
            if "-kw" in post.week_id:
                year, week = post.week_id.split("-kw")
                timestamp = datetime.fromisocalendar(int(year), int(week), 1).date().isoformat()
            else:
                timestamp = datetime.strptime(post.week_id, "%Y-%m-%d").date().isoformat()
        except ValueError:
            pass
    return TipPostResponse(
        id=post.id,
        author=Author(**post.author),
        platform=post.platform,
        content=get_field(post, "content", language) or "",
        tip=get_field(post, "tip", language) or "",
        category=get_field(post, "category", language) or "",
        difficulty=get_field(post, "difficulty", language) or "",
        timestamp=timestamp,
        metrics=Metrics(**post.metrics) if post.metrics else Metrics(),
        sourceUrl=post.source_url,
        sourceStatus=(post.metrics or {}).get("sourceStatus", "unverified_legacy"),
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

    available_langs = _langs_with_data(posts)
    result = {lang: [tip_to_response(p, lang) for p in posts] for lang in available_langs}
    return result
