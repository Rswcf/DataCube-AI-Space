"""Cheap metadata acquisition. No LLM, YouTube search or publication side effects."""
import hashlib
from datetime import datetime, timedelta

from sqlalchemy.dialects.postgresql import insert

from app.config import get_settings
from app.models.source_cache import SourceCache, SourceHealth
from app.services.rss_fetcher import fetch_rss_feeds_parallel
from app.services.source_integrity import canonical_url, source_datetime


def cache_sources(db, sources):
    reports = {s["name"]: {"status": "disabled", "reason": s.get("disabled_reason", "configured disabled"), "url": s["url"]}
               for rows in sources.values() for s in rows if not s.get("enabled", True)}
    articles = fetch_rss_feeds_parallel(sources, exclude_names={"Hacker News"}, reports=reports)
    now = datetime.utcnow()
    for article in articles:
        dt = source_datetime(article.get("published"))
        if not dt or dt.replace(tzinfo=None) < now - timedelta(days=7):
            continue
        key = hashlib.sha256(canonical_url(article["link"]).encode()).hexdigest()
        stmt = insert(SourceCache).values(key=key, published_at=dt.replace(tzinfo=None), payload=article)
        db.execute(stmt.on_conflict_do_update(index_elements=[SourceCache.key],
                                             set_={"payload": stmt.excluded.payload, "published_at": stmt.excluded.published_at}))
    for name, report in reports.items():
        stmt = insert(SourceHealth).values(name=name, checked_at=now, report=report)
        db.execute(stmt.on_conflict_do_update(index_elements=[SourceHealth.name],
                                             set_={"checked_at": now, "report": report}))
    db.query(SourceCache).filter(SourceCache.published_at < now - timedelta(days=7)).delete()
    db.commit()
    issues = {name: r["status"] for name, r in reports.items() if r["status"] not in {"ok", "quiet", "disabled"}}
    usable = sum(r["status"] in {"ok", "quiet"} for r in reports.values())
    if not usable:
        raise RuntimeError("No source feed could be checked successfully")
    return {"status": "degraded" if issues else "prefetched", "items": len(articles), "issues": issues,
            "checked": sum(r["status"] != "disabled" for r in reports.values()),
            "disabled": sum(r["status"] == "disabled" for r in reports.values()), "model_calls": 0}


def run_prefetch(db):
    if not get_settings().source_prefetch_enabled:
        return {"status": "disabled", "model_calls": 0}
    from app.services.collector import load_sources
    return cache_sources(db, load_sources())


def cached_articles(db, start, end):
    if not get_settings().source_prefetch_enabled:
        return []
    from app.services.collector import load_sources
    active = {s["name"] for rows in load_sources().values() for s in rows if s.get("enabled", True)}
    return [row.payload for row in db.query(SourceCache).filter(
        SourceCache.published_at >= start, SourceCache.published_at < end).all() if row.payload.get("source") in active]
