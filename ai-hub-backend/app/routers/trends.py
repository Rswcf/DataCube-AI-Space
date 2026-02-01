"""
Trends feed endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Week, Trend, TeamMember
from app.schemas import TrendsFeedResponse, TrendResponse, TeamMemberResponse

router = APIRouter(prefix="/trends", tags=["trends"])


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

    return TrendsFeedResponse(
        trends={
            "de": [
                TrendResponse(
                    category=t.category_de,
                    title=t.title_de,
                    posts=t.posts,
                )
                for t in trends
            ],
            "en": [
                TrendResponse(
                    category=t.category_en,
                    title=t.title_en,
                    posts=t.posts,
                )
                for t in trends
            ],
        },
        teamMembers={
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
        },
    )
