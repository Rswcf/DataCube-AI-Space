"""
Subscription model for premium tier management via Stripe.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database import Base


class Subscription(Base):
    """A user subscription managed via Stripe."""

    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)

    # Stripe identifiers
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(
        String(255), unique=True, nullable=True
    )
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(
        String(255), unique=True, nullable=True
    )

    # Subscription details
    tier: Mapped[str] = mapped_column(
        String(50), default="free", nullable=False
    )  # free, premium, api_developer, api_business, api_enterprise
    status: Mapped[str] = mapped_column(
        String(50), default="active", nullable=False
    )  # active, canceled, past_due, trialing

    # Billing period
    current_period_start: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    current_period_end: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<Subscription {self.id} email={self.email} tier={self.tier}>"
