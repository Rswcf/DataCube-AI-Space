"""
Investment-related models for funding, stock, and M&A data.
"""

from sqlalchemy import String, Integer, Text, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PrimaryMarketPost(Base):
    """A funding round / venture capital post."""

    __tablename__ = "primary_market_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    week_id: Mapped[str] = mapped_column(String(10), ForeignKey("weeks.id"), index=True)

    # Bilingual content
    content_de: Mapped[str] = mapped_column(Text)
    content_en: Mapped[str] = mapped_column(Text)

    # Deal info
    company: Mapped[str] = mapped_column(String(200))
    amount_de: Mapped[str] = mapped_column(String(50))  # "$2,75 Mrd."
    amount_en: Mapped[str] = mapped_column(String(50))  # "$2.75B"
    round: Mapped[str] = mapped_column(String(50))  # "Series D"
    # Funding round category for filtering: Early, Series A, Series B, Series C+, Late/PE, Unknown
    round_category: Mapped[str | None] = mapped_column(String(20), nullable=True)
    investors: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    valuation_de: Mapped[str | None] = mapped_column(String(50), nullable=True)
    valuation_en: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Metadata
    author: Mapped[dict] = mapped_column(JSONB)
    timestamp: Mapped[str] = mapped_column(String(20))
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    metrics: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Multilingual translations (JSONB)
    translations: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    def __repr__(self) -> str:
        return f"<PrimaryMarketPost {self.company} {self.round}>"


class SecondaryMarketPost(Base):
    """A stock market movement post."""

    __tablename__ = "secondary_market_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    week_id: Mapped[str] = mapped_column(String(10), ForeignKey("weeks.id"), index=True)

    # Bilingual content
    content_de: Mapped[str] = mapped_column(Text)
    content_en: Mapped[str] = mapped_column(Text)

    # Stock info
    ticker: Mapped[str] = mapped_column(String(100))
    price: Mapped[str] = mapped_column(String(100))
    change: Mapped[str] = mapped_column(String(100))  # "+5.2%" or "Zweistelliger Rückgang"
    direction: Mapped[str] = mapped_column(String(20))  # "up" or "down"
    market_cap_de: Mapped[str | None] = mapped_column(String(100), nullable=True)
    market_cap_en: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Metadata
    author: Mapped[dict] = mapped_column(JSONB)
    timestamp: Mapped[str] = mapped_column(String(20))
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    metrics: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Multilingual translations (JSONB)
    translations: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    def __repr__(self) -> str:
        return f"<SecondaryMarketPost {self.ticker}>"


class MAPost(Base):
    """A merger & acquisition post."""

    __tablename__ = "ma_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    week_id: Mapped[str] = mapped_column(String(10), ForeignKey("weeks.id"), index=True)

    # Bilingual content
    content_de: Mapped[str] = mapped_column(Text)
    content_en: Mapped[str] = mapped_column(Text)

    # Deal info
    acquirer: Mapped[str] = mapped_column(String(200))
    target: Mapped[str] = mapped_column(String(200))
    deal_value_de: Mapped[str | None] = mapped_column(Text, nullable=True)
    deal_value_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    deal_type_de: Mapped[str] = mapped_column(String(50))  # "Akquisition"
    deal_type_en: Mapped[str] = mapped_column(String(50))  # "Acquisition"
    # Industry category for filtering: Healthcare, FinTech, Enterprise, Consumer, Other
    industry: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Metadata
    author: Mapped[dict] = mapped_column(JSONB)
    timestamp: Mapped[str] = mapped_column(String(20))
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    metrics: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Multilingual translations (JSONB)
    translations: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    def __repr__(self) -> str:
        return f"<MAPost {self.acquirer} -> {self.target}>"
