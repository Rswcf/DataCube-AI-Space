"""
Investment feed schemas.
"""

from typing import Optional
from pydantic import BaseModel

from app.schemas.common import Author, Metrics


class PrimaryMarketResponse(BaseModel):
    """A funding round post."""

    id: int
    author: Author
    content: str
    company: str
    amount: str
    round: str
    investors: list[str]
    valuation: Optional[str] = None
    timestamp: str
    metrics: Metrics
    sourceUrl: Optional[str] = None

    class Config:
        from_attributes = True


class SecondaryMarketResponse(BaseModel):
    """A stock movement post."""

    id: int
    author: Author
    content: str
    ticker: str
    price: str
    change: str
    direction: str  # "up" or "down"
    marketCap: Optional[str] = None
    timestamp: str
    metrics: Metrics
    sourceUrl: Optional[str] = None

    class Config:
        from_attributes = True


class MAResponse(BaseModel):
    """An M&A deal post."""

    id: int
    author: Author
    content: str
    acquirer: str
    target: str
    dealValue: Optional[str] = None
    dealType: str
    timestamp: str
    metrics: Metrics
    sourceUrl: Optional[str] = None

    class Config:
        from_attributes = True


class InvestmentCategoryResponse(BaseModel):
    """Bilingual category response."""

    de: list
    en: list


class InvestmentFeedResponse(BaseModel):
    """Full investment feed response with all categories."""

    primaryMarket: dict  # {"de": [...], "en": [...]}
    secondaryMarket: dict
    ma: dict
