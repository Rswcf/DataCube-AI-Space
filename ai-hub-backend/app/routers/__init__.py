"""
API routers for the AI Hub backend.
"""

from app.routers.weeks import router as weeks_router
from app.routers.tech import router as tech_router
from app.routers.investment import router as investment_router
from app.routers.tips import router as tips_router
from app.routers.trends import router as trends_router
from app.routers.videos import router as videos_router
from app.routers.admin import router as admin_router
from app.routers.stock import router as stock_router
from app.routers.developer import router as developer_router
from app.routers.jobs import router as jobs_router
from app.routers.stripe_webhook import router as stripe_router

__all__ = [
    "weeks_router",
    "tech_router",
    "investment_router",
    "tips_router",
    "trends_router",
    "videos_router",
    "admin_router",
    "stock_router",
    "developer_router",
    "jobs_router",
    "stripe_router",
]
