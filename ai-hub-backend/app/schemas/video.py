"""
Video schemas for YouTube video endpoint.
"""

from typing import Optional
from pydantic import BaseModel


class VideoResponse(BaseModel):
    """A YouTube video with metadata."""

    id: int
    videoId: str
    title: str  # Language-specific
    summary: str  # Language-specific
    channelName: str
    thumbnailUrl: str
    publishedAt: str
    durationSeconds: int
    durationFormatted: str  # "12:34"
    viewCount: int
    likeCount: int
    tags: Optional[str] = None
    category: Optional[str] = None

    class Config:
        from_attributes = True


class VideoFeedResponse(BaseModel):
    """Bilingual video feed response."""

    de: list[VideoResponse]
    en: list[VideoResponse]
