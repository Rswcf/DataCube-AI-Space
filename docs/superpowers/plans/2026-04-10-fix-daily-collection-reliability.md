# Fix Daily Collection Reliability — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix intermittent daily data collection failures (~24% days produce zero content) by adding pre-save validation, persistent status tracking, processor model fallback, split save strategy, and GH Actions retry logic.

**Architecture:** Six targeted fixes ordered by priority. P0 fixes prevent data loss and enable debugging. P1 fixes reduce failure frequency. P2 adds automatic recovery. Each task is independently deployable — earlier tasks don't depend on later ones.

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy, Alembic, PostgreSQL, GitHub Actions

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `ai-hub-backend/app/models/collection_run.py` | Create | CollectionRun DB model |
| `ai-hub-backend/app/models/__init__.py` | Modify | Export new model |
| `ai-hub-backend/alembic/versions/20260410_0010_add_collection_runs.py` | Create | DB migration |
| `ai-hub-backend/app/services/collector.py` | Modify | Pre-save validation, atomic save, persistent status, split save |
| `ai-hub-backend/app/services/llm_processor.py` | Modify | Processor fallback chain |
| `ai-hub-backend/app/config.py` | Modify | Reduce llm_max_workers |
| `ai-hub-backend/app/routers/admin.py` | Modify | Updated status endpoint |
| `.github/workflows/daily-collect.yml` | Modify | Retry logic, status-based polling, failure exit code |

---

### Task 1: CollectionRun Model + Migration

**Files:**
- Create: `ai-hub-backend/app/models/collection_run.py`
- Modify: `ai-hub-backend/app/models/__init__.py`
- Create: `ai-hub-backend/alembic/versions/20260410_0010_add_collection_runs.py`

- [ ] **Step 1: Create the CollectionRun model**

```python
# ai-hub-backend/app/models/collection_run.py
"""
Persistent collection run tracking.

Replaces the in-memory _collection_status dict so that collection
state survives container restarts and is queryable for retry logic.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CollectionRun(Base):
    """Tracks the status of a data collection run for a period."""

    __tablename__ = "collection_runs"

    period_id: Mapped[str] = mapped_column(String(10), primary_key=True)
    status: Mapped[str] = mapped_column(String(20))  # running, completed, failed, empty
    stage: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    error: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    counts: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    raw_counts: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    def __repr__(self) -> str:
        return f"<CollectionRun {self.period_id} status={self.status}>"
```

- [ ] **Step 2: Export from models/__init__.py**

Add to `ai-hub-backend/app/models/__init__.py`:

```python
from app.models.collection_run import CollectionRun
```

And add `"CollectionRun"` to the `__all__` list.

- [ ] **Step 3: Create Alembic migration**

```python
# ai-hub-backend/alembic/versions/20260410_0010_add_collection_runs.py
"""Add collection_runs table for persistent collection status tracking

Revision ID: 0010
Revises: 0009
Create Date: 2026-04-10

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "collection_runs",
        sa.Column("period_id", sa.String(10), primary_key=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("stage", sa.String(20), nullable=True),
        sa.Column("started_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime, nullable=True),
        sa.Column("error", sa.String(500), nullable=True),
        sa.Column("counts", sa.JSON, nullable=True),
        sa.Column("raw_counts", sa.JSON, nullable=True),
    )


def downgrade() -> None:
    op.drop_table("collection_runs")
```

- [ ] **Step 4: Commit**

```bash
git add ai-hub-backend/app/models/collection_run.py ai-hub-backend/app/models/__init__.py ai-hub-backend/alembic/versions/20260410_0010_add_collection_runs.py
git commit -m "feat: add CollectionRun model for persistent collection status tracking"
```

---

### Task 2: Persistent Collection Status in collector.py

Replace the in-memory `_collection_status` dict with DB-backed status.

**Files:**
- Modify: `ai-hub-backend/app/services/collector.py:32-55` (status functions)

- [ ] **Step 1: Replace in-memory status with DB-backed functions**

Replace lines 32-55 in `collector.py` (the `_collection_status` dict, `set_collection_status`, and `get_collection_status`) with:

```python
# ---------------------------------------------------------------------------
# Persistent collection status tracking (DB-backed, survives restarts)
# ---------------------------------------------------------------------------


def set_collection_status(
    period_id: str,
    status: str,
    stage: str = "",
    counts: dict | None = None,
    raw_counts: dict | None = None,
    error: str | None = None,
):
    """Update the persistent collection status for a period."""
    from app.database import get_session_local
    from app.models.collection_run import CollectionRun
    from datetime import datetime

    db = get_session_local()()
    try:
        run = db.query(CollectionRun).filter(CollectionRun.period_id == period_id).first()
        if not run:
            run = CollectionRun(
                period_id=period_id,
                status=status,
                started_at=datetime.utcnow(),
            )
            db.add(run)
        run.status = status
        if stage:
            run.stage = stage
        if counts is not None:
            run.counts = counts
        if raw_counts is not None:
            run.raw_counts = raw_counts
        if error is not None:
            run.error = error[:500] if error else None
        if status in ("completed", "failed", "empty"):
            run.completed_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        logger.warning(f"Failed to persist collection status for {period_id}: {e}")
        db.rollback()
    finally:
        db.close()


def get_collection_status(period_id: str) -> dict | None:
    """Return the current collection status for a period, or None if unknown."""
    from app.database import get_session_local
    from app.models.collection_run import CollectionRun

    db = get_session_local()()
    try:
        run = db.query(CollectionRun).filter(CollectionRun.period_id == period_id).first()
        if not run:
            return None
        result = {"status": run.status}
        if run.stage:
            result["stage"] = run.stage
        if run.counts:
            result["counts"] = run.counts
        if run.raw_counts:
            result["raw_counts"] = run.raw_counts
        if run.error:
            result["error"] = run.error
        if run.started_at:
            result["started_at"] = run.started_at.isoformat()
        if run.completed_at:
            result["completed_at"] = run.completed_at.isoformat()
        return result
    except Exception as e:
        logger.warning(f"Failed to read collection status for {period_id}: {e}")
        return None
    finally:
        db.close()
```

- [ ] **Step 2: Commit**

```bash
git add ai-hub-backend/app/services/collector.py
git commit -m "feat: replace in-memory collection status with DB-backed persistence"
```

---

### Task 3: Pre-save Validation + Atomic Replacement in Stage 4

Prevent empty results from wiping existing good data.

**Files:**
- Modify: `ai-hub-backend/app/services/collector.py` (clear_week_data, stage4_save_to_database, run_collection)

- [ ] **Step 1: Remove the standalone commit from clear_week_data**

In `collector.py`, replace the `clear_week_data` function (lines 246-256) — remove its `db.commit()` so it becomes part of a larger transaction:

```python
def clear_week_data(db: Session, week_id: str):
    """Clear existing processed data for a week. Does NOT commit — caller must commit."""
    db.query(TechPost).filter(TechPost.week_id == week_id).delete()
    db.query(Video).filter(Video.week_id == week_id).delete()
    db.query(PrimaryMarketPost).filter(PrimaryMarketPost.week_id == week_id).delete()
    db.query(SecondaryMarketPost).filter(SecondaryMarketPost.week_id == week_id).delete()
    db.query(MAPost).filter(MAPost.week_id == week_id).delete()
    db.query(TipPost).filter(TipPost.week_id == week_id).delete()
    db.query(Trend).filter(Trend.week_id == week_id).delete()
    logger.info(f"Cleared existing data for {week_id} (uncommitted)")
```

- [ ] **Step 2: Add pre-save validation to stage4_save_to_database**

Replace the opening of `stage4_save_to_database` (line 842-845). Change:

```python
    logger.info("=== Stage 4: Saving to Database ===")

    # Clear existing processed data
    clear_week_data(db, week_id)
```

To:

```python
    logger.info("=== Stage 4: Saving to Database ===")

    # --- Pre-save validation: reject empty results if raw data existed ---
    raw_article_count = db.query(RawArticle).filter(RawArticle.week_id == week_id).count()
    raw_video_count = db.query(RawVideo).filter(RawVideo.week_id == week_id).count()

    tech_count = len(results.get("tech", {}).get("de", []))
    tips_count = len(results.get("tips", {}).get("de", []))
    video_count = len(results.get("videos", {}).get("de", []))
    inv = results.get("investment", {})
    inv_count = (
        len(inv.get("primaryMarket", {}).get("de", []))
        + len(inv.get("secondaryMarket", {}).get("de", []))
        + len(inv.get("ma", {}).get("de", []))
    )
    total_output = tech_count + tips_count + video_count + inv_count

    if total_output == 0 and raw_article_count > 0:
        logger.error(
            f"VALIDATION FAILED: {raw_article_count} raw articles but 0 processed output. "
            f"Refusing to clear existing data for {week_id}."
        )
        set_collection_status(
            week_id, "empty",
            stage="stage4_validation",
            raw_counts={"articles": raw_article_count, "videos": raw_video_count},
        )
        return  # ← Do NOT clear or save — preserve existing data

    # Clear existing processed data (same transaction as inserts)
    clear_week_data(db, week_id)
```

- [ ] **Step 3: Save raw counts alongside processed counts in run_collection**

In `run_collection()`, after stage1 completes (line 1191), store the raw counts:

Replace:
```python
        # Stage 1: Fetch and store raw data
        stage1_fetch_and_store(db, week_id)
        set_collection_status(week_id, "running", stage="stage2")
```

With:
```python
        # Stage 1: Fetch and store raw data
        stage1_counts = stage1_fetch_and_store(db, week_id)
        set_collection_status(
            week_id, "running", stage="stage2",
            raw_counts=stage1_counts,
        )
```

- [ ] **Step 4: Fix the status count bug (primaryMarket key)**

In `run_collection()` at line 1218, fix the investment count key. Replace:

```python
            "investment": len(results.get("investment", {}).get("primary_market", {}).get("de", [])),
```

With:

```python
            "investment": len(results.get("investment", {}).get("primaryMarket", {}).get("de", [])),
```

- [ ] **Step 5: Wrap Stage 4 inserts + clear in a single atomic transaction**

At the END of `stage4_save_to_database`, find the existing `db.commit()` call and wrap it with a try/except rollback. The function should end like:

```python
    try:
        db.commit()
        logger.info(f"Saved all processed data for {week_id} (atomic commit)")
    except Exception as e:
        logger.error(f"Failed to save data for {week_id}, rolling back: {e}")
        db.rollback()
        raise
```

- [ ] **Step 6: Commit**

```bash
git add ai-hub-backend/app/services/collector.py
git commit -m "fix: add pre-save validation and atomic replacement to prevent empty data overwrite"
```

---

### Task 4: Processor Model Fallback Chain

**Files:**
- Modify: `ai-hub-backend/app/services/llm_processor.py:65-140`
- Modify: `ai-hub-backend/app/config.py:61`

- [ ] **Step 1: Add PROCESSOR_MODELS fallback chain**

In `llm_processor.py`, after the `CLASSIFIER_MODELS` list (line 77), add:

```python
    # Processor models in priority order (fallback chain).
    # Primary model is paid/high-quality; fallbacks are free but capable.
    PROCESSOR_MODELS = [
        "deepseek/deepseek-v3.2",
        "deepseek/deepseek-chat-v3-0324:free",
        "google/gemma-4-31b-it:free",
        "qwen/qwen3-next-80b-a3b-instruct:free",
    ]
```

- [ ] **Step 2: Rewrite _call_llm to use processor fallback chain**

Replace the `_call_llm` method (lines 91-140) with:

```python
    def _call_llm(self, prompt: str, temperature: float = 0.3, use_classifier: bool = False, timeout: float = 120.0) -> str:
        """Make an LLM API call with retry and fallback logic.

        Both classifier and processor use fallback chains.

        Args:
            prompt: The prompt to send
            temperature: Sampling temperature
            use_classifier: If True, use CLASSIFIER_MODELS; otherwise PROCESSOR_MODELS
            timeout: Request timeout in seconds (default 120s)

        Returns:
            LLM response content string

        Raises:
            Exception: Re-raises after all models/retries are exhausted
        """
        if use_classifier:
            return self._call_with_fallback(prompt, temperature, timeout)

        # Processor model: fallback chain with retries
        models = self.PROCESSOR_MODELS
        retries_per_model = 2
        base_delay = 2
        last_error = None

        for model in models:
            for attempt in range(retries_per_model):
                try:
                    response = self.client.chat.completions.create(
                        model=model,
                        messages=[{"role": "user", "content": prompt}],
                        temperature=temperature,
                        timeout=timeout,
                    )
                    if not response.choices or not response.choices[0].message:
                        logger.warning(f"Empty response from processor model {model}")
                        last_error = RuntimeError(f"Empty response from {model}")
                        break  # try next model
                    content = response.choices[0].message.content or ""
                    if not content.strip():
                        logger.warning(f"Blank content from processor model {model}")
                        last_error = RuntimeError(f"Blank content from {model}")
                        break  # try next model
                    logger.info(f"Processor succeeded with model: {model}")
                    return content
                except RateLimitError as e:
                    last_error = e
                    delay = base_delay * (2 ** attempt)
                    logger.warning(f"Rate limited (429) on {model}, attempt {attempt + 1}/{retries_per_model}. "
                                   f"Retrying in {delay}s...")
                    if attempt < retries_per_model - 1:
                        time.sleep(delay)
                    else:
                        logger.warning(f"Processor model {model} exhausted, trying next fallback...")
                except Exception as e:
                    logger.error(f"Processor call failed on {model}: {e}")
                    last_error = e
                    break  # non-rate-limit error: skip to next model

        logger.error(f"All {len(models)} processor models exhausted")
        raise last_error or RuntimeError("All processor models failed")
```

- [ ] **Step 3: Remove hardcoded processor_model from __init__**

In `__init__` (line 89), remove:

```python
        self.processor_model = "deepseek/deepseek-v3.2"
```

(It's no longer needed — the fallback chain in `PROCESSOR_MODELS` replaces it.)

- [ ] **Step 4: Reduce LLM parallel workers to lower rate-limit pressure**

In `ai-hub-backend/app/config.py`, change line 61:

```python
    llm_max_workers: int = 2
```

- [ ] **Step 5: Commit**

```bash
git add ai-hub-backend/app/services/llm_processor.py ai-hub-backend/app/config.py
git commit -m "fix: add processor model fallback chain and reduce parallel workers"
```

---

### Task 5: Split Save — DE/EN Before Translations

Save base content after Stage 3 so content is visible even if Stage 3.5 translations fail or container restarts.

**Files:**
- Modify: `ai-hub-backend/app/services/collector.py` (run_collection, lines 1176-1226)

- [ ] **Step 1: Restructure run_collection to save before translating**

Replace `run_collection` (lines 1176-1226) with:

```python
def run_collection(db: Session, week_id: Optional[str] = None):
    """
    Run the full data collection pipeline (all stages).

    Args:
        db: Database session
        week_id: Week ID or None for current day
    """
    week_id = week_id or current_day_id()

    logger.info(f"Starting full collection for {week_id}")
    set_collection_status(week_id, "running", stage="stage1")

    try:
        # Stage 1: Fetch and store raw data
        stage1_counts = stage1_fetch_and_store(db, week_id)
        set_collection_status(week_id, "running", stage="stage2", raw_counts=stage1_counts)

        # Initialize LLM processor
        processor = LLMProcessor()

        # Stage 2: Classification
        stage2_classify_articles(db, week_id, processor)
        set_collection_status(week_id, "running", stage="stage3")

        # Stage 3: Parallel processing (produces DE + EN)
        results = stage3_parallel_processing(db, week_id, processor)
        set_collection_status(week_id, "running", stage="stage4_base")

        # Load raw videos for metadata
        raw_videos = db.query(RawVideo).filter(RawVideo.week_id == week_id).all()

        # Stage 4a: Save base DE/EN content immediately
        # This makes content visible even if translations fail
        stage4_save_to_database(db, week_id, results, raw_videos)

        counts = {
            "tech": len(results.get("tech", {}).get("de", [])),
            "tips": len(results.get("tips", {}).get("de", [])),
            "investment": len(results.get("investment", {}).get("primaryMarket", {}).get("de", [])),
            "videos": len(results.get("videos", {}).get("de", [])),
        }

        if sum(counts.values()) == 0:
            set_collection_status(week_id, "empty", stage="stage4_base", counts=counts)
            logger.warning(f"Collection produced 0 items for {week_id}")
            return

        # Stage 3.5: Translate EN content to 6 additional languages
        # Now runs AFTER base save — failures here are non-blocking
        set_collection_status(week_id, "running", stage="stage3_5")
        try:
            stage3_5_translate_content(results)
            _backfill_translations_to_db(db, week_id, results)
            logger.info(f"Translations saved for {week_id}")
        except Exception as e:
            logger.warning(f"Translation stage failed (non-fatal): {e}")
            # Base DE/EN content is already saved — translations will be missing
            # but content is still accessible

        set_collection_status(week_id, "completed", stage="done", counts=counts)
        logger.info(f"Collection complete for {week_id}")
    except Exception as e:
        set_collection_status(week_id, "failed", error=str(e))
        logger.error(f"Collection failed for {week_id}: {e}")
        raise
```

- [ ] **Step 2: Add _backfill_translations_to_db helper**

Add this helper function before `run_collection` in `collector.py`:

```python
def _backfill_translations_to_db(db: Session, week_id: str, results: dict):
    """
    Update already-saved records with translations from Stage 3.5.

    Stage 3.5 mutates `results` in place, adding `_translations` dicts
    to each EN item. This function reads those translations and writes
    them to the corresponding DB records.
    """
    from app.services.i18n_utils import TRANSLATION_LANGUAGES

    def _update_translations(model_cls, items_key, results_data):
        """Update translations for a set of records."""
        en_items = results_data.get(items_key, {}).get("en", [])
        if not en_items:
            return
        records = (
            db.query(model_cls)
            .filter(model_cls.week_id == week_id)
            .order_by(model_cls.id)
            .all()
        )
        for i, record in enumerate(records):
            if i < len(en_items):
                trans = en_items[i].get("_translations")
                if trans:
                    record.translations = trans

    _update_translations(TechPost, "tech", results)
    _update_translations(Video, "videos", results)
    _update_translations(TipPost, "tips", results)

    # Investment sub-sections
    inv = results.get("investment", {})
    if isinstance(inv, dict):
        pm_en = inv.get("primaryMarket", {}).get("en", [])
        if pm_en:
            records = db.query(PrimaryMarketPost).filter(PrimaryMarketPost.week_id == week_id).order_by(PrimaryMarketPost.id).all()
            for i, record in enumerate(records):
                if i < len(pm_en) and pm_en[i].get("_translations"):
                    record.translations = pm_en[i]["_translations"]

        sm_en = inv.get("secondaryMarket", {}).get("en", [])
        if sm_en:
            records = db.query(SecondaryMarketPost).filter(SecondaryMarketPost.week_id == week_id).order_by(SecondaryMarketPost.id).all()
            for i, record in enumerate(records):
                if i < len(sm_en) and sm_en[i].get("_translations"):
                    record.translations = sm_en[i]["_translations"]

        ma_en = inv.get("ma", {}).get("en", [])
        if ma_en:
            records = db.query(MAPost).filter(MAPost.week_id == week_id).order_by(MAPost.id).all()
            for i, record in enumerate(records):
                if i < len(ma_en) and ma_en[i].get("_translations"):
                    record.translations = ma_en[i]["_translations"]

    # Trends
    trends = results.get("trends", {})
    if isinstance(trends, dict):
        trends_section = trends.get("trends", {})
        trends_en = trends_section.get("en", []) if isinstance(trends_section, dict) else []
        if trends_en:
            records = db.query(Trend).filter(Trend.week_id == week_id).order_by(Trend.id).all()
            for i, record in enumerate(records):
                if i < len(trends_en) and trends_en[i].get("_translations"):
                    record.translations = trends_en[i]["_translations"]

    try:
        db.commit()
    except Exception as e:
        logger.warning(f"Failed to save translations for {week_id}: {e}")
        db.rollback()
```

- [ ] **Step 3: Commit**

```bash
git add ai-hub-backend/app/services/collector.py
git commit -m "fix: save DE/EN content before translations — content visible earlier, translations non-blocking"
```

---

### Task 6: Update Admin Status Endpoint

**Files:**
- Modify: `ai-hub-backend/app/routers/admin.py` (collection_status endpoint, lines 802-820)

- [ ] **Step 1: Update status endpoint to use DB-backed status**

The `collection_status` endpoint already calls `get_collection_status()` which we updated in Task 2. No code change needed here — the function signature is unchanged.

However, add a "check if running too long" indicator. Replace the endpoint (lines 802-820):

```python
@router.get("/collect/status")
async def collection_status(
    period_id: str,
    _: bool = Depends(verify_api_key),
):
    """
    Get the current status of a collection run for a given period.

    Returns status: "running", "completed", "failed", "empty", or "unknown".
    DB-backed — survives container restarts.

    Requires X-API-Key header.
    """
    from app.services.collector import get_collection_status

    status = get_collection_status(period_id)
    if status is None:
        return {"period_id": period_id, "status": "unknown"}
    return {"period_id": period_id, **status}
```

- [ ] **Step 2: Commit**

```bash
git add ai-hub-backend/app/routers/admin.py
git commit -m "fix: update admin status endpoint docs for DB-backed collection status"
```

---

### Task 7: Fix GH Actions Workflow — Status Polling + Retry + Failure Exit

**Files:**
- Modify: `.github/workflows/daily-collect.yml`

- [ ] **Step 1: Rewrite the workflow with status-based polling and retry**

Replace the entire `.github/workflows/daily-collect.yml` with:

```yaml
name: Daily Collection

on:
  schedule:
    # Fire at both possible UTC slots, then gate in script to Berlin 23:xx.
    - cron: "7 21 * * *"
    - cron: "7 22 * * *"
  workflow_dispatch:
    inputs:
      period_id:
        description: "Period ID (e.g. 2026-02-08 or 2026-kw06)"
        required: false

jobs:
  collect:
    name: Trigger daily collection
    runs-on: ubuntu-latest
    steps:
      - name: Determine period
        id: period
        run: |
          if [ "${{ github.event_name }}" = "schedule" ]; then
            BERLIN_HOUR=$(TZ=Europe/Berlin date +%H)
            if [ "$BERLIN_HOUR" != "23" ]; then
              echo "Skip: now is not 23:xx in Europe/Berlin (hour=$BERLIN_HOUR)"
              echo "SKIP=true" >> "$GITHUB_OUTPUT"
              exit 0
            fi
          fi

          PERIOD="${{ github.event.inputs.period_id }}"
          if [ -z "$PERIOD" ]; then
            PERIOD=$(TZ=Europe/Berlin date +%F)
          fi
          echo "PERIOD=$PERIOD" >> "$GITHUB_OUTPUT"
          echo "SKIP=false" >> "$GITHUB_OUTPUT"

      - name: Trigger collection
        id: trigger
        if: steps.period.outputs.SKIP != 'true'
        run: |
          set +e
          PERIOD="${{ steps.period.outputs.PERIOD }}"

          URL="${{ secrets.API_BASE_URL }}/admin/collect?week_id=${PERIOD}"
          echo "Triggering async collection: $URL"

          HTTP_CODE=$(curl -sS -o response.json -w "%{http_code}" \
            -X POST "$URL" \
            -H "X-API-Key: ${{ secrets.ADMIN_API_KEY }}" \
            --http1.1 \
            --max-time 60)

          if [ -f response.json ]; then cat response.json; echo ""; fi

          if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
            echo "Collection triggered (HTTP $HTTP_CODE)"
            echo "TRIGGERED=true" >> "$GITHUB_OUTPUT"
          else
            echo "ERROR: API returned HTTP $HTTP_CODE"
            echo "TRIGGERED=false" >> "$GITHUB_OUTPUT"
            exit 1
          fi

      - name: Wait for collection to complete
        id: poll
        if: steps.trigger.outputs.TRIGGERED == 'true'
        run: |
          PERIOD="${{ steps.period.outputs.PERIOD }}"
          echo "Polling collection status for $PERIOD (up to 35 min)..."

          # Poll /admin/collect/status every 60s, up to 35 minutes
          for i in $(seq 1 35); do
            STATUS_JSON=$(curl -sS \
              "${{ secrets.API_BASE_URL }}/admin/collect/status?period_id=${PERIOD}" \
              -H "X-API-Key: ${{ secrets.ADMIN_API_KEY }}" \
              --http1.1 \
              --max-time 30)

            STATUS=$(echo "$STATUS_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null || echo "unknown")

            echo "Attempt $i/35: status=$STATUS"

            if [ "$STATUS" = "completed" ]; then
              echo "Collection completed for $PERIOD"
              echo "RESULT=completed" >> "$GITHUB_OUTPUT"
              exit 0
            elif [ "$STATUS" = "failed" ] || [ "$STATUS" = "empty" ]; then
              echo "Collection $STATUS for $PERIOD"
              echo "RESULT=$STATUS" >> "$GITHUB_OUTPUT"
              exit 0
            fi

            sleep 60
          done

          echo "WARNING: Collection still running after 35 minutes"
          echo "RESULT=timeout" >> "$GITHUB_OUTPUT"

      - name: Retry on failure
        id: retry
        if: steps.poll.outputs.RESULT == 'failed' || steps.poll.outputs.RESULT == 'empty'
        run: |
          PERIOD="${{ steps.period.outputs.PERIOD }}"
          echo "Retrying collection for $PERIOD (attempt 2)..."

          HTTP_CODE=$(curl -sS -o retry-response.json -w "%{http_code}" \
            -X POST "${{ secrets.API_BASE_URL }}/admin/collect?week_id=${PERIOD}" \
            -H "X-API-Key: ${{ secrets.ADMIN_API_KEY }}" \
            --http1.1 \
            --max-time 60)

          if [ -f retry-response.json ]; then cat retry-response.json; echo ""; fi

          if [ "$HTTP_CODE" -lt 200 ] || [ "$HTTP_CODE" -ge 300 ]; then
            echo "Retry trigger failed (HTTP $HTTP_CODE)"
            echo "RETRY_OK=false" >> "$GITHUB_OUTPUT"
            exit 1
          fi

          echo "Retry triggered, polling again (up to 35 min)..."
          for i in $(seq 1 35); do
            STATUS=$(curl -sS \
              "${{ secrets.API_BASE_URL }}/admin/collect/status?period_id=${PERIOD}" \
              -H "X-API-Key: ${{ secrets.ADMIN_API_KEY }}" \
              --http1.1 --max-time 30 \
              | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null || echo "unknown")

            echo "Retry attempt $i/35: status=$STATUS"

            if [ "$STATUS" = "completed" ]; then
              echo "Retry succeeded for $PERIOD"
              echo "RETRY_OK=true" >> "$GITHUB_OUTPUT"
              exit 0
            elif [ "$STATUS" = "failed" ] || [ "$STATUS" = "empty" ]; then
              echo "Retry also $STATUS for $PERIOD"
              echo "RETRY_OK=false" >> "$GITHUB_OUTPUT"
              exit 1
            fi

            sleep 60
          done

          echo "Retry timed out for $PERIOD"
          echo "RETRY_OK=false" >> "$GITHUB_OUTPUT"
          exit 1

      - name: Send newsletter
        if: steps.poll.outputs.RESULT == 'completed' || steps.retry.outputs.RETRY_OK == 'true'
        run: |
          set +e
          PERIOD="${{ steps.period.outputs.PERIOD }}"
          echo "Sending newsletter for period: $PERIOD"
          HTTP_CODE=$(curl -sS -o nl-response.json -w "%{http_code}" \
            -X POST "${{ secrets.API_BASE_URL }}/admin/newsletter?period_id=${PERIOD}&wait=true" \
            -H "X-API-Key: ${{ secrets.ADMIN_API_KEY }}" \
            --http1.1 \
            --max-time 300)
          if [ -f nl-response.json ]; then cat nl-response.json; echo ""; fi
          if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
            echo "Newsletter sent successfully (HTTP $HTTP_CODE)"
          else
            echo "WARNING: Newsletter API returned HTTP $HTTP_CODE — non-fatal"
          fi
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/daily-collect.yml
git commit -m "fix: GH Actions — status-based polling, retry on failure, increased timeout to 35 min"
```

---

### Task 8: Deploy + Verify

- [ ] **Step 1: Type check the backend**

Run: `cd ai-hub-backend && python -c "from app.models import CollectionRun; print('OK')"`

- [ ] **Step 2: Deploy backend to Railway**

```bash
cd ai-hub-backend && railway up -d -s api
```

Wait for build + deploy (~3 min). The `railway.toml` runs `alembic upgrade head` on startup, which will create the `collection_runs` table automatically.

- [ ] **Step 3: Verify migration ran**

```bash
curl -s "https://api-production-3ee5.up.railway.app/api/admin/collect/status?period_id=2026-04-10" \
  -H "X-API-Key: $ADMIN_API_KEY"
```

Expected: `{"period_id": "2026-04-10", "status": "unknown"}` (no run yet, but endpoint works)

- [ ] **Step 4: Manually trigger a collection to test the full flow**

```bash
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect?week_id=2026-04-10" \
  -H "X-API-Key: $ADMIN_API_KEY"
```

Then poll status every 2 min:

```bash
curl -s "https://api-production-3ee5.up.railway.app/api/admin/collect/status?period_id=2026-04-10" \
  -H "X-API-Key: $ADMIN_API_KEY"
```

Expected: status transitions `running` → `completed` (with counts) or `failed` (with error).

- [ ] **Step 5: Deploy frontend (for the daily→weekly fallback from earlier)**

```bash
cd ai-information-hub && vercel --prod
```

- [ ] **Step 6: Commit remaining changes (if any unstaged)**

```bash
git add -A && git status
```
