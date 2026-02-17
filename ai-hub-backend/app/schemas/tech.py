"""
Tech feed schemas.
"""

from typing import Optional
from pydantic import BaseModel

from app.schemas.common import Author, Metrics


class TechPostResponse(BaseModel):
    """A tech news post."""

    id: int
    author: Author
    content: str
    tags: list[str]
    category: str
    iconType: str  # "Brain", "Server", "Zap", "Cpu"
    impact: str  # "critical", "high", "medium", "low"
    timestamp: str  # ISO date
    metrics: Metrics
    source: str
    sourceUrl: Optional[str] = None

    # Video fields (only present for video posts)
    isVideo: bool = False
    videoId: Optional[str] = None
    videoDuration: Optional[str] = None
    videoViewCount: Optional[str] = None
    videoThumbnailUrl: Optional[str] = None

    class Config:
        from_attributes = True


class TechFeedResponse(BaseModel):
    """Multilingual tech feed response (de, en + translated languages)."""

    model_config = {"extra": "allow"}

    de: list[TechPostResponse] = []
    en: list[TechPostResponse] = []
