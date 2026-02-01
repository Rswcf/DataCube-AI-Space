"""
AI Hub Backend - FastAPI Application

Main entry point for the API server.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db
from app.routers import (
    weeks_router,
    tech_router,
    investment_router,
    tips_router,
    trends_router,
    videos_router,
    admin_router,
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
        },
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}
