"""
Week navigation endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Week
from app.schemas import WeekResponse, WeeksResponse
from app.services.collector import current_week_id

router = APIRouter(prefix="/weeks", tags=["weeks"])


@router.get("", response_model=WeeksResponse)
def get_weeks(db: Session = Depends(get_db)):
    """Get list of all available weeks, newest first."""
    weeks = db.query(Week).order_by(Week.year.desc(), Week.week_num.desc()).all()
    current_wk = current_week_id()  # Dynamically compute current week based on today's date

    return WeeksResponse(
        weeks=[
            WeekResponse(
                id=w.id,
                label=w.label,
                year=w.year,
                weekNum=w.week_num,
                dateRange=w.date_range,
                current=(w.id == current_wk),  # Dynamic comparison instead of DB field
            )
            for w in weeks
        ]
    )


@router.get("/current", response_model=WeekResponse)
def get_current_week(db: Session = Depends(get_db)):
    """Get the current week based on today's date."""
    current_wk = current_week_id()  # Dynamically compute current week
    week = db.query(Week).filter(Week.id == current_wk).first()

    if not week:
        # Fall back to most recent week if current week has no data
        week = db.query(Week).order_by(Week.year.desc(), Week.week_num.desc()).first()

    if not week:
        raise HTTPException(status_code=404, detail="No weeks available")

    return WeekResponse(
        id=week.id,
        label=week.label,
        year=week.year,
        weekNum=week.week_num,
        dateRange=week.date_range,
        current=(week.id == current_wk),  # Dynamic comparison
    )


@router.get("/{week_id}", response_model=WeekResponse)
def get_week(week_id: str, db: Session = Depends(get_db)):
    """Get a specific week by ID."""
    week = db.query(Week).filter(Week.id == week_id).first()

    if not week:
        raise HTTPException(status_code=404, detail=f"Week {week_id} not found")

    current_wk = current_week_id()  # Dynamically compute current week

    return WeekResponse(
        id=week.id,
        label=week.label,
        year=week.year,
        weekNum=week.week_num,
        dateRange=week.date_range,
        current=(week.id == current_wk),  # Dynamic comparison
    )
