"""Idempotency record for newsletter sends.

One row per (period_id, language). Used by send_newsletter() to
prevent duplicate emails when:
  - GitHub Actions fires both dual-DST cron slots on the same day
  - An operator manually re-triggers the admin endpoint
  - A workflow retry fires while the first run is still in progress
"""

from datetime import datetime

from sqlalchemy import String, DateTime, Integer, Text, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class NewsletterSend(Base):
    __tablename__ = "newsletter_sends"

    # Composite primary key: at most one row per (period_id, language)
    period_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    language: Mapped[str] = mapped_column(String(10), primary_key=True)

    # Status machine: in_progress -> sent | failed
    # Stale in_progress (started_at > 1h ago) is treated as releasable
    # so a crashed run can be retried.
    status: Mapped[str] = mapped_column(String(20), nullable=False)

    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("ix_newsletter_sends_period", "period_id"),
    )

    def __repr__(self) -> str:
        return f"<NewsletterSend {self.period_id}/{self.language} {self.status}>"
