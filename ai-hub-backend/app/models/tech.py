"""
Tech post model for AI technology news.
"""

from sqlalchemy import String, Integer, Text, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TechPost(Base):
    """A tech news post."""

    __tablename__ = "tech_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    week_id: Mapped[str] = mapped_column(String(10), ForeignKey("weeks.id"), index=True)

    # Bilingual content
    content_de: Mapped[str] = mapped_column(Text)
    content_en: Mapped[str] = mapped_column(Text)
    category_de: Mapped[str] = mapped_column(String(100))
    category_en: Mapped[str] = mapped_column(String(100))

    # Author info (stored as JSONB)
    author: Mapped[dict] = mapped_column(JSONB)

    # Tags (array of strings)
    tags_de: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    tags_en: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)

    # Classification
    icon_type: Mapped[str] = mapped_column(String(20))  # Brain, Server, Zap, Cpu
    impact: Mapped[str] = mapped_column(String(20))  # critical, high, medium, low

    # Metadata
    timestamp: Mapped[str] = mapped_column(String(20))  # ISO date
    source: Mapped[str] = mapped_column(String(200))
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Metrics (stored as JSONB)
    metrics: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Video fields (optional - for video posts)
    video_id: Mapped[str | None] = mapped_column(String(20), nullable=True)
    video_duration: Mapped[str | None] = mapped_column(String(20), nullable=True)
    video_view_count: Mapped[str | None] = mapped_column(String(30), nullable=True)
    video_thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_video: Mapped[bool] = mapped_column(default=False)

    # Display order (for sorting)
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    def __repr__(self) -> str:
        return f"<TechPost {self.id} week={self.week_id}>"
