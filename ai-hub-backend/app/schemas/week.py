"""
Week-related schemas.
"""

from pydantic import BaseModel


class WeekResponse(BaseModel):
    """A week entry for navigation."""

    id: str  # e.g., "2025-kw04"
    label: str  # e.g., "KW 04"
    year: int
    weekNum: int
    dateRange: str  # e.g., "20.01 - 26.01"
    current: bool

    class Config:
        from_attributes = True


class WeeksResponse(BaseModel):
    """Response containing list of weeks."""

    weeks: list[WeekResponse]
