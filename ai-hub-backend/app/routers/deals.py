"""
Deals endpoints — the open, evidence-linked AI funding/M&A tracker API.

Free and public by design (the tracker is our compounding data asset and
credibility play). Rows carry an explicit `status`: `ai_extracted` rows were
machine-extracted with a source link (and, for newer rows, a verbatim
evidence excerpt); `verified` rows passed manual review; `corrected` rows
were fixed after an error report. Honesty over polish.
"""

import csv
import io
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Deal

router = APIRouter(prefix="/deals", tags=["deals"])

MAX_LIMIT = 200

CSV_COLUMNS = [
    "deal_type", "company", "acquirer", "round", "round_category", "ma_type",
    "industry", "amount_raw", "amount_value", "currency", "valuation_raw",
    "investors", "announced_date", "content_en", "evidence", "source_url",
    "source_name", "status", "week_id",
]


def _deal_dict(d: Deal) -> dict:
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
        "evidence": d.evidence,
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
    q: Optional[str],
    min_amount: Optional[int],
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
    if q:
        needle = f"%{q.strip().lower()}%"
        query = query.filter(or_(
            func.lower(Deal.company).like(needle),
            func.lower(func.coalesce(Deal.acquirer, "")).like(needle),
            func.lower(func.array_to_string(Deal.investors, " ")).like(needle),
        ))
    if min_amount is not None:
        query = query.filter(Deal.amount_value >= min_amount)
    if date_from is not None:
        query = query.filter(Deal.announced_date >= date_from)
    if date_to is not None:
        query = query.filter(Deal.announced_date <= date_to)
    return query


def _sorted(query, sort: str):
    if sort == "amount":
        return query.order_by(Deal.amount_value.desc().nulls_last(),
                              Deal.announced_date.desc().nulls_last())
    return query.order_by(Deal.announced_date.desc().nulls_last(), Deal.id.desc())


@router.get("")
def list_deals(
    deal_type: Optional[str] = Query(None, pattern="^(funding|ma)$"),
    round_category: Optional[str] = None,
    industry: Optional[str] = None,
    q: Optional[str] = Query(None, max_length=100),
    min_amount: Optional[int] = Query(None, ge=0),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    sort: str = Query("date", pattern="^(date|amount)$"),
    limit: int = Query(50, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List deals with filters. Free, no auth — see /source-methodology."""
    query = _filtered_query(db, deal_type, round_category, industry, q,
                            min_amount, date_from, date_to)
    total = query.count()
    rows = _sorted(query, sort).offset(offset).limit(limit).all()
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "deals": [_deal_dict(d) for d in rows],
        "disclosure": (
            "Deals are AI-extracted from monitored public sources and linked to "
            "their origin; rows are labeled ai_extracted/verified/corrected. "
            "Coverage is limited to our monitored EN/ZH sources — this is not "
            "a complete market picture. Report errors: "
            "https://github.com/Rswcf/DataCube-AI-Space/issues"
        ),
    }


@router.get("/facets")
def deal_facets(db: Session = Depends(get_db)):
    """Distinct filter values + counts for the tracker UI."""
    rounds = db.query(Deal.round_category, func.count(Deal.id)).filter(
        Deal.round_category.isnot(None)).group_by(Deal.round_category).all()
    industries = db.query(Deal.industry, func.count(Deal.id)).filter(
        Deal.industry.isnot(None)).group_by(Deal.industry).all()
    counts = db.query(Deal.deal_type, func.count(Deal.id)).group_by(Deal.deal_type).all()
    date_range = db.query(func.min(Deal.announced_date), func.max(Deal.announced_date)).one()
    return {
        "dealTypes": {k: v for k, v in counts},
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


@router.get("/export.csv")
def export_deals_csv(
    deal_type: Optional[str] = Query(None, pattern="^(funding|ma)$"),
    round_category: Optional[str] = None,
    industry: Optional[str] = None,
    q: Optional[str] = Query(None, max_length=100),
    min_amount: Optional[int] = Query(None, ge=0),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
):
    """Free CSV export of the current filter (capped at 2000 rows)."""
    query = _filtered_query(db, deal_type, round_category, industry, q,
                            min_amount, date_from, date_to)
    rows = _sorted(query, "date").limit(2000).all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(CSV_COLUMNS)
    for d in rows:
        writer.writerow([
            d.deal_type, d.company, d.acquirer or "", d.round or "",
            d.round_category or "", d.ma_type or "", d.industry or "",
            d.amount_raw or "", d.amount_value if d.amount_value is not None else "",
            d.currency or "", d.valuation_raw or "",
            "; ".join(d.investors or []),
            d.announced_date.isoformat() if d.announced_date else "",
            d.content_en, d.evidence or "", d.source_url or "",
            d.source_name or "", d.status, d.week_id,
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=datacube-ai-deals.csv",
            # Data is CC BY 4.0-style attribution-expected; keep it simple:
            "X-Data-Source": "datacubeai.space/funding",
        },
    )
