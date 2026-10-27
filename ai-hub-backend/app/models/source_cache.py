"""Regenerable RSS cache, independent of publicly visible edition rows."""
from datetime import datetime

from sqlalchemy import String, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SourceCache(Base):
    __tablename__ = "source_cache"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    published_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    payload: Mapped[dict] = mapped_column(JSONB)


class SourceHealth(Base):
    __tablename__ = "source_health"
    name: Mapped[str] = mapped_column(String(200), primary_key=True)
    checked_at: Mapped[datetime] = mapped_column(DateTime)
    report: Mapped[dict] = mapped_column(JSONB)
