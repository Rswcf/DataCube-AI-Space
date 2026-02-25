"""
Developer API key model for rate-limited API access.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ApiKey(Base):
    """An API key issued to a developer."""

    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    api_key: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    tier: Mapped[str] = mapped_column(String(20), default="free")  # free/developer/business/enterprise
    calls_today: Mapped[int] = mapped_column(Integer, default=0)
    calls_total: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    def __repr__(self) -> str:
        return f"<ApiKey {self.email} ({self.tier})>"
