"""
Trends feed schemas.
"""

from typing import Optional
from pydantic import BaseModel


class TrendResponse(BaseModel):
    """A trending topic."""

    category: str  # "AI · Trending" or "KI · Trend"
    title: str
    posts: Optional[int] = None
    # Proprietary momentum signal computed from our own topic history
    # (information-gain layer — no aggregation source has this view):
    #   "new"       — topic did not appear in recent prior periods
    #   "rising"    — topic also appeared in the immediately previous period
    #   "returning" — topic appeared earlier but skipped the previous period
    momentum: Optional[str] = None
    # Consecutive periods (including the current one) the topic has trended.
    streak: Optional[int] = None

    class Config:
        from_attributes = True


class TeamMemberResponse(BaseModel):
    """A team member."""

    name: str
    role: str
    handle: str
    avatar: str

    class Config:
        from_attributes = True


class TrendsFeedResponse(BaseModel):
    """Full trends response with trends and team members."""

    trends: dict  # {"de": [...], "en": [...]}
    teamMembers: dict  # {"de": [...], "en": [...]}
    # AI editorial brief keyed by language: {"en": [{"text","topic"}], ...}.
    # Attributed to "DataCube AI Editorial" in the UI (see /ai-disclosure).
    editorial: Optional[dict] = None
