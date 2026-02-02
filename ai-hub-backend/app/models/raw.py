"""
Raw data models for storing fetched content before LLM processing.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, Integer, Float, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RawArticle(Base):
    """Raw article data before LLM processing."""

    __tablename__ = "raw_articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    week_id: Mapped[str] = mapped_column(String(10), ForeignKey("weeks.id"), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(200), nullable=False)  # "Hacker News", "MIT Technology Review", etc.
    title: Mapped[str] = mapped_column(Text, nullable=False)
    link: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    published: Mapped[str] = mapped_column(String(30), nullable=False)
    original_section: Mapped[str] = mapped_column(String(20), nullable=False)  # "tech", "investment", "tips"
    section: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # LLM classified section
    relevance: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # LLM relevance score
    raw_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)  # Original data (HN points, comments, etc.)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<RawArticle {self.id}: {self.title[:50]}>"


class RawVideo(Base):
    """Raw YouTube video data before LLM processing."""

    __tablename__ = "raw_videos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    week_id: Mapped[str] = mapped_column(String(10), ForeignKey("weeks.id"), nullable=False, index=True)
    video_id: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    channel_name: Mapped[str] = mapped_column(String(200), nullable=False)
    channel_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    transcript: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    published_at: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    duration_formatted: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    view_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    like_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    raw_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)  # Full original data
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<RawVideo {self.video_id}: {self.title[:50]}>"
