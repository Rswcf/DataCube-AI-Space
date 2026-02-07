"""
Week-related schemas with daily support.
"""

from typing import Optional

from pydantic import BaseModel


class DayEntry(BaseModel):
    """A day within a week, for the hierarchical navigation."""

    id: str
    label: str
    weekday: str
    current: bool


class WeekResponse(BaseModel):
    """A week entry for navigation, with optional child days."""

    id: str
    label: str
    year: int
    weekNum: Optional[int] = None
    dateRange: str
    current: bool
    periodType: str = "week"
    days: list[DayEntry] = []

    class Config:
        from_attributes = True


class WeeksResponse(BaseModel):
    """Response containing list of weeks."""

    weeks: list[WeekResponse]
