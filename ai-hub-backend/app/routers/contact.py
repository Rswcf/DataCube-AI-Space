"""Public contact form endpoint: POST /api/contact → email to CONTACT_INBOX via Resend."""

import logging

import resend
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from app.config import get_settings
from app.services.rate_limit import SlidingWindowLimiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contact", tags=["contact"])

# Resend Free allows 100 emails/day, shared with the newsletter.
DAILY_CONTACT_EMAIL_CAP = 20
_per_ip = SlidingWindowLimiter(limit=3, window_seconds=3600)
_daily = SlidingWindowLimiter(limit=DAILY_CONTACT_EMAIL_CAP, window_seconds=86400)


class ContactRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    company: str = Field("", max_length=160)
    message: str = Field("", max_length=5000)
    website: str = Field("", max_length=200)  # honeypot: hidden from people, filled by bots


def _client_ip(request: Request) -> str:
    # Trust the LAST X-Forwarded-For entry: Railway's ingress appends it, while
    # earlier entries are caller-controlled (same rule as routers/deals.py).
    hops = [hop.strip() for hop in request.headers.get("x-forwarded-for", "").split(",") if hop.strip()]
    if hops:
        return hops[-1]
    return request.client.host if request.client else "unknown"


def _one_line(value: str) -> str:
    return " ".join(value.split())


@router.post("", status_code=202)
def submit_contact(body: ContactRequest, request: Request):
    """Forward a contact message to the inbox; replies go straight to the visitor."""
    if body.website.strip():
        return {"status": "received"}  # honeypot hit: answer like a success, send nothing

    settings = get_settings()
    if not settings.resend_api_key or not settings.contact_inbox:
        raise HTTPException(status_code=503, detail="contact_unavailable")

    if not _per_ip.allow(_client_ip(request)) or not _daily.allow("all"):
        raise HTTPException(status_code=429, detail="rate_limited")

    name = _one_line(body.name)
    company = _one_line(body.company)
    subject = f"[Contact] {name}" + (f" ({company})" if company else "")
    text = (
        f"Name: {name}\n"
        f"Email: {body.email}\n"
        f"Company: {company or '-'}\n\n"
        f"{body.message.strip() or '(no message)'}\n"
    )

    resend.api_key = settings.resend_api_key
    try:
        result = resend.Emails.send({
            "from": settings.newsletter_from_email,
            "to": [settings.contact_inbox],
            "reply_to": body.email,
            "subject": subject[:200],
            "text": text,
        })
    except Exception as exc:
        logger.error(f"Contact message could not be sent: {type(exc).__name__}")
        raise HTTPException(status_code=502, detail="contact_failed")

    logger.info(f"Contact message accepted by Resend (id={(result or {}).get('id')})")
    return {"status": "received"}
