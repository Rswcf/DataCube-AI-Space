"""
Tips feed schemas.
"""

from typing import Optional
from pydantic import BaseModel

from app.schemas.common import Author, Metrics


class TipPostResponse(BaseModel):
    """A practical AI tip post."""

    id: int
    author: Author
    platform: str  # "X" or "Reddit"
    content: str
    tip: str  # The actual tip/prompt
    category: str
    difficulty: str  # "Beginner"/"Intermediate"/"Advanced" or German equivalents
    timestamp: str
    metrics: Metrics
    sourceUrl: Optional[str] = None

    class Config:
        from_attributes = True


class TipsFeedResponse(BaseModel):
    """Multilingual tips feed response (de, en + translated languages)."""

    model_config = {"extra": "allow"}

    de: list[TipPostResponse] = []
    en: list[TipPostResponse] = []
