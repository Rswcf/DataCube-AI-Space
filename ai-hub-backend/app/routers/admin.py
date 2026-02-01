"""
Admin endpoints for triggering data collection.
"""

from fastapi import APIRouter, Depends, HTTPException, Header, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db, init_db
from app.config import get_settings

router = APIRouter(prefix="/admin", tags=["admin"])


def verify_api_key(x_api_key: str = Header(...)):
    """Verify admin API key."""
    settings = get_settings()
    if not settings.admin_api_key:
        raise HTTPException(status_code=500, detail="Admin API key not configured")
    if x_api_key != settings.admin_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True


@router.post("/collect")
async def trigger_collection(
    background_tasks: BackgroundTasks,
    week_id: Optional[str] = None,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_api_key),
):
    """
    Trigger data collection for a specific week (or current week if not specified).

    Requires X-API-Key header.
    """
    from app.services.collector import run_collection

    # Run collection in background
    background_tasks.add_task(run_collection, db, week_id)

    return {
        "status": "started",
        "week_id": week_id or "current",
        "message": "Collection started in background",
    }


@router.post("/migrate")
async def migrate_json_data(
    week_id: str,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_api_key),
):
    """
    Migrate existing JSON data files to the database.

    Requires X-API-Key header.
    """
    from app.services.migrator import migrate_week_data

    try:
        result = migrate_week_data(db, week_id)
        return {"status": "success", "week_id": week_id, "counts": result}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import-week")
async def import_week_data(
    week_id: str,
    tech_data: Optional[dict] = None,
    investment_data: Optional[dict] = None,
    tips_data: Optional[dict] = None,
    trends_data: Optional[dict] = None,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_api_key),
):
    """
    Import week data directly via JSON payload.

    Requires X-API-Key header.
    """
    from app.services.migrator_api import import_week_from_json

    try:
        result = import_week_from_json(
            db, week_id, tech_data, investment_data, tips_data, trends_data
        )
        return {"status": "success", "week_id": week_id, "counts": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/init-db")
async def initialize_database(
    drop: bool = False,
    _: bool = Depends(verify_api_key),
):
    """
    Initialize database tables.

    Args:
        drop: If True, drop all tables first (WARNING: data loss!)

    Requires X-API-Key header.
    """
    from app.database import Base, get_engine

    try:
        engine = get_engine()
        if drop:
            Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        return {"status": "success", "message": "Database tables created", "dropped": drop}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
