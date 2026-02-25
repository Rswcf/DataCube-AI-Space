"""
AI Hub Backend - FastAPI Application

Main entry point for the API server.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import (
    weeks_router,
    tech_router,
    investment_router,
    tips_router,
    trends_router,
    videos_router,
    admin_router,
    stock_router,
    developer_router,
    jobs_router,
    stripe_router,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown."""
    logger.info("Starting AI Hub API...")
    yield
    logger.info("Shutting down AI Hub API...")


settings = get_settings()

app = FastAPI(
    title="AI Hub API",
    description="Backend API for the AI Information Hub - bilingual AI news aggregator",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(weeks_router, prefix="/api")
app.include_router(tech_router, prefix="/api")
app.include_router(investment_router, prefix="/api")
app.include_router(tips_router, prefix="/api")
app.include_router(trends_router, prefix="/api")
app.include_router(videos_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(stock_router, prefix="/api")
app.include_router(developer_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(stripe_router, prefix="/api")


# ---------------------------------------------------------------------------
# Rate-limiting middleware for developer API keys
# ---------------------------------------------------------------------------

@app.middleware("http")
async def developer_rate_limit_middleware(request, call_next):
    """
    Check developer API key rate limits on public data endpoints.

    Only applies when an X-API-Key header is present and matches a developer key.
    Requests without a key (e.g. from the frontend) pass through unchanged.
    """
    path = request.url.path
    public_prefixes = (
        "/api/weeks", "/api/tech/", "/api/investment/", "/api/tips/",
        "/api/trends/", "/api/videos/", "/api/stock/",
    )
    if any(path.startswith(p) for p in public_prefixes):
        api_key_header = request.headers.get("X-API-Key")
        if api_key_header:
            from app.routers.developer import check_developer_rate_limit
            from app.database import get_session_local
            db = get_session_local()()
            try:
                check_developer_rate_limit(request, db)
            except Exception as exc:
                from fastapi.responses import JSONResponse
                if hasattr(exc, "status_code"):
                    return JSONResponse(
                        status_code=exc.status_code,
                        content={"detail": exc.detail},
                    )
                raise
            finally:
                db.close()

    response = await call_next(request)
    return response


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "AI Hub API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "weeks": "/api/weeks",
            "tech": "/api/tech/{weekId}",
            "investment": "/api/investment/{weekId}",
            "tips": "/api/tips/{weekId}",
            "trends": "/api/trends/{weekId}",
            "videos": "/api/videos/{weekId}",
            "stock": "/api/stock/{ticker}",
            "stockBatch": "/api/stock/batch/?tickers=AAPL,NVDA",
            "jobs": "/api/jobs",
            "developerRegister": "/api/developer/register",
            "developerUsage": "/api/developer/usage",
        },
    }


@app.get("/health")
async def health():
    """Health check endpoint — verifies database connectivity."""
    try:
        from sqlalchemy import text
        from app.database import get_engine
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": "disconnected"},
        )
