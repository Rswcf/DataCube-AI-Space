"""
Stripe webhook and checkout endpoints for subscription management.
"""

import logging
from datetime import datetime
from typing import Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.subscription import Subscription

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stripe", tags=["stripe"])


# ---------------------------------------------------------------------------
# Pydantic request/response schemas
# ---------------------------------------------------------------------------

class CheckoutRequest(BaseModel):
    email: str
    tier: str  # premium, api_developer, api_business


class CheckoutResponse(BaseModel):
    url: str


class CancelRequest(BaseModel):
    email: str


class SubscriptionStatusResponse(BaseModel):
    email: str
    tier: str
    status: str
    current_period_end: Optional[str] = None
    cancel_at_period_end: bool = False


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_stripe():
    """Configure and return the stripe module."""
    settings = get_settings()
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Stripe is not configured")
    stripe.api_key = settings.stripe_secret_key
    return stripe


def _price_id_for_tier(tier: str) -> str:
    """Resolve a tier name to a Stripe Price ID."""
    settings = get_settings()
    mapping = {
        "premium": settings.stripe_premium_price_id,
        "api_developer": settings.stripe_api_developer_price_id,
        "api_business": settings.stripe_api_business_price_id,
    }
    price_id = mapping.get(tier)
    if not price_id:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown tier or price not configured: {tier}",
        )
    return price_id


def _get_or_create_subscription(db: Session, email: str) -> Subscription:
    """Return existing subscription row or create a free one."""
    sub = db.query(Subscription).filter(Subscription.email == email).first()
    if not sub:
        sub = Subscription(email=email, tier="free", status="active")
        db.add(sub)
        db.flush()
    return sub


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Stripe webhook handler.

    Verifies the Stripe signature using the raw request body, then processes
    the event. No auth header required -- authentication is via Stripe
    signature verification.
    """
    settings = get_settings()
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Stripe webhook secret not configured")

    _get_stripe()  # ensure api_key is set

    # Read the raw body for signature verification
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing Stripe signature header")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except stripe.error.SignatureVerificationError:
        logger.warning("Stripe webhook signature verification failed")
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        raise HTTPException(status_code=400, detail="Webhook error")

    event_type = event["type"]
    data_object = event["data"]["object"]
    logger.info(f"Stripe webhook received: {event_type}")

    # ------------------------------------------------------------------
    # checkout.session.completed
    # ------------------------------------------------------------------
    if event_type == "checkout.session.completed":
        customer_email = data_object.get("customer_email") or data_object.get(
            "customer_details", {}
        ).get("email")
        customer_id = data_object.get("customer")
        subscription_id = data_object.get("subscription")
        tier = data_object.get("metadata", {}).get("tier", "premium")

        if customer_email:
            sub = _get_or_create_subscription(db, customer_email)
            sub.stripe_customer_id = customer_id
            sub.stripe_subscription_id = subscription_id
            sub.tier = tier
            sub.status = "active"
            db.commit()
            logger.info(
                f"Checkout completed: {customer_email} -> tier={tier}"
            )

    # ------------------------------------------------------------------
    # customer.subscription.updated
    # ------------------------------------------------------------------
    elif event_type == "customer.subscription.updated":
        subscription_id = data_object.get("id")
        sub = (
            db.query(Subscription)
            .filter(Subscription.stripe_subscription_id == subscription_id)
            .first()
        )
        if sub:
            sub.status = data_object.get("status", sub.status)
            sub.cancel_at_period_end = data_object.get(
                "cancel_at_period_end", False
            )
            period_start = data_object.get("current_period_start")
            period_end = data_object.get("current_period_end")
            if period_start:
                sub.current_period_start = datetime.utcfromtimestamp(period_start)
            if period_end:
                sub.current_period_end = datetime.utcfromtimestamp(period_end)
            db.commit()
            logger.info(
                f"Subscription updated: {sub.email} status={sub.status}"
            )

    # ------------------------------------------------------------------
    # customer.subscription.deleted
    # ------------------------------------------------------------------
    elif event_type == "customer.subscription.deleted":
        subscription_id = data_object.get("id")
        sub = (
            db.query(Subscription)
            .filter(Subscription.stripe_subscription_id == subscription_id)
            .first()
        )
        if sub:
            sub.status = "canceled"
            sub.tier = "free"
            db.commit()
            logger.info(f"Subscription canceled: {sub.email}")

    # ------------------------------------------------------------------
    # invoice.payment_failed
    # ------------------------------------------------------------------
    elif event_type == "invoice.payment_failed":
        subscription_id = data_object.get("subscription")
        if subscription_id:
            sub = (
                db.query(Subscription)
                .filter(Subscription.stripe_subscription_id == subscription_id)
                .first()
            )
            if sub:
                sub.status = "past_due"
                db.commit()
                logger.info(f"Payment failed: {sub.email} -> past_due")

    return {"status": "ok"}


@router.post("/create-checkout", response_model=CheckoutResponse)
async def create_checkout(
    body: CheckoutRequest,
    db: Session = Depends(get_db),
):
    """
    Create a Stripe Checkout Session.

    Accepts an email and tier, creates or retrieves a Stripe Customer,
    and returns the Checkout Session URL for redirect.
    """
    s = _get_stripe()
    price_id = _price_id_for_tier(body.tier)

    # Find or create customer in Stripe
    existing = (
        db.query(Subscription)
        .filter(Subscription.email == body.email)
        .first()
    )
    customer_id = existing.stripe_customer_id if existing else None

    if not customer_id:
        # Search Stripe for existing customer by email
        customers = s.Customer.list(email=body.email, limit=1)
        if customers.data:
            customer_id = customers.data[0].id
        else:
            customer = s.Customer.create(email=body.email)
            customer_id = customer.id

        # Persist the customer ID locally
        sub = _get_or_create_subscription(db, body.email)
        sub.stripe_customer_id = customer_id
        db.commit()

    try:
        session = s.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url="https://www.datacubeai.space/premium?success=true",
            cancel_url="https://www.datacubeai.space/premium?canceled=true",
            metadata={"tier": body.tier},
            subscription_data={"trial_period_days": 7},
        )
    except Exception as e:
        logger.error(f"Stripe checkout session creation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")

    return CheckoutResponse(url=session.url)


@router.get("/subscription/{email}", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    email: str,
    db: Session = Depends(get_db),
):
    """Get the current subscription status for an email address."""
    sub = db.query(Subscription).filter(Subscription.email == email).first()
    if not sub:
        return SubscriptionStatusResponse(
            email=email,
            tier="free",
            status="active",
            cancel_at_period_end=False,
        )
    return SubscriptionStatusResponse(
        email=sub.email,
        tier=sub.tier,
        status=sub.status,
        current_period_end=(
            sub.current_period_end.isoformat() if sub.current_period_end else None
        ),
        cancel_at_period_end=sub.cancel_at_period_end,
    )


@router.post("/cancel")
async def cancel_subscription(
    body: CancelRequest,
    db: Session = Depends(get_db),
):
    """
    Cancel a subscription at the end of the current billing period.

    Sets cancel_at_period_end=True in Stripe so the user retains access
    until the paid period expires.
    """
    s = _get_stripe()

    sub = db.query(Subscription).filter(Subscription.email == body.email).first()
    if not sub or not sub.stripe_subscription_id:
        raise HTTPException(status_code=404, detail="No active subscription found")

    if sub.status == "canceled":
        raise HTTPException(status_code=400, detail="Subscription is already canceled")

    try:
        s.Subscription.modify(
            sub.stripe_subscription_id,
            cancel_at_period_end=True,
        )
    except Exception as e:
        logger.error(f"Stripe cancel failed for {body.email}: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")

    sub.cancel_at_period_end = True
    db.commit()

    return {
        "status": "canceled",
        "email": body.email,
        "cancel_at_period_end": True,
        "current_period_end": (
            sub.current_period_end.isoformat() if sub.current_period_end else None
        ),
    }
