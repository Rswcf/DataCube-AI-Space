"""
Common schemas used across multiple endpoints.
"""

from pydantic import BaseModel


class Author(BaseModel):
    """Author information for feed posts."""

    name: str
    handle: str
    avatar: str  # 2-letter abbreviation
    verified: bool = True


class Metrics(BaseModel):
    """Engagement metrics for social-style display."""

    comments: int = 0
    retweets: int = 0
    likes: int = 0
    views: str = "0"
