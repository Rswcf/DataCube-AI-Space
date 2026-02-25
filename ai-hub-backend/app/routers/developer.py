"""
Developer API endpoints for API key management and usage tracking.
"""

import logging
import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.developer import ApiKey

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/developer", tags=["developer"])

# Rate limits per tier (requests per day)
TIER_LIMITS = {
    "free": 100,
    "developer": 1_000,
    "business": 10_000,
    "enterprise": None,  # unlimited
}


def _generate_api_key() -> str:
    """Generate a new API key in the format dcai_ + 32 hex chars."""
    return "dcai_" + secrets.token_hex(16)


def _get_api_key_record(
    db: Session, x_api_key: str = Header(..., alias="X-API-Key"),
) -> ApiKey:
    """Dependency to verify and return the developer API key record."""
    record = db.query(ApiKey).filter(ApiKey.api_key == x_api_key).first()
    if not record:
        raise HTTPException(status_code=401, detail="Invalid API key")
    if not record.is_active:
        raise HTTPException(status_code=403, detail="API key is deactivated")
    return record


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: EmailStr
    name: str


class RegisterResponse(BaseModel):
    api_key: str
    tier: str
    daily_limit: int
    message: str


class UsageResponse(BaseModel):
    email: str
    name: str
    tier: str
    calls_today: int
    calls_total: int
    daily_limit: Optional[int]
    created_at: str
    last_used_at: Optional[str]


class RotateKeyResponse(BaseModel):
    new_api_key: str
    message: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/register", response_model=RegisterResponse)
def register_api_key(body: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register for a free API key.

    Provide your email and name to receive an API key immediately.
    Each email can register one active API key.
    """
    # Check if email already has an active key
    existing = (
        db.query(ApiKey)
        .filter(ApiKey.email == body.email, ApiKey.is_active == True)  # noqa: E712
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="An active API key already exists for this email. "
                   "Use POST /api/developer/rotate-key to generate a new key.",
        )

    api_key = _generate_api_key()
    record = ApiKey(
        email=body.email,
        name=body.name,
        api_key=api_key,
        tier="free",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    logger.info(f"New API key registered for {body.email}")
    return RegisterResponse(
        api_key=api_key,
        tier="free",
        daily_limit=TIER_LIMITS["free"],
        message="API key created successfully. Include it as X-API-Key header in your requests.",
    )


@router.get("/usage", response_model=UsageResponse)
def get_usage(
    db: Session = Depends(get_db),
    record: ApiKey = Depends(_get_api_key_record),
):
    """
    Get current API usage statistics.

    Requires X-API-Key header.
    """
    limit = TIER_LIMITS.get(record.tier)
    return UsageResponse(
        email=record.email,
        name=record.name,
        tier=record.tier,
        calls_today=record.calls_today,
        calls_total=record.calls_total,
        daily_limit=limit,
        created_at=record.created_at.isoformat(),
        last_used_at=record.last_used_at.isoformat() if record.last_used_at else None,
    )


@router.post("/rotate-key", response_model=RotateKeyResponse)
def rotate_api_key(
    db: Session = Depends(get_db),
    record: ApiKey = Depends(_get_api_key_record),
):
    """
    Rotate (regenerate) your API key.

    The old key is deactivated and a new one is created with the same
    tier and usage history. Requires current X-API-Key header.
    """
    # Deactivate old key
    record.is_active = False
    db.flush()

    # Create new key with same settings
    new_key = _generate_api_key()
    new_record = ApiKey(
        email=record.email,
        name=record.name,
        api_key=new_key,
        tier=record.tier,
        calls_total=record.calls_total,
    )
    db.add(new_record)
    db.commit()

    logger.info(f"API key rotated for {record.email}")
    return RotateKeyResponse(
        new_api_key=new_key,
        message="New API key generated. The old key has been deactivated.",
    )


# ---------------------------------------------------------------------------
# Rate-limiting middleware helper
# ---------------------------------------------------------------------------

def check_developer_rate_limit(request: Request, db: Session) -> Optional[ApiKey]:
    """
    Check rate limit for developer API keys.

    Called from the rate-limiting middleware on public endpoints.
    Returns the ApiKey record if a key is provided, or None if no key is present
    (anonymous requests are not rate-limited — they serve the frontend).

    Raises HTTPException(429) if the daily limit is exceeded.
    """
    api_key_header = request.headers.get("X-API-Key")
    if not api_key_header:
        return None

    # Ignore admin API keys (they are not developer keys)
    from app.config import get_settings
    settings = get_settings()
    if api_key_header == settings.admin_api_key:
        return None

    record = db.query(ApiKey).filter(ApiKey.api_key == api_key_header).first()
    if not record:
        raise HTTPException(status_code=401, detail="Invalid API key")
    if not record.is_active:
        raise HTTPException(status_code=403, detail="API key is deactivated")

    # Check tier limit
    limit = TIER_LIMITS.get(record.tier)
    if limit is not None and record.calls_today >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Daily rate limit exceeded ({limit} calls/day for {record.tier} tier). "
                   f"Upgrade your plan at https://www.datacubeai.space/pricing",
        )

    # Increment counters
    record.calls_today += 1
    record.calls_total += 1
    record.last_used_at = datetime.utcnow()
    db.commit()

    return record
