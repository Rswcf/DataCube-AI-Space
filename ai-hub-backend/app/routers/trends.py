"""
Trends feed endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Week, Trend, TeamMember
from app.schemas import TrendsFeedResponse, TrendResponse, TeamMemberResponse
from app.services.i18n_utils import get_field, SUPPORTED_LANGUAGES

router = APIRouter(prefix="/trends", tags=["trends"])


def _langs_with_data(trends: list[Trend]) -> list[str]:
    """Return language codes that have content."""
    langs = {"de", "en"}
    for t in trends:
        if t.translations and isinstance(t.translations, dict):
            langs.update(t.translations.keys())
    return [lang for lang in SUPPORTED_LANGUAGES if lang in langs]


@router.get("/{week_id}", response_model=TrendsFeedResponse)
def get_trends_feed(week_id: str, db: Session = Depends(get_db)):
    """Get trends for a specific week."""
    # Verify week exists
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(status_code=404, detail=f"Week {week_id} not found")

    # Get trends for this week
    trends = db.query(Trend).filter(Trend.week_id == week_id).all()

    # Get all team members (not week-specific)
    team_members = db.query(TeamMember).all()

    available_langs = _langs_with_data(trends)

    trends_dict = {}
    for lang in available_langs:
        trends_dict[lang] = [
            TrendResponse(
                category=get_field(t, "category", lang) or "",
                title=get_field(t, "title", lang) or "",
                posts=t.posts,
            )
            for t in trends
        ]

    # Team members only have de/en (no translations column)
    team_dict = {
        "de": [
            TeamMemberResponse(
                name=m.name,
                role=m.role_de,
                handle=m.handle,
                avatar=m.avatar,
            )
            for m in team_members
        ],
        "en": [
            TeamMemberResponse(
                name=m.name,
                role=m.role_en,
                handle=m.handle,
                avatar=m.avatar,
            )
            for m in team_members
        ],
    }

    return TrendsFeedResponse(
        trends=trends_dict,
        teamMembers=team_dict,
    )
