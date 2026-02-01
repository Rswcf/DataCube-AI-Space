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
