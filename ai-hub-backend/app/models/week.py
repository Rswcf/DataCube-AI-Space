"""
Week model for tracking available data weeks.
"""

from sqlalchemy import String, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Week(Base):
    """A week of collected data."""

    __tablename__ = "weeks"

    id: Mapped[str] = mapped_column(String(10), primary_key=True)  # '2025-kw04'
    label: Mapped[str] = mapped_column(String(20))  # 'KW 04'
    year: Mapped[int] = mapped_column(Integer)
    week_num: Mapped[int] = mapped_column(Integer)
    date_range: Mapped[str] = mapped_column(String(20))  # '20.01 - 26.01'
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)

    def __repr__(self) -> str:
        return f"<Week {self.id}>"
