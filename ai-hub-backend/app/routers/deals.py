"""
Deals endpoints — the open, evidence-linked AI funding/M&A tracker API.

Free and public by design. Honesty + rights rules (see the data-rights
register and the Codex review 20260801-190000):

- `status` distinguishes `ai_extracted` (new pipeline, evidence-gated),
  `legacy_unverified` (pre-evidence backfill), `verified`, `corrected`.
- Field-level licensing: extracted FACTS (company, amounts, round, dates,
  investors) are freely reusable with attribution; `evidence` excerpts are
  third-party quotations displayed under quotation right in the UI and are
  deliberately EXCLUDED from bulk CSV export; `content` is our own
  AI-written summary (ours to license).
- Amount sorting/filtering is per-currency (defaults to USD) — native
  currency values are not comparable across currencies (no fake FX).
"""

import csv
import io
import time
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Deal
from app.services.deal_utils import csv_safe

router = APIRouter(prefix="/deals", tags=["deals"])

MAX_LIMIT = 200

# --- Lightweight anonymous rate limiting (Codex F9) -------------------------
# In-memory per-process sliding window: a deterrent against launch-day abuse,
# not a hard guarantee (same trade-off as the frontend api-guard).
_RATE_BUCKETS: dict[str, list[float]] = {}
_RATE_BUCKETS_MAX = 20_000


def _rate_limit(request: Request, key: str, limit: int, window_s: float = 60.0) -> None:
    # Trust the LAST X-Forwarded-For entry — it is appended by our own
    # ingress proxy (Railway); the first entries are caller-controlled and
    # trivially spoofable (Codex R4). In-memory per-process storage is
    # acceptable because the service runs a single worker; revisit with a
    # shared store if that changes.
    xff = [p.strip() for p in (request.headers.get("x-forwarded-for") or "").split(",") if p.strip()]
    ip = (xff[-1] if xff else None) \
        or (request.client.host if request.client else "unknown")
    bucket_key = f"{key}:{ip}"
    now = time.monotonic()
    hits = [t for t in _RATE_BUCKETS.get(bucket_key, []) if now - t < window_s]
    if len(hits) >= limit:
        raise HTTPException(status_code=429, detail="Rate limit exceeded — try again shortly")
    hits.append(now)
    if len(_RATE_BUCKETS) >= _RATE_BUCKETS_MAX and bucket_key not in _RATE_BUCKETS:
        _RATE_BUCKETS.clear()
    _RATE_BUCKETS[bucket_key] = hits


# CSV columns: facts + our own summary. `evidence` (third-party quotation)
# and raw week bookkeeping stay out of bulk export by design.
CSV_COLUMNS = [
    "deal_type", "company", "acquirer", "round", "round_category", "ma_type",
    "industry", "amount_raw", "amount_value", "currency", "valuation_raw",
    "investors", "announced_date", "summary", "source_url", "source_name",
    "status",
]

DISCLOSURE = (
    "Deals are AI-extracted from monitored public sources. Rows labeled "
    "ai_extracted passed a server-side evidence gate (figures require a "
    "verbatim excerpt found in the source corpus); legacy_unverified rows "
    "predate that gate and carry no evidence contract. Coverage is limited "
    "to our monitored EN/ZH sources — not a complete market picture. Dates "
    "reflect when our sources reported the deal. Facts are free to reuse "
    "with attribution and a link (https://www.datacubeai.space/funding); "
    "evidence excerpts are quotations from the linked sources and are not "
    "licensed for redistribution. Report errors: "
    "https://github.com/Rswcf/DataCube-AI-Space/issues"
)


def _deal_dict(d: Deal, include_evidence: bool = True) -> dict:
    return {
        "id": d.id,
        "dealType": d.deal_type,
        "company": d.company,
        "acquirer": d.acquirer,
        "round": d.round,
        "roundCategory": d.round_category,
        "maType": d.ma_type,
        "industry": d.industry,
        "amountRaw": d.amount_raw,
        "amountValue": d.amount_value,
        "currency": d.currency,
        "valuationRaw": d.valuation_raw,
        "investors": d.investors or [],
        "announcedDate": d.announced_date.isoformat() if d.announced_date else None,
        "content": d.content_en,
        # Quotation excerpts are served only in display-sized pages (<=50)
        # and never in exports — see the data-rights register (Codex R3).
        "evidence": d.evidence if include_evidence else None,
        "sourceUrl": d.source_url,
        "sourceName": d.source_name,
        "status": d.status,
        "weekId": d.week_id,
    }


def _filtered_query(
    db: Session,
    deal_type: Optional[str],
    round_category: Optional[str],
    industry: Optional[str],
    status: Optional[str],
    q: Optional[str],
    min_amount: Optional[int],
    currency: Optional[str],
    date_from: Optional[date],
    date_to: Optional[date],
):
    query = db.query(Deal)
    if deal_type in ("funding", "ma"):
        query = query.filter(Deal.deal_type == deal_type)
    if round_category:
        query = query.filter(Deal.round_category == round_category)
    if industry:
        query = query.filter(Deal.industry == industry)
    if status:
        query = query.filter(Deal.status == status)
    if q:
        needle = f"%{q.strip().lower()}%"
        query = query.filter(or_(
            func.lower(Deal.company).like(needle),
            func.lower(func.coalesce(Deal.acquirer, "")).like(needle),
            func.lower(func.array_to_string(Deal.investors, " ")).like(needle),
        ))
    if min_amount is not None:
        # Native-currency values are not cross-comparable — a minimum only
        # makes sense within one currency (default USD).
        query = query.filter(Deal.currency == (currency or "USD"),
                             Deal.amount_value >= min_amount)
    elif currency:
        query = query.filter(Deal.currency == currency)
    if date_from is not None:
        query = query.filter(Deal.announced_date >= date_from)
    if date_to is not None:
        query = query.filter(Deal.announced_date <= date_to)
    return query


def _sorted(query, sort: str, currency: Optional[str]):
    if sort == "amount":
        # Per-currency ranking only (F5): default USD.
        return (
            query.filter(Deal.currency == (currency or "USD"))
            .order_by(Deal.amount_value.desc().nulls_last(),
                      Deal.announced_date.desc().nulls_last())
        )
    return query.order_by(Deal.announced_date.desc().nulls_last(), Deal.id.desc())


@router.get("")
def list_deals(
    request: Request,
    deal_type: Optional[str] = Query(None, pattern="^(funding|ma)$"),
    round_category: Optional[str] = None,
    industry: Optional[str] = None,
    status: Optional[str] = Query(None, pattern="^(ai_extracted|legacy_unverified|verified|corrected)$"),
    q: Optional[str] = Query(None, max_length=100),
    min_amount: Optional[int] = Query(None, ge=0),
    currency: Optional[str] = Query(None, pattern="^[A-Z]{3}$"),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    sort: str = Query("date", pattern="^(date|amount)$"),
    limit: int = Query(50, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List deals with filters. Free, no auth — see /source-methodology."""
    _rate_limit(request, "deals", limit=60)
    query = _filtered_query(db, deal_type, round_category, industry, status,
                            q, min_amount, currency, date_from, date_to)
    sorted_query = _sorted(query, sort, currency)
    total = sorted_query.count() if sort == "amount" else query.count()
    rows = sorted_query.offset(offset).limit(limit).all()
    include_evidence = limit <= 50
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "deals": [_deal_dict(d, include_evidence=include_evidence) for d in rows],
        "disclosure": DISCLOSURE,
    }


_FACETS_CACHE: dict = {"at": 0.0, "data": None}
_FACETS_TTL_S = 60.0


@router.get("/facets")
def deal_facets(request: Request, db: Session = Depends(get_db)):
    """Distinct filter values + counts for the tracker UI (cached 60s)."""
    _rate_limit(request, "facets", limit=30)
    now = time.monotonic()
    if _FACETS_CACHE["data"] is not None and now - _FACETS_CACHE["at"] < _FACETS_TTL_S:
        return _FACETS_CACHE["data"]

    rounds = db.query(Deal.round_category, func.count(Deal.id)).filter(
        Deal.round_category.isnot(None)).group_by(Deal.round_category).all()
    industries = db.query(Deal.industry, func.count(Deal.id)).filter(
        Deal.industry.isnot(None)).group_by(Deal.industry).all()
    counts = db.query(Deal.deal_type, func.count(Deal.id)).group_by(Deal.deal_type).all()
    statuses = db.query(Deal.status, func.count(Deal.id)).group_by(Deal.status).all()
    date_range = db.query(func.min(Deal.announced_date), func.max(Deal.announced_date)).one()
    data = {
        "dealTypes": {k: v for k, v in counts},
        "statuses": {k: v for k, v in statuses},
        "roundCategories": sorted(
            [{"value": k, "count": v} for k, v in rounds],
            key=lambda x: -x["count"]),
        "industries": sorted(
            [{"value": k, "count": v} for k, v in industries],
            key=lambda x: -x["count"]),
        "dateRange": [
            date_range[0].isoformat() if date_range[0] else None,
            date_range[1].isoformat() if date_range[1] else None,
        ],
    }
    _FACETS_CACHE.update(at=now, data=data)
    return data


@router.get("/export.csv")
def export_deals_csv(
    request: Request,
    deal_type: Optional[str] = Query(None, pattern="^(funding|ma)$"),
    round_category: Optional[str] = None,
    industry: Optional[str] = None,
    status: Optional[str] = Query(None, pattern="^(ai_extracted|legacy_unverified|verified|corrected)$"),
    q: Optional[str] = Query(None, max_length=100),
    min_amount: Optional[int] = Query(None, ge=0),
    currency: Optional[str] = Query(None, pattern="^[A-Z]{3}$"),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
):
    """Free CSV export of the current filter (facts + our own summaries,
    capped at 2000 rows; evidence excerpts excluded — see module docstring)."""
    _rate_limit(request, "csv", limit=10)
    query = _filtered_query(db, deal_type, round_category, industry, status,
                            q, min_amount, currency, date_from, date_to)
    rows = _sorted(query, "date", currency).limit(2000).all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(CSV_COLUMNS)
    for d in rows:
        writer.writerow([csv_safe(v) for v in [
            d.deal_type, d.company, d.acquirer or "", d.round or "",
            d.round_category or "", d.ma_type or "", d.industry or "",
            d.amount_raw or "", d.amount_value if d.amount_value is not None else "",
            d.currency or "", d.valuation_raw or "",
            "; ".join(d.investors or []),
            d.announced_date.isoformat() if d.announced_date else "",
            d.content_en, d.source_url or "", d.source_name or "", d.status,
        ]])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=datacube-ai-deals.csv",
            "X-Data-Source": "datacubeai.space/funding",
        },
    )
