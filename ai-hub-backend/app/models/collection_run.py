"""
Persistent collection run tracking.

Replaces the in-memory _collection_status dict so that collection
state survives container restarts and is queryable for retry logic.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CollectionRun(Base):
    """Tracks the status of a data collection run for a period."""

    __tablename__ = "collection_runs"

    period_id: Mapped[str] = mapped_column(String(10), primary_key=True)
    status: Mapped[str] = mapped_column(String(20))  # running, completed, failed, empty
    stage: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    error: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    counts: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    raw_counts: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    def __repr__(self) -> str:
        return f"<CollectionRun {self.period_id} status={self.status}>"
