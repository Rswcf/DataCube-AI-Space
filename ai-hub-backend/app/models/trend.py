"""
Trend and team member models.
"""

from sqlalchemy import String, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Trend(Base):
    """A trending topic for the week."""

    __tablename__ = "trends"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    week_id: Mapped[str] = mapped_column(String(10), ForeignKey("weeks.id"), index=True)

    # Bilingual content
    category_de: Mapped[str] = mapped_column(String(50))  # "KI · Trend"
    category_en: Mapped[str] = mapped_column(String(50))  # "AI · Trending"
    title_de: Mapped[str] = mapped_column(String(200))
    title_en: Mapped[str] = mapped_column(String(200))

    # Optional post count
    posts: Mapped[int | None] = mapped_column(Integer, nullable=True)

    def __repr__(self) -> str:
        return f"<Trend {self.title_en}>"


class TeamMember(Base):
    """A team member displayed in the sidebar."""

    __tablename__ = "team_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Bilingual content
    name: Mapped[str] = mapped_column(String(100))
    role_de: Mapped[str] = mapped_column(String(100))
    role_en: Mapped[str] = mapped_column(String(100))
    handle: Mapped[str] = mapped_column(String(50))
    avatar: Mapped[str] = mapped_column(String(10))  # 2-letter abbreviation

    def __repr__(self) -> str:
        return f"<TeamMember {self.name}>"
