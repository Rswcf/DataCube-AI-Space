"""
Shared utilities for period ID handling (weekly and daily).
"""

import re
from datetime import datetime, timedelta, date as date_type
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Week


def is_daily_id(period_id: str) -> bool:
    """Check if period_id is daily format YYYY-MM-DD."""
    return bool(re.match(r"^\d{4}-\d{2}-\d{2}$", period_id))


def current_day_id() -> str:
    """Return today's date as 'YYYY-MM-DD'."""
    settings = get_settings()
    return datetime.now(ZoneInfo(settings.app_timezone)).strftime("%Y-%m-%d")


def current_week_id() -> str:
    """Return the current ISO week as '2025-kw04' format."""
    settings = get_settings()
    now = datetime.now(ZoneInfo(settings.app_timezone))
    year, week, _ = now.isocalendar()
    return f"{year}-kw{week:02d}"


def day_to_week_id(day_id: str) -> str:
    """Convert '2026-02-07' to its parent ISO week '2026-kw06'."""
    d = datetime.strptime(day_id, "%Y-%m-%d")
    year, week, _ = d.isocalendar()
    return f"{year}-kw{week:02d}"


def week_date_range(year: int, week: int) -> str:
    """Return date range string like '20.01 - 26.01' for a given ISO week."""
    jan4 = datetime(year, 1, 4)
    start = jan4 + timedelta(weeks=week - 1, days=-jan4.weekday())
    end = start + timedelta(days=6)
    return f"{start.day:02d}.{start.month:02d} - {end.day:02d}.{end.month:02d}"


def ensure_period(db: Session, week_id: str, is_current: bool = True) -> Week:
    """
    Ensure a period (week or day) exists in the database, creating it if needed.

    For daily IDs, also ensures the parent week exists.
    """
    week = db.query(Week).filter(Week.id == week_id).first()
    if week:
        return week

    if is_daily_id(week_id):
        d = datetime.strptime(week_id, "%Y-%m-%d")
        parent_week_id = day_to_week_id(week_id)
        ensure_period(db, parent_week_id, is_current=False)

        if is_current:
            db.query(Week).update({Week.is_current: False})

        week = Week(
            id=week_id,
            label=f"{d.day:02d}.{d.month:02d}.",
            year=d.year,
            week_num=None,
            date_range=f"{d.day:02d}.{d.month:02d}.{d.year}",
            is_current=is_current,
            period_type="day",
            sort_date=date_type(d.year, d.month, d.day),
            parent_week_id=parent_week_id,
        )
    else:
        parts = week_id.split("-kw")
        year = int(parts[0])
        week_num = int(parts[1])
        jan4 = datetime(year, 1, 4)
        week_start = jan4 + timedelta(weeks=week_num - 1, days=-jan4.weekday())

        if is_current:
            db.query(Week).update({Week.is_current: False})

        week = Week(
            id=week_id,
            label=f"KW {week_num:02d}",
            year=year,
            week_num=week_num,
            date_range=week_date_range(year, week_num),
            is_current=is_current,
            period_type="week",
            sort_date=week_start.date(),
            parent_week_id=None,
        )

    db.add(week)
    db.commit()
    return week
