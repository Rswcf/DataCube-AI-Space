"""
Normalized deals layer — the compounding data asset behind the Funding Tracker.

Unlike the per-period news-card tables (PrimaryMarketPost/MAPost), deals rows
accumulate across periods and carry normalized numerics, evidence excerpts and
an explicit verification status. See master-execution-plan-2026-08.md (v2)
and Codex challenges C2/C3.
"""

from datetime import date as date_type, datetime

from sqlalchemy import String, Integer, Text, Date, DateTime, BigInteger, Index
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Deal(Base):
    """A single AI funding round or M&A transaction."""

    __tablename__ = "deals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # Period in which our pipeline detected the deal (not the deal's own date).
    week_id: Mapped[str] = mapped_column(String(10), index=True)
    deal_type: Mapped[str] = mapped_column(String(10), index=True)  # funding | ma

    company: Mapped[str] = mapped_column(String(300), index=True)  # target for M&A
    acquirer: Mapped[str | None] = mapped_column(String(300), nullable=True)

    round: Mapped[str | None] = mapped_column(String(100), nullable=True)
    round_category: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    ma_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # Acquisition/Merger/...
    industry: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)

    amount_raw: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Numeric value in `currency` (NO cross-currency conversion — honesty rule).
    amount_value: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)
    currency: Mapped[str | None] = mapped_column(String(8), nullable=True)
    valuation_raw: Mapped[str | None] = mapped_column(String(100), nullable=True)

    investors: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)

    announced_date: Mapped[date_type | None] = mapped_column(Date, nullable=True, index=True)

    content_en: Mapped[str] = mapped_column(Text, default="")
    # Verbatim supporting sentence from the source article (Task 0 prompts).
    evidence: Mapped[str | None] = mapped_column(Text, nullable=True)

    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # ai_extracted | legacy_unverified | verified | corrected —
    # published UI labels rows honestly.
    status: Mapped[str] = mapped_column(String(20), default="ai_extracted", index=True)

    # Stable event identity (deal_utils.deal_fingerprint) enforced by a DB
    # unique index — the cross-process dedupe backstop (Codex R2).
    fingerprint: Mapped[str | None] = mapped_column(String(32), nullable=True, unique=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_deals_type_company_date", "deal_type", "company", "announced_date"),
    )

    def __repr__(self) -> str:
        return f"<Deal {self.deal_type}:{self.company} {self.amount_raw or '?'}>"
