"""Conservative, reversible metadata repair; never regenerate historical prose."""

import hashlib
import json

from app.models import RawArticle, TipPost, Week
from app.services.source_integrity import canonical_url

FIELDS = ("timestamp", "source_url", "author", "platform", "metrics")


def content_digest(row):
    # Guard content and translations even though the repair never writes them.
    values = {k: getattr(row, k) for k in (
        "content_en", "content_de", "tip_en", "tip_de", "category_en", "category_de",
        "difficulty_en", "difficulty_de", "translations")}
    return hashlib.sha256(json.dumps(values, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def metadata(row):
    return {key: getattr(row, key) for key in FIELDS}


def plan_repair(db, start: str, end: str):
    rows = db.query(TipPost).filter(TipPost.week_id >= start, TipPost.week_id <= end).order_by(TipPost.id).all()
    raw = db.query(RawArticle).filter(RawArticle.week_id >= start, RawArticle.week_id <= end).all()
    sources = {(a.week_id, canonical_url(a.link)): a for a in raw if canonical_url(a.link)}
    weeks = {w.id: w for w in db.query(Week).filter(Week.id >= start, Week.id <= end).all()}
    changes = []
    for row in rows:
        if (row.metrics or {}).get("sourceStatus") in {"input_verified", "unverified_legacy"}:
            continue
        source = sources.get((row.week_id, canonical_url(row.source_url))) if row.source_url else None
        before = metadata(row)
        after = dict(before)
        # A matching URL establishes input membership, not that the old prose
        # accurately describes that story. Keep that uncertainty explicit.
        after["timestamp"] = weeks[row.week_id].sort_date.isoformat()
        after["source_url"] = source.link if source else None
        after["author"] = ({"name": source.source, "handle": "", "avatar": "", "verified": False}
                           if source else {"name": "Unverified legacy source", "handle": "", "avatar": "", "verified": False})
        after["metrics"] = {**(row.metrics or {}), "sourceStatus": "unverified_legacy", "dateBasis": "edition",
                            "sourceRepair": "2026-10-27", "urlMatchedInput": bool(source)}
        changes.append({"id": row.id, "period": row.week_id, "content_sha256": content_digest(row),
                        "before": before, "after": after})
    return {"version": 1, "range": [start, end], "rows": changes,
            "summary": {"rows": len(changes), "retained_input_urls": sum(bool(r["after"]["source_url"]) for r in changes),
                        "removed_unmatched_urls": sum(bool(r["before"]["source_url"]) and not r["after"]["source_url"] for r in changes)}}


def apply_manifest(db, manifest, *, restore=False):
    if manifest.get("version") != 1:
        raise ValueError("Unsupported repair manifest")
    expected, target = ("after", "before") if restore else ("before", "after")
    # Validate every row before any mutation. A changed row aborts the batch.
    locked = []
    try:
        for change in manifest["rows"]:
            row = db.query(TipPost).filter(TipPost.id == change["id"]).with_for_update().one()
            if row.week_id != change["period"] or content_digest(row) != change["content_sha256"] or metadata(row) != change[expected]:
                raise ValueError(f"Tip {change['id']} changed since the manifest was created")
            locked.append((row, change[target]))
        for row, values in locked:
            for field in FIELDS:
                setattr(row, field, values[field])
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"status": "restored" if restore else "repaired", "rows": len(locked)}
