"""
Tip model for practical AI usage tips.
"""

from sqlalchemy import String, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TipPost(Base):
    """A practical AI tip post."""

    __tablename__ = "tip_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    week_id: Mapped[str] = mapped_column(String(10), ForeignKey("weeks.id"), index=True)

    # Bilingual content
    content_de: Mapped[str] = mapped_column(Text)
    content_en: Mapped[str] = mapped_column(Text)
    tip_de: Mapped[str] = mapped_column(Text)  # The actual tip/prompt
    tip_en: Mapped[str] = mapped_column(Text)
    category_de: Mapped[str] = mapped_column(String(100))
    category_en: Mapped[str] = mapped_column(String(100))

    # Classification
    platform: Mapped[str] = mapped_column(String(20))  # "X" or "Reddit"
    difficulty_de: Mapped[str] = mapped_column(String(30))  # "Anfänger", "Mittel", "Fortgeschritten"
    difficulty_en: Mapped[str] = mapped_column(String(30))  # "Beginner", "Intermediate", "Advanced"

    # Metadata
    author: Mapped[dict] = mapped_column(JSONB)
    timestamp: Mapped[str] = mapped_column(String(20))
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    metrics: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Multilingual translations (JSONB)
    translations: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    def __repr__(self) -> str:
        return f"<TipPost {self.id} week={self.week_id}>"
