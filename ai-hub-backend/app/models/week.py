"""
Week model for tracking available data weeks.
"""

from datetime import date as date_type
from typing import Optional

from sqlalchemy import String, Boolean, Integer, ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Week(Base):
    """A week of collected data."""

    __tablename__ = "weeks"

    id: Mapped[str] = mapped_column(String(10), primary_key=True)  # '2025-kw04'
    label: Mapped[str] = mapped_column(String(20))
    year: Mapped[int] = mapped_column(Integer)
    week_num: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    date_range: Mapped[str] = mapped_column(String(20))
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    period_type: Mapped[str] = mapped_column(String(10), default="week")
    sort_date: Mapped[date_type] = mapped_column(Date)
    parent_week_id: Mapped[Optional[str]] = mapped_column(
        String(10), ForeignKey("weeks.id"), nullable=True
    )

    def __repr__(self) -> str:
        return f"<Week {self.id}>"
