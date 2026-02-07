"""
Admin endpoints for triggering data collection.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Header, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db, get_session_local
from app.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


def verify_api_key(x_api_key: str = Header(...)):
    """Verify admin API key."""
    settings = get_settings()
    if not settings.admin_api_key:
        raise HTTPException(status_code=500, detail="Admin API key not configured")
    if x_api_key != settings.admin_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True


def _run_collection_with_new_session(week_id: Optional[str] = None):
    """Background task wrapper that creates its own database session."""
    from app.services.collector import run_collection

    db = get_session_local()()
    try:
        logger.info(f"Starting background collection for {week_id or 'current week'}")
        run_collection(db, week_id)
        logger.info(f"Background collection completed for {week_id or 'current week'}")
    except Exception as e:
        logger.error(f"Background collection failed: {e}")
        raise
    finally:
        db.close()


def _run_ma_collection_with_new_session(week_id: Optional[str] = None):
    """Background task wrapper for M&A-only collection with its own session."""
    from app.services.collector import run_ma_collection

    db = get_session_local()()
    try:
        logger.info(f"Starting background M&A collection for {week_id or 'current week'}")
        run_ma_collection(db, week_id)
        logger.info(f"Background M&A collection completed for {week_id or 'current week'}")
    except Exception as e:
        logger.error(f"Background M&A collection failed: {e}")
        raise
    finally:
        db.close()


@router.delete("/period/{period_id}")
async def delete_period(
    period_id: str,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_api_key),
):
    """
    Delete a period (week or day) and all its associated data.

    For weekly IDs, child day records are deleted first (FK safety).
    Synchronous — deletion is fast.

    Requires X-API-Key header.
    """
    from app.services.collector import delete_period as do_delete

    try:
        result = do_delete(db, period_id)
        return {"status": "deleted", **result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to delete period {period_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/collect")
async def trigger_collection(
    background_tasks: BackgroundTasks,
    week_id: Optional[str] = None,
    _: bool = Depends(verify_api_key),
):
    """
    Trigger full data collection for a specific week (or current week if not specified).

    This runs all stages:
    - Stage 1: Fetch raw data from sources
    - Stage 2: LLM classification
    - Stage 3: Parallel LLM processing
    - Stage 4: Save to database

    Requires X-API-Key header.
    """
    # Run collection in background with its own session
    background_tasks.add_task(_run_collection_with_new_session, week_id)

    return {
        "status": "started",
        "week_id": week_id or "current",
        "message": "Full collection started in background (fetch + process)",
    }


@router.post("/collect/ma")
async def trigger_ma_collection(
    background_tasks: BackgroundTasks,
    week_id: Optional[str] = None,
    _: bool = Depends(verify_api_key),
):
    """
    Trigger M&A-only collection for a specific week (or current week).

    Only fetches M&A sources and updates M&A posts, leaving other sections untouched.
    Requires X-API-Key header.
    """
    background_tasks.add_task(_run_ma_collection_with_new_session, week_id)

    return {
        "status": "started",
        "week_id": week_id or "current",
        "message": "M&A collection started in background",
    }


def _run_fetch_only_with_new_session(week_id: Optional[str] = None):
    """Background task wrapper that creates its own database session."""
    from app.services.collector import run_fetch_only

    db = get_session_local()()
    try:
        logger.info(f"Starting background fetch for {week_id or 'current week'}")
        run_fetch_only(db, week_id)
        logger.info(f"Background fetch completed for {week_id or 'current week'}")
    except Exception as e:
        logger.error(f"Background fetch failed: {e}")
        raise
    finally:
        db.close()


@router.post("/collect/fetch")
async def trigger_fetch_only(
    background_tasks: BackgroundTasks,
    week_id: Optional[str] = None,
    _: bool = Depends(verify_api_key),
):
    """
    Trigger Stage 1 only: Fetch and store raw data.

    Use this to collect raw data without LLM processing.
    Useful for debugging or when you want to process later.

    Requires X-API-Key header.
    """
    # Run fetch in background with its own session
    background_tasks.add_task(_run_fetch_only_with_new_session, week_id)

    return {
        "status": "started",
        "week_id": week_id or "current",
        "message": "Fetch-only started in background (Stage 1)",
    }


def _run_process_only_with_new_session(week_id: Optional[str] = None):
    """Background task wrapper that creates its own database session."""
    from app.services.collector import run_process_only

    db = get_session_local()()
    try:
        logger.info(f"Starting background processing for {week_id or 'current week'}")
        run_process_only(db, week_id)
        logger.info(f"Background processing completed for {week_id or 'current week'}")
    except Exception as e:
        logger.error(f"Background processing failed: {e}")
        raise
    finally:
        db.close()


@router.post("/collect/process")
async def trigger_process_only(
    background_tasks: BackgroundTasks,
    week_id: Optional[str] = None,
    _: bool = Depends(verify_api_key),
):
    """
    Trigger Stages 2-4: Process existing raw data.

    Requires raw data to exist (run /collect/fetch first).
    Use this to reprocess data after LLM improvements.

    Requires X-API-Key header.
    """
    # Run processing in background with its own session
    background_tasks.add_task(_run_process_only_with_new_session, week_id)

    return {
        "status": "started",
        "week_id": week_id or "current",
        "message": "Process-only started in background (Stages 2-4)",
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
              Only allowed when ALLOW_DB_DROP=true environment variable is set.

    Requires X-API-Key header.
    """
    from app.database import Base, get_engine
    import os

    try:
        engine = get_engine()
        # SEC-H1: Gate drop=True behind environment check to prevent accidental data destruction
        if drop:
            allow_drop = os.environ.get("ALLOW_DB_DROP", "").lower() == "true"
            if not allow_drop:
                raise HTTPException(
                    status_code=403,
                    detail="Database drop not allowed. Set ALLOW_DB_DROP=true environment variable to enable."
                )
            logger.warning("Dropping all database tables (ALLOW_DB_DROP=true)")
            Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        return {"status": "success", "message": "Database tables created", "dropped": drop}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise HTTPException(status_code=500, detail="Database initialization failed")


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
