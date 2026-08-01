"""
Database connection and session management.
"""

import logging
from functools import lru_cache
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import get_settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


@lru_cache
def get_engine():
    """Get cached database engine."""
    settings = get_settings()
    return create_engine(
        settings.database_url,
        pool_pre_ping=True,
        # 2026-08-01 incident: a frontend static-generation build storm
        # (13 workers × ~200 API calls × retries) exhausted the 5+10 pool and
        # wedged every request in pool.connect(). Bigger pool + short timeout
        # so overloads fail fast (503-ish) instead of hanging clients for 60s+.
        # The main fix is on the frontend (prerender set limited to recent
        # periods), this is defense in depth.
        pool_size=10,
        max_overflow=20,
        pool_timeout=10,
    )


def get_session_local():
    """Get session factory."""
    return sessionmaker(autocommit=False, autoflush=False, bind=get_engine())


def get_db():
    """Dependency that provides a database session."""
    SessionLocal = get_session_local()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables."""
    try:
        Base.metadata.create_all(bind=get_engine())
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise
