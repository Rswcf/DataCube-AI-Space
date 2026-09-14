"""Public newsletter endpoints: RFC 8058 one-click unsubscribe (spec AD3)."""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import get_settings
from app.services.beehiiv import BeehiivError, unsubscribe_subscription
from app.services.unsubscribe_tokens import verification_keys, verify_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/newsletter", tags=["newsletter"])


class UnsubscribeRequest(BaseModel):
    token: str = Field(..., max_length=200)


@router.post("/unsubscribe")
def unsubscribe(body: UnsubscribeRequest):
    """Unsubscribe the subscription named by a signed token. Idempotent."""
    settings = get_settings()
    keys = verification_keys(settings)
    if not keys or not settings.beehiiv_api_key or not settings.beehiiv_publication_id:
        logger.error("One-click unsubscribe unavailable: SIGNING_SECRET or Beehiiv settings missing")
        raise HTTPException(status_code=503, detail="unsubscribe_unavailable")

    subscription_id = verify_token(body.token, keys)
    if subscription_id is None:
        raise HTTPException(status_code=400, detail="invalid_token")

    try:
        outcome = unsubscribe_subscription(
            settings.beehiiv_api_key, settings.beehiiv_publication_id, subscription_id
        )
    except (BeehiivError, OSError) as exc:
        logger.error(f"One-click unsubscribe failed: {exc}")
        raise HTTPException(status_code=502, detail="unsubscribe_failed")

    logger.info(f"One-click unsubscribe processed ({outcome})")
    return {"status": "unsubscribed"}
