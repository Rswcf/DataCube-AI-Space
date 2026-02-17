"""
Video model for YouTube videos with detailed metadata.
"""

from sqlalchemy import String, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Video(Base):
    """A YouTube video with full metadata and transcript."""

    __tablename__ = "videos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    week_id: Mapped[str] = mapped_column(String(10), ForeignKey("weeks.id"), index=True)

    # YouTube identifiers
    video_id: Mapped[str] = mapped_column(String(20), unique=True, index=True)

    # Bilingual content (LLM-generated summaries)
    title_de: Mapped[str] = mapped_column(Text)
    title_en: Mapped[str] = mapped_column(Text)
    summary_de: Mapped[str] = mapped_column(Text)
    summary_en: Mapped[str] = mapped_column(Text)

    # Original YouTube metadata
    original_title: Mapped[str] = mapped_column(Text)
    channel_name: Mapped[str] = mapped_column(String(200))
    channel_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    thumbnail_url: Mapped[str] = mapped_column(Text)
    published_at: Mapped[str] = mapped_column(String(30))

    # Stats
    duration_seconds: Mapped[int] = mapped_column(Integer)
    duration_formatted: Mapped[str] = mapped_column(String(20))  # "12:34"
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    like_count: Mapped[int] = mapped_column(Integer, default=0)

    # Transcript (for LLM processing)
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Classification
    tags: Mapped[str | None] = mapped_column(Text, nullable=True)  # Comma-separated
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Multilingual translations (JSONB)
    translations: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    def __repr__(self) -> str:
        return f"<Video {self.video_id} week={self.week_id}>"
