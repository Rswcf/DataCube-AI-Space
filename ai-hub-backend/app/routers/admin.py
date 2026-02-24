"""
Admin endpoints for triggering data collection.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Header, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from typing import Optional

from app.database import get_db, get_session_local
from app.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


def verify_api_key(x_api_key: str = Header(...)):
    """Verify admin API key."""
    settings = get_settings()
    if not settings.admin_api_key:
        raise HTTPException(status_code=500, detail="Admin API key not configured")
    if x_api_key != settings.admin_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True


def _resolve_period_id(week_id: Optional[str], period_id: Optional[str]) -> Optional[str]:
    """
    Resolve period query parameters.

    Supports both `week_id` (new) and `period_id` (backward compatibility).
    """
    if week_id and period_id and week_id != period_id:
        raise HTTPException(
            status_code=400,
            detail="Conflicting query params: week_id and period_id must match",
        )
    return week_id or period_id


def _run_collection_with_new_session(week_id: Optional[str] = None):
    """Background task wrapper that creates its own database session."""
    from app.services.collector import run_collection

    db = get_session_local()()
    try:
        logger.info(f"Starting background collection for {week_id or 'current week'}")
        run_collection(db, week_id)
        logger.info(f"Background collection completed for {week_id or 'current week'}")
    except Exception as e:
        logger.error(f"Background collection failed: {e}")
        raise
    finally:
        db.close()


def _send_newsletter_with_new_session(period_id: Optional[str] = None):
    """Background task wrapper for newsletter sending with its own session."""
    from app.services.newsletter_sender import send_newsletter

    db = get_session_local()()
    try:
        logger.info(f"Starting newsletter for {period_id or 'yesterday'}")
        send_newsletter(db, period_id)
        logger.info(f"Newsletter completed for {period_id or 'yesterday'}")
    except Exception as e:
        logger.error(f"Newsletter failed: {e}")
        raise
    finally:
        db.close()


def _run_ma_collection_with_new_session(week_id: Optional[str] = None):
    """Background task wrapper for M&A-only collection with its own session."""
    from app.services.collector import run_ma_collection

    db = get_session_local()()
    try:
        logger.info(f"Starting background M&A collection for {week_id or 'current week'}")
        run_ma_collection(db, week_id)
        logger.info(f"Background M&A collection completed for {week_id or 'current week'}")
    except Exception as e:
        logger.error(f"Background M&A collection failed: {e}")
        raise
    finally:
        db.close()


@router.delete("/period/{period_id}")
async def delete_period(
    period_id: str,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_api_key),
):
    """
    Delete a period (week or day) and all its associated data.

    For weekly IDs, child day records are deleted first (FK safety).
    Synchronous — deletion is fast.

    Requires X-API-Key header.
    """
    from app.services.collector import delete_period as do_delete

    try:
        result = do_delete(db, period_id)
        return {"status": "deleted", **result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to delete period {period_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/collect")
async def trigger_collection(
    background_tasks: BackgroundTasks,
    week_id: Optional[str] = None,
    period_id: Optional[str] = None,
    wait: bool = False,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_api_key),
):
    """
    Trigger full data collection for a specific week (or current week if not specified).

    This runs all stages:
    - Stage 1: Fetch raw data from sources
    - Stage 2: LLM classification
    - Stage 3: Parallel LLM processing
    - Stage 4: Save to database

    Requires X-API-Key header.
    """
    resolved_period = _resolve_period_id(week_id, period_id)

    if wait:
        from app.services.collector import run_collection

        try:
            run_collection(db, resolved_period)
        except Exception as e:
            logger.error(f"Synchronous collection failed: {e}")
            raise HTTPException(status_code=500, detail=f"Collection failed: {str(e)}")

        return {
            "status": "completed",
            "week_id": resolved_period or "current",
            "message": "Full collection completed",
        }

    # Run collection in background with its own session
    background_tasks.add_task(_run_collection_with_new_session, resolved_period)

    return {
        "status": "started",
        "week_id": resolved_period or "current",
        "message": "Full collection started in background (fetch + process)",
    }


@router.post("/collect/ma")
async def trigger_ma_collection(
    background_tasks: BackgroundTasks,
    week_id: Optional[str] = None,
    period_id: Optional[str] = None,
    _: bool = Depends(verify_api_key),
):
    """
    Trigger M&A-only collection for a specific week (or current week).

    Only fetches M&A sources and updates M&A posts, leaving other sections untouched.
    Requires X-API-Key header.
    """
    resolved_period = _resolve_period_id(week_id, period_id)
    background_tasks.add_task(_run_ma_collection_with_new_session, resolved_period)

    return {
        "status": "started",
        "week_id": resolved_period or "current",
        "message": "M&A collection started in background",
    }


def _run_fetch_only_with_new_session(week_id: Optional[str] = None):
    """Background task wrapper that creates its own database session."""
    from app.services.collector import run_fetch_only

    db = get_session_local()()
    try:
        logger.info(f"Starting background fetch for {week_id or 'current week'}")
        run_fetch_only(db, week_id)
        logger.info(f"Background fetch completed for {week_id or 'current week'}")
    except Exception as e:
        logger.error(f"Background fetch failed: {e}")
        raise
    finally:
        db.close()


@router.post("/collect/fetch")
async def trigger_fetch_only(
    background_tasks: BackgroundTasks,
    week_id: Optional[str] = None,
    period_id: Optional[str] = None,
    _: bool = Depends(verify_api_key),
):
    """
    Trigger Stage 1 only: Fetch and store raw data.

    Use this to collect raw data without LLM processing.
    Useful for debugging or when you want to process later.

    Requires X-API-Key header.
    """
    resolved_period = _resolve_period_id(week_id, period_id)

    # Run fetch in background with its own session
    background_tasks.add_task(_run_fetch_only_with_new_session, resolved_period)

    return {
        "status": "started",
        "week_id": resolved_period or "current",
        "message": "Fetch-only started in background (Stage 1)",
    }


def _run_process_only_with_new_session(week_id: Optional[str] = None):
    """Background task wrapper that creates its own database session."""
    from app.services.collector import run_process_only

    db = get_session_local()()
    try:
        logger.info(f"Starting background processing for {week_id or 'current week'}")
        run_process_only(db, week_id)
        logger.info(f"Background processing completed for {week_id or 'current week'}")
    except Exception as e:
        logger.error(f"Background processing failed: {e}")
        raise
    finally:
        db.close()


@router.post("/collect/process")
async def trigger_process_only(
    background_tasks: BackgroundTasks,
    week_id: Optional[str] = None,
    period_id: Optional[str] = None,
    _: bool = Depends(verify_api_key),
):
    """
    Trigger Stages 2-4: Process existing raw data.

    Requires raw data to exist (run /collect/fetch first).
    Use this to reprocess data after LLM improvements.

    Requires X-API-Key header.
    """
    resolved_period = _resolve_period_id(week_id, period_id)

    # Run processing in background with its own session
    background_tasks.add_task(_run_process_only_with_new_session, resolved_period)

    return {
        "status": "started",
        "week_id": resolved_period or "current",
        "message": "Process-only started in background (Stages 2-4)",
    }


@router.post("/migrate")
async def migrate_json_data(
    week_id: str,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_api_key),
):
    """
    Migrate existing JSON data files to the database.

    Requires X-API-Key header.
    """
    from app.services.migrator import migrate_week_data

    try:
        result = migrate_week_data(db, week_id)
        return {"status": "success", "week_id": week_id, "counts": result}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import-week")
async def import_week_data(
    week_id: str,
    tech_data: Optional[dict] = None,
    investment_data: Optional[dict] = None,
    tips_data: Optional[dict] = None,
    trends_data: Optional[dict] = None,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_api_key),
):
    """
    Import week data directly via JSON payload.

    Requires X-API-Key header.
    """
    from app.services.migrator_api import import_week_from_json

    try:
        result = import_week_from_json(
            db, week_id, tech_data, investment_data, tips_data, trends_data
        )
        return {"status": "success", "week_id": week_id, "counts": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/init-db")
async def initialize_database(
    drop: bool = False,
    _: bool = Depends(verify_api_key),
):
    """
    Initialize database tables.

    Args:
        drop: If True, drop all tables first (WARNING: data loss!)
              Only allowed when ALLOW_DB_DROP=true environment variable is set.

    Requires X-API-Key header.
    """
    from app.database import Base, get_engine
    import os

    try:
        engine = get_engine()
        # SEC-H1: Gate drop=True behind environment check to prevent accidental data destruction
        if drop:
            allow_drop = os.environ.get("ALLOW_DB_DROP", "").lower() == "true"
            if not allow_drop:
                raise HTTPException(
                    status_code=403,
                    detail="Database drop not allowed. Set ALLOW_DB_DROP=true environment variable to enable."
                )
            logger.warning("Dropping all database tables (ALLOW_DB_DROP=true)")
            Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        return {"status": "success", "message": "Database tables created", "dropped": drop}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise HTTPException(status_code=500, detail="Database initialization failed")


@router.post("/newsletter")
async def trigger_newsletter(
    background_tasks: BackgroundTasks,
    period_id: Optional[str] = None,
    wait: bool = False,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_api_key),
):
    """
    Send newsletter for a period.

    Defaults to yesterday's content. Set wait=true for synchronous mode.
    Requires X-API-Key header.
    """
    if wait:
        from app.services.newsletter_sender import send_newsletter

        try:
            send_newsletter(db, period_id)
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        return {"status": "completed", "period_id": period_id or "yesterday"}

    background_tasks.add_task(_send_newsletter_with_new_session, period_id)
    return {"status": "started", "period_id": period_id or "yesterday"}


def _run_backfill_translations_with_new_session(
    period_id: str | None = None,
):
    """Background task wrapper for translation backfill."""
    from app.models import (
        Week, TechPost, PrimaryMarketPost, SecondaryMarketPost,
        MAPost, TipPost, Video, Trend,
    )
    from app.services.i18n_utils import TRANSLATION_LANGUAGES
    from app.services.llm_processor import LLMProcessor

    CONFIGS = {
        "tech": (TechPost, ["content", "category", "tags"], {}),
        "video": (Video, ["title", "summary"], {}),
        "tip": (TipPost, ["content", "tip", "category", "difficulty"], {}),
        "primary_market": (PrimaryMarketPost, ["content", "amount", "valuation"], {}),
        "secondary_market": (SecondaryMarketPost, ["content"], {}),
        "ma": (MAPost, ["content", "deal_value", "deal_type"], {}),
        "trend": (Trend, ["category", "title"], {}),
    }

    from concurrent.futures import ThreadPoolExecutor, as_completed
    import threading

    db = get_session_local()()
    try:
        # Resolve periods
        if period_id:
            week_ids = [period_id]
        else:
            weeks = db.query(Week).order_by(Week.id).all()
            week_ids = [w.id for w in weeks]

        logger.info(f"Backfill translations: {len(week_ids)} period(s)")
        grand_total = 0

        for wid in week_ids:
            logger.info(f"Backfilling {wid}")

            # Collect all sections that need translation for this period
            section_data = []  # (section_name, records, en_items, fields, name_map, missing_langs)
            for section_name, (model_cls, fields, name_map) in CONFIGS.items():
                records = db.query(model_cls).filter(model_cls.week_id == wid).all()

                # Find records missing ANY language (not just records with no translations)
                to_translate = []
                missing_langs_per_record = []
                for r in records:
                    existing = r.translations or {}
                    missing = [lang for lang in TRANSLATION_LANGUAGES if lang not in existing]
                    if missing:
                        to_translate.append(r)
                        missing_langs_per_record.append(missing)

                if not to_translate:
                    continue

                # Figure out which languages need work across all records in this section
                all_missing = set()
                for ml in missing_langs_per_record:
                    all_missing.update(ml)

                en_items = []
                for record in to_translate:
                    d = {"_translations": dict(record.translations or {})}
                    for f in fields:
                        val = getattr(record, f"{f}_en", None)
                        if val is not None:
                            d[f] = val
                    en_items.append(d)

                section_data.append((section_name, to_translate, en_items, fields, name_map, sorted(all_missing)))
                logger.info(f"  {section_name}: {len(to_translate)} records, missing langs: {sorted(all_missing)}")

            if not section_data:
                logger.info(f"  {wid}: nothing to translate")
                continue

            # Build work units: only for missing languages per section
            lock = threading.Lock()
            work_units = [
                (si, lang)
                for si in range(len(section_data))
                for lang in section_data[si][5]  # missing_langs
            ]

            def do_translate(section_idx: int, target_lang: str):
                section_name, _, en_items, fields, name_map, _ = section_data[section_idx]
                proc = LLMProcessor()
                translated = proc.translate_batch(en_items, target_lang, fields)
                with lock:
                    for i, en_item in enumerate(en_items):
                        if i < len(translated) and translated[i]:
                            mapped = {}
                            for k, v in translated[i].items():
                                db_name = name_map.get(k, k)
                                mapped[db_name] = v
                            en_item["_translations"][target_lang] = mapped

            # 3 parallel workers (same as stage3_5)
            with ThreadPoolExecutor(max_workers=3) as executor:
                futures = {}
                for si, lang in work_units:
                    future = executor.submit(do_translate, si, lang)
                    futures[future] = f"{section_data[si][0]}→{lang}"

                for future in as_completed(futures):
                    task_name = futures[future]
                    try:
                        future.result()
                        logger.info(f"    {task_name}: done")
                    except Exception as e:
                        logger.warning(f"    {task_name}: failed ({e})")

            # Write back to DB
            period_total = 0
            for section_name, records, en_items, _, _, _ in section_data:
                for i, record in enumerate(records):
                    t = en_items[i].get("_translations")
                    if t:
                        record.translations = t
                        period_total += 1

            if period_total > 0:
                db.commit()
            grand_total += period_total
            logger.info(f"  {wid}: {period_total} records updated")

        logger.info(f"Backfill complete: {grand_total} total records across {len(week_ids)} periods")
    except Exception as e:
        logger.error(f"Backfill failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


@router.post("/backfill-translations")
async def trigger_backfill_translations(
    period_id: str | None = None,
    _: bool = Depends(verify_api_key),
):
    """
    Backfill translations for existing content that only has DE/EN.

    Translates EN content to ZH, FR, ES, PT, JA, KO using free model chain.
    If period_id is specified, only backfill that period. Otherwise all periods.

    Runs in a daemon thread so the event loop stays responsive.

    Requires X-API-Key header.
    """
    import threading

    thread = threading.Thread(
        target=_run_backfill_translations_with_new_session,
        args=(period_id,),
        daemon=True,
    )
    thread.start()
    return {
        "status": "started",
        "period_id": period_id or "all",
        "message": "Translation backfill started in background thread",
    }


@router.post("/patch-translation")
async def patch_translation(
    table: str,
    record_id: int,
    lang: str,
    translations_data: dict,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_api_key),
):
    """
    Manually patch a single record's translations for a specific language.

    Body: JSON dict of field→value, e.g. {"title": "...", "summary": "..."}
    """
    from app.models import (
        TechPost, PrimaryMarketPost, SecondaryMarketPost,
        MAPost, TipPost, Video, Trend,
    )

    TABLE_MAP = {
        "tech": TechPost, "video": Video, "tip": TipPost,
        "primary_market": PrimaryMarketPost, "secondary_market": SecondaryMarketPost,
        "ma": MAPost, "trend": Trend,
    }

    model_cls = TABLE_MAP.get(table)
    if not model_cls:
        raise HTTPException(status_code=400, detail=f"Unknown table: {table}")

    record = db.query(model_cls).filter(model_cls.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Record {record_id} not found")

    existing = dict(record.translations or {})
    existing[lang] = translations_data
    record.translations = existing
    db.commit()

    return {"status": "patched", "table": table, "id": record_id, "lang": lang}


@router.post("/delete-translation")
async def delete_translation(
    table: str,
    record_id: int,
    lang: str,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_api_key),
):
    """Remove a specific language key from a record's translations JSONB."""
    from app.models import (
        TechPost, PrimaryMarketPost, SecondaryMarketPost,
        MAPost, TipPost, Video, Trend,
    )

    TABLE_MAP = {
        "tech": TechPost, "video": Video, "tip": TipPost,
        "primary_market": PrimaryMarketPost, "secondary_market": SecondaryMarketPost,
        "ma": MAPost, "trend": Trend,
    }

    model_cls = TABLE_MAP.get(table)
    if not model_cls:
        raise HTTPException(status_code=400, detail=f"Unknown table: {table}")

    record = db.query(model_cls).filter(model_cls.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Record {record_id} not found")

    existing = dict(record.translations or {})
    if lang in existing:
        del existing[lang]
        record.translations = existing
        flag_modified(record, "translations")
        db.commit()
        return {"status": "deleted", "table": table, "id": record_id, "lang": lang}
    return {"status": "not_found", "table": table, "id": record_id, "lang": lang}


@router.post("/newsletter/diagnose")
async def diagnose_newsletter(
    period_id: Optional[str] = None,
    test_email: Optional[str] = None,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_api_key),
):
    """
    Diagnostic endpoint that tests each step of the newsletter pipeline independently.

    Returns a JSON report with results for:
    1. Environment variable checks
    2. Beehiiv subscriber fetch (raw first-page response)
    3. Content availability for the given period
    4. Test email send via Resend

    Requires X-API-Key header.
    """
    import requests as http_requests
    import resend
    from datetime import date, timedelta
    from app.models.week import Week
    from app.services.period_utils import current_day_id

    settings = get_settings()
    report = {
        "period_id": None,
        "env_check": {},
        "beehiiv_subscribers": {},
        "content_check": {},
        "resend_test": {},
    }

    # ---- Step 1: Check env vars ----
    logger.info("[diagnose] Step 1: Checking environment variables")
    env_vars = {
        "RESEND_API_KEY": bool(settings.resend_api_key),
        "BEEHIIV_API_KEY": bool(settings.beehiiv_api_key),
        "BEEHIIV_PUBLICATION_ID": bool(settings.beehiiv_publication_id),
        "NEWSLETTER_FROM_EMAIL": settings.newsletter_from_email,
    }
    all_set = all([
        settings.resend_api_key,
        settings.beehiiv_api_key,
        settings.beehiiv_publication_id,
    ])
    report["env_check"] = {"variables": env_vars, "all_required_set": all_set}
    logger.info(f"[diagnose] Env check: {env_vars}")

    # ---- Resolve period_id ----
    if not period_id:
        yesterday = date.today() - timedelta(days=1)
        period_id = yesterday.strftime("%Y-%m-%d")
    report["period_id"] = period_id
    logger.info(f"[diagnose] Using period_id: {period_id}")

    # ---- Step 2: Fetch Beehiiv subscribers (first page only, raw response) ----
    logger.info("[diagnose] Step 2: Fetching Beehiiv subscribers (page 1)")
    if settings.beehiiv_api_key and settings.beehiiv_publication_id:
        try:
            resp = http_requests.get(
                f"https://api.beehiiv.com/v2/publications/{settings.beehiiv_publication_id}/subscriptions",
                headers={"Authorization": f"Bearer {settings.beehiiv_api_key}"},
                params={"status": "active", "limit": 100, "page": 1, "expand[]": "custom_fields"},
                timeout=30,
            )
            report["beehiiv_subscribers"] = {
                "status_code": resp.status_code,
                "ok": resp.ok,
                "raw_response": resp.json() if resp.ok else resp.text,
            }
            if resp.ok:
                data = resp.json()
                subs = data.get("data", [])
                report["beehiiv_subscribers"]["subscriber_count_page1"] = len(subs)
                report["beehiiv_subscribers"]["total_pages"] = data.get("total_pages", 1)
                # Extract emails + languages for readability
                parsed = []
                for sub in subs:
                    email = sub.get("email", "?")
                    lang = "de"
                    for field in sub.get("custom_fields", []):
                        if field.get("name", "").lower() == "language":
                            lang = field.get("value", "de")
                    parsed.append({"email": email, "language": lang})
                report["beehiiv_subscribers"]["parsed_subscribers"] = parsed
            logger.info(f"[diagnose] Beehiiv response: {resp.status_code}, {len(resp.text)} bytes")
        except Exception as e:
            report["beehiiv_subscribers"] = {"error": str(e)}
            logger.error(f"[diagnose] Beehiiv fetch failed: {e}", exc_info=True)
    else:
        report["beehiiv_subscribers"] = {"error": "BEEHIIV_API_KEY or BEEHIIV_PUBLICATION_ID not set"}
        logger.warning("[diagnose] Skipping Beehiiv — missing credentials")

    # ---- Step 3: Check content exists ----
    logger.info(f"[diagnose] Step 3: Checking content for {period_id}")
    try:
        week = db.query(Week).filter(Week.id == period_id).first()
        if week:
            from app.models.tech import TechPost
            from app.models.investment import PrimaryMarketPost, MAPost
            from app.models.tip import TipPost

            tech_count = db.query(TechPost).filter(
                TechPost.week_id == period_id, TechPost.is_video == False  # noqa: E712
            ).count()
            video_count = db.query(TechPost).filter(
                TechPost.week_id == period_id, TechPost.is_video == True  # noqa: E712
            ).count()
            funding_count = db.query(PrimaryMarketPost).filter(
                PrimaryMarketPost.week_id == period_id
            ).count()
            ma_count = db.query(MAPost).filter(MAPost.week_id == period_id).count()
            tip_count = db.query(TipPost).filter(TipPost.week_id == period_id).count()

            report["content_check"] = {
                "period_exists": True,
                "tech": tech_count,
                "videos": video_count,
                "funding": funding_count,
                "ma": ma_count,
                "tips": tip_count,
                "total": tech_count + video_count + funding_count + ma_count + tip_count,
            }
        else:
            report["content_check"] = {"period_exists": False, "total": 0}
        logger.info(f"[diagnose] Content check: {report['content_check']}")
    except Exception as e:
        report["content_check"] = {"error": str(e)}
        logger.error(f"[diagnose] Content check failed: {e}", exc_info=True)

    # ---- Step 4: Send test email via Resend ----
    recipient = test_email or settings.newsletter_from_email
    logger.info(f"[diagnose] Step 4: Sending test email to {recipient}")
    if settings.resend_api_key:
        try:
            resend.api_key = settings.resend_api_key
            result = resend.Emails.send({
                "from": settings.newsletter_from_email,
                "to": [recipient],
                "subject": f"[DIAGNOSTIC] Newsletter pipeline test — {period_id}",
                "html": (
                    "<h2>Newsletter Diagnostic Test</h2>"
                    f"<p>This is a test email from the newsletter diagnostic endpoint.</p>"
                    f"<p><strong>Period:</strong> {period_id}</p>"
                    f"<p><strong>Timestamp:</strong> {date.today().isoformat()}</p>"
                    "<p>If you received this, Resend is working correctly.</p>"
                ),
            })
            report["resend_test"] = {
                "ok": True,
                "recipient": recipient,
                "result": result,
            }
            logger.info(f"[diagnose] Resend test result: {result}")
        except Exception as e:
            report["resend_test"] = {"ok": False, "recipient": recipient, "error": str(e)}
            logger.error(f"[diagnose] Resend test failed: {e}", exc_info=True)
    else:
        report["resend_test"] = {"ok": False, "error": "RESEND_API_KEY not set"}
        logger.warning("[diagnose] Skipping Resend — missing API key")

    logger.info(f"[diagnose] Diagnosis complete for {period_id}")
    return report


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
