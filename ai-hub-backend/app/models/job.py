"""
Job listing model for the AI job board.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Text, Boolean, DateTime, ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class JobListing(Base):
    """A job listing on the AI job board."""

    __tablename__ = "job_listings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200))
    company: Mapped[str] = mapped_column(String(200))
    location: Mapped[str] = mapped_column(String(200))
    job_type: Mapped[str] = mapped_column(String(50))  # full-time, part-time, contract, remote
    level: Mapped[str] = mapped_column(String(50))  # junior, mid, senior, lead
    salary_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    salary_currency: Mapped[str] = mapped_column(String(10), default="EUR")
    description: Mapped[str] = mapped_column(Text)
    requirements: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), nullable=True)
    apply_url: Mapped[str] = mapped_column(Text)
    company_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    listing_type: Mapped[str] = mapped_column(String(20), default="standard")  # standard, featured, premium
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    posted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    contact_email: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<JobListing {self.id} title={self.title!r}>"
