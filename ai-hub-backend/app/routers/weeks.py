"""
Week navigation endpoints with daily support.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Week
from app.schemas import WeekResponse, WeeksResponse, DayEntry
from app.services.period_utils import current_week_id, current_day_id

router = APIRouter(prefix="/weeks", tags=["weeks"])

# Weekday names for day pills
WEEKDAY_NAMES_DE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]


def _build_day_entries(db: Session, week_id: str, today_id: str) -> list[DayEntry]:
    """Query child days for a week and build DayEntry list."""
    days = (
        db.query(Week)
        .filter(Week.parent_week_id == week_id, Week.period_type == "day")
        .order_by(Week.sort_date)
        .all()
    )
    result = []
    for day in days:
        weekday_idx = day.sort_date.weekday()  # 0=Mon, 6=Sun
        result.append(
            DayEntry(
                id=day.id,
                label=day.label,
                weekday=WEEKDAY_NAMES_DE[weekday_idx],
                current=(day.id == today_id),
            )
        )
    return result


@router.get("", response_model=WeeksResponse)
def get_weeks(db: Session = Depends(get_db)):
    """Get list of all available weeks (with nested days), newest first."""
    weeks = (
        db.query(Week)
        .filter(Week.period_type == "week")
        .order_by(Week.sort_date.desc())
        .all()
    )
    current_wk = current_week_id()
    today_id = current_day_id()

    response_weeks = []
    for week in weeks:
        day_entries = _build_day_entries(db, week.id, today_id)
        response_weeks.append(
            WeekResponse(
                id=week.id,
                label=week.label,
                year=week.year,
                weekNum=week.week_num,
                dateRange=week.date_range,
                current=any(day.current for day in day_entries) or week.id == current_wk,
                periodType=week.period_type or "week",
                days=day_entries,
            )
        )

    return WeeksResponse(weeks=response_weeks)


@router.get("/current", response_model=WeekResponse)
def get_current_week(db: Session = Depends(get_db)):
    """Get the current week based on today's date."""
    current_wk = current_week_id()
    today_id = current_day_id()
    week = db.query(Week).filter(Week.id == current_wk).first()

    if not week:
        week = (
            db.query(Week)
            .filter(Week.period_type == "week")
            .order_by(Week.sort_date.desc())
            .first()
        )

    if not week:
        raise HTTPException(status_code=404, detail="No weeks available")

    days = _build_day_entries(db, week.id, today_id)

    return WeekResponse(
        id=week.id,
        label=week.label,
        year=week.year,
        weekNum=week.week_num,
        dateRange=week.date_range,
        current=True,
        periodType=week.period_type or "week",
        days=days,
    )


@router.get("/{week_id}", response_model=WeekResponse)
def get_week(week_id: str, db: Session = Depends(get_db)):
    """Get a specific week by ID."""
    week = db.query(Week).filter(Week.id == week_id).first()

    if not week:
        raise HTTPException(status_code=404, detail=f"Week {week_id} not found")

    today_id = current_day_id()
    days = _build_day_entries(db, week.id, today_id)

    return WeekResponse(
        id=week.id,
        label=week.label,
        year=week.year,
        weekNum=week.week_num,
        dateRange=week.date_range,
        current=(week.id == current_week_id()),
        periodType=week.period_type or "week",
        days=days,
    )
