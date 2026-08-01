"""
Trends feed endpoints.
"""

import re
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Week, Trend
from app.schemas import TrendsFeedResponse, TrendResponse
from app.services.i18n_utils import get_field, SUPPORTED_LANGUAGES

router = APIRouter(prefix="/trends", tags=["trends"])


def _langs_with_data(trends: list[Trend]) -> list[str]:
    """Return language codes that have content."""
    langs = {"de", "en"}
    for t in trends:
        if t.translations and isinstance(t.translations, dict):
            langs.update(t.translations.keys())
    return [lang for lang in SUPPORTED_LANGUAGES if lang in langs]


def _prior_period_ids(week_id: str, count: int = 14) -> list[str]:
    """Prior period ids of the same granularity, most recent first."""
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", week_id):
        try:
            day = date.fromisoformat(week_id)
        except ValueError:
            return []
        return [(day - timedelta(days=i)).isoformat() for i in range(1, count + 1)]

    weekly = re.fullmatch(r"(\d{4})-kw(\d{1,2})", week_id)
    if weekly:
        try:
            monday = date.fromisocalendar(int(weekly.group(1)), int(weekly.group(2)), 1)
        except ValueError:
            return []
        ids = []
        for i in range(1, min(count, 8) + 1):
            iso = (monday - timedelta(weeks=i)).isocalendar()
            ids.append(f"{iso[0]}-kw{iso[1]:02d}")
        return ids
    return []


def _norm_title(title: str | None) -> str:
    """Normalize a topic title for cross-period matching."""
    return re.sub(r"[^a-z0-9一-鿿]+", " ", (title or "").lower()).strip()


def _titles_match(a: str, b: str) -> bool:
    """Same topic if normalized titles are equal or one contains the other."""
    if not a or not b:
        return False
    if a == b:
        return True
    if len(a) >= 8 and len(b) >= 8:
        return a in b or b in a
    return False


def _compute_momentum(
    db: Session, week_id: str, trends: list[Trend]
) -> dict[int, tuple[str, int]]:
    """Proprietary trend-momentum signal from our own topic history.

    Returns {trend.id: (momentum, streak)} where streak counts consecutive
    periods including the current one. Periods with no trend data at all
    (collection gaps) are skipped rather than breaking streaks.
    """
    prior_ids = _prior_period_ids(week_id)
    if not prior_ids or not trends:
        return {}

    rows = (
        db.query(Trend.week_id, Trend.title_en)
        .filter(Trend.week_id.in_(prior_ids))
        .all()
    )
    titles_by_period: dict[str, list[str]] = {}
    for pid, title in rows:
        titles_by_period.setdefault(pid, []).append(_norm_title(title))

    periods_with_data = [pid for pid in prior_ids if pid in titles_by_period]
    result: dict[int, tuple[str, int]] = {}
    for t in trends:
        key = _norm_title(t.title_en)
        appearances = 0
        streak = 1  # current period counts
        streak_alive = True
        for pid in periods_with_data:
            hit = any(_titles_match(key, other) for other in titles_by_period[pid])
            if hit:
                appearances += 1
                if streak_alive:
                    streak += 1
            else:
                streak_alive = False
        if appearances == 0:
            momentum = "new"
        elif streak > 1:
            momentum = "rising"
        else:
            momentum = "returning"
        result[t.id] = (momentum, streak)
    return result


@router.get("/{week_id}", response_model=TrendsFeedResponse)
def get_trends_feed(week_id: str, db: Session = Depends(get_db)):
    """Get trends for a specific week."""
    # Verify week exists
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(status_code=404, detail=f"Week {week_id} not found")

    # Get trends for this week
    trends = db.query(Trend).filter(Trend.week_id == week_id).all()

    available_langs = _langs_with_data(trends)
    momentum = _compute_momentum(db, week_id, trends)

    trends_dict = {}
    for lang in available_langs:
        trends_dict[lang] = [
            TrendResponse(
                category=get_field(t, "category", lang) or "",
                title=get_field(t, "title", lang) or "",
                posts=t.posts,
                momentum=momentum.get(t.id, (None, None))[0],
                streak=momentum.get(t.id, (None, None))[1],
            )
            for t in trends
        ]

    # teamMembers is kept as empty lists for response-shape compatibility.
    # The old roster contained fictional people (internal-tool artifact) and
    # was removed 2026-08; full model/table removal is pending.
    return TrendsFeedResponse(
        trends=trends_dict,
        teamMembers={"de": [], "en": []},
    )
