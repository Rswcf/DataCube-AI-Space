# Translation Alignment Hotfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop non-English content from carrying another story's translation, detect and repair misaligned/missing translations, and never send a newsletter language that carries another story's text or is mostly untranslated.

**Architecture:** A stdlib-only integrity module stamps every translation with a hash of its English source (`_src`). The collector matches saved rows to their English items by identity instead of position, retries translation gaps once, and a backfill service repairs rows using that status. The newsletter holds a language when any row is stale or at least half of its rows are not ready; otherwise it sends with English fallback and reports warnings.

**Tech Stack:** Python 3.11 (CI) / 3.12 (local venv), FastAPI, SQLAlchemy 2, PostgreSQL 16, pytest.

**Spec:** `docs/superpowers/specs/2026-09-13-translation-alignment-hotfix-design.md`

## Global Constraints

- Repo root: `<repo-root>`; backend directory `ai-hub-backend/`. Run git commands from the repo root; run tests/lint from `ai-hub-backend/`.
- Python for everything: `venv312/bin/python` (inside `ai-hub-backend/`). CI uses Python 3.11 — no 3.12-only syntax.
- **NEVER run pytest, alembic or any script without exporting a local `DATABASE_URL` in the same command.** `ai-hub-backend/.env` points at the production database and integration tests delete rows.
  - Unit: `DATABASE_URL=sqlite:///./test.db`
  - Integration: `DATABASE_URL=postgresql://postgres:test@localhost:5433/aihub_test`
- Unit suite command: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db venv312/bin/python -m pytest -m "not integration" -q`
- Integration suite command: `cd <repo-root>/ai-hub-backend && DATABASE_URL=postgresql://postgres:test@localhost:5433/aihub_test venv312/bin/python -m pytest -m integration -q`
- Lint command (must pass before every commit): `cd <repo-root>/ai-hub-backend && venv312/bin/ruff check app/ scripts/ tests/`
- Integrity marker key is exactly `_src`; value is the first 16 lowercase hex chars of SHA-256 over `json.dumps([normalized values], ensure_ascii=False, separators=(",", ":"))`; normalization: `None → ""`, everything else `str(value).strip()`.
- Source fields per section kind, exactly: `tech: [content]`, `video: [title, summary]`, `tip: [content, tip]`, `primary_market: [content]`, `secondary_market: [content]`, `ma: [content]`, `trend: [title]`.
- German text lives in `<field>_de` columns; the JSONB `translations["de"]` entry stores only `{"_src": ...}`. Keys starting with `_` are never written to `_de` columns.
- Translation statuses are exactly `ok`, `missing`, `stale`, `untranslated`.
- Do not deploy, push, call production URLs, run `next build`, or edit files not listed in your task.
- Commit once per task with the exact message given; do not amend earlier commits.

## Local database (controller prepares before Task 1)

```bash
docker start aihub-test-pg 2>/dev/null || docker run -d --name aihub-test-pg -e POSTGRES_PASSWORD=test -e POSTGRES_DB=aihub_test -p 5433:5432 postgres:16
cd <repo-root>/ai-hub-backend && DATABASE_URL=postgresql://postgres:test@localhost:5433/aihub_test venv312/bin/alembic upgrade head
```

## Release and data repair (controller only, after all tasks and founder approval)

1. Push branch `fix/translation-alignment`, open a PR, wait for green CI.
2. Ask the founder for deploy approval. Then merge and run `railway up -d -s api` from `ai-hub-backend/` (no migrations in this change).
3. Size the repair (read-only): `railway run -s api -- sh -c 'curl -sS -X POST "https://api-production-3ee5.up.railway.app/api/admin/backfill-translations?since=2026-08-01&dry_run=true" -H "X-API-Key: $ADMIN_API_KEY"'`.
4. Repair the latest day first: `...?period_id=<latest day>&cheap=true` (no `force`: legacy rows have no `_src`, so they are selected anyway; `force` only re-translates rows that are already correct); verify on `GET /api/tech/<latest day>` that every non-EN item translates its own EN item and that `category`/`tags` are present.
5. Repair the rest: `...?since=2026-08-01&cheap=true`; repeat the dry run until `periods` is empty.
6. Next morning: newsletter result has empty `held_languages`; the next collection run reports `counts.translation_gaps` = 0.

## File Structure

| File | Responsibility |
|---|---|
| `ai-hub-backend/pytest.ini` (create) | test paths + `integration` marker |
| `ai-hub-backend/tests/conftest.py` (modify) | import path + refuse non-local databases |
| `ai-hub-backend/tests/test_conftest_guard.py` (create) | guard unit tests |
| `ai-hub-backend/tests/test_deals_integration.py` (modify) | mark as integration |
| `.github/workflows/ci.yml` (modify) | run all unit tests / all integration tests |
| `ai-hub-backend/app/services/translation_integrity.py` (create) | `_src` hashing, statuses, send-gate counts (stdlib only) |
| `ai-hub-backend/tests/test_translation_integrity.py` (create) | unit tests for the integrity module |
| `ai-hub-backend/app/services/collector.py` (modify) | identity mapping, `_src` stamping, German marker, stage 3.5 retry, M&A-only save |
| `ai-hub-backend/tests/test_translation_alignment_integration.py` (create) | end-to-end alignment regression |
| `ai-hub-backend/tests/test_stage3_5_translation_retry.py` (create) | retry/gap unit tests |
| `ai-hub-backend/app/services/llm_processor.py` (modify) | `models` parameter + cheap translator chain |
| `ai-hub-backend/app/services/translation_backfill.py` (create) | plan / translate / write-back repair service |
| `ai-hub-backend/tests/test_translation_backfill_integration.py` (create) | backfill + admin dry-run tests |
| `ai-hub-backend/app/routers/admin.py` (modify) | backfill endpoint, patch `_src`, 502 on held newsletter |
| `ai-hub-backend/scripts/backfill_translations.py` (modify) | CLI wrapper over the backfill service |
| `ai-hub-backend/app/services/newsletter_sender.py` (modify) | translation send gate |
| `ai-hub-backend/tests/test_newsletter_translation_gate.py` (create) | send-gate unit tests |
| `ai-hub-backend/tests/test_ma_only_save_integration.py` (create) | M&A-only save regression |

---

### Task 1: Test database guard, markers and CI test runs

**Files:**
- Create: `ai-hub-backend/pytest.ini`
- Modify: `ai-hub-backend/tests/conftest.py` (whole file)
- Create: `ai-hub-backend/tests/test_conftest_guard.py`
- Modify: `ai-hub-backend/tests/test_deals_integration.py` (add one line after the imports)
- Modify: `.github/workflows/ci.yml` (two steps)

**Interfaces:**
- Produces: `database_url_is_local(url: str) -> bool` in `tests/conftest.py`; pytest marker `integration`.

- [ ] **Step 1: Write the failing test** — create `ai-hub-backend/tests/test_conftest_guard.py`:

```python
"""The test-database guard accepts only local databases."""

from conftest import database_url_is_local


def test_sqlite_is_local():
    assert database_url_is_local("sqlite:///./test.db")


def test_localhost_postgres_is_local():
    assert database_url_is_local("postgresql://postgres:test@localhost:5433/aihub_test")
    assert database_url_is_local("postgresql://postgres:test@127.0.0.1:5432/aihub_test")


def test_remote_postgres_is_rejected():
    assert not database_url_is_local("postgresql://user:secret@db.example-host.railway.app:5432/railway")
    assert not database_url_is_local("postgresql://user:secret@10.0.0.5:5432/app")
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db venv312/bin/python -m pytest tests/test_conftest_guard.py -q`
Expected: collection error `ImportError: cannot import name 'database_url_is_local' from 'conftest'`.

- [ ] **Step 3: Implement** — replace the whole content of `ai-hub-backend/tests/conftest.py` with:

```python
"""Pytest bootstrap for the backend test suite.

1. Make the backend package root importable.
2. Refuse to run against a non-local database: `app/config.py` reads `.env`,
   which can point at production, and the integration tests delete rows.
"""

import pathlib
import sys
from urllib.parse import urlparse

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

LOCAL_DB_HOSTS = {"localhost", "127.0.0.1", "::1"}


def database_url_is_local(url: str) -> bool:
    """True for sqlite URLs and URLs whose host is this machine."""
    if url.startswith("sqlite"):
        return True
    return (urlparse(url).hostname or "") in LOCAL_DB_HOSTS


def pytest_configure(config):
    from app.config import get_settings

    url = get_settings().database_url
    if not database_url_is_local(url):
        pytest.exit(
            "Refusing to run tests: DATABASE_URL is not a local database. Export one first, "
            "e.g. DATABASE_URL=postgresql://postgres:test@localhost:5433/aihub_test (integration) "
            "or DATABASE_URL=sqlite:///./test.db (unit).",
            returncode=2,
        )
```

Create `ai-hub-backend/pytest.ini`:

```ini
[pytest]
testpaths = tests
markers =
    integration: needs a local PostgreSQL database (select with -m integration)
```

In `ai-hub-backend/tests/test_deals_integration.py`, find the line:

```python
import app.routers.deals as deals_router
```

and add directly below it (blank line, then):

```python

pytestmark = pytest.mark.integration
```

In `.github/workflows/ci.yml`, replace:

```yaml
      - name: Unit tests (deals normalization contracts)
        run: python tests/test_deal_utils.py
```

with:

```yaml
      - name: Unit tests (pytest, no database)
        run: |
          pip install pytest
          python -m pytest -m "not integration" -q
        env:
          DATABASE_URL: sqlite:///./test.db
          OPENROUTER_API_KEY: test-key-for-ci
          ADMIN_API_KEY: test-key-for-ci
```

and replace:

```yaml
      - name: Deals-layer integration tests
        run: python -m pytest tests/test_deals_integration.py -v
```

with:

```yaml
      - name: Integration tests (PostgreSQL)
        run: python -m pytest -m integration -v
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db venv312/bin/python -m pytest -m "not integration" -q`
Expected: `15 passed, 12 deselected` (12 deal_utils + 3 guard tests; the 12 deals integration tests deselected).

Run the guard against a fake remote host (safe — nothing reachable there):
`cd <repo-root>/ai-hub-backend && DATABASE_URL=postgresql://user:x@db.invalid.example:5432/x venv312/bin/python -m pytest -q; echo "exit=$?"`
Expected: output contains `Refusing to run tests` and `exit=2`.

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=postgresql://postgres:test@localhost:5433/aihub_test venv312/bin/python -m pytest -m integration -q`
Expected: `12 passed`.

Run the lint command from Global Constraints. Expected: `All checks passed!`

- [ ] **Step 5: Commit**

```bash
cd <repo-root>
git add ai-hub-backend/pytest.ini ai-hub-backend/tests/conftest.py ai-hub-backend/tests/test_conftest_guard.py ai-hub-backend/tests/test_deals_integration.py .github/workflows/ci.yml
git commit -m "test: refuse non-local test databases and run all backend tests in CI"
```

---

### Task 2: Translation integrity module

**Files:**
- Create: `ai-hub-backend/app/services/translation_integrity.py`
- Create: `ai-hub-backend/tests/test_translation_integrity.py`

**Interfaces:**
- Produces (module `app.services.translation_integrity`): `SRC_KEY = "_src"`; `SOURCE_FIELDS: dict[str, list[str]]`; `normalize_text(value) -> str`; `identity_key(values: list) -> tuple`; `source_hash(values: list) -> str`; `item_source_hash(item: dict, kind: str) -> str`; `record_source_hash(record, kind: str) -> str`; `entry_is_usable(item: dict, entry, kind: str) -> bool`; `translation_status(record, kind: str, lang: str) -> str`; `send_gate_counts(sections: dict, lang: str) -> dict` (keys `total`, `missing`, `stale`, `untranslated`); `gate_holds_language(counts: dict) -> bool`.

- [ ] **Step 1: Write the failing test** — create `ai-hub-backend/tests/test_translation_integrity.py`:

```python
"""Unit tests for translation integrity helpers (stdlib only)."""

import importlib.util
import pathlib
from types import SimpleNamespace

_spec = importlib.util.spec_from_file_location(
    "translation_integrity",
    pathlib.Path(__file__).parent.parent / "app/services/translation_integrity.py",
)
ti = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ti)


def _tech_row(content_en="OpenAI released a model.",
              content_de="OpenAI hat ein Modell veröffentlicht.", translations=None):
    return SimpleNamespace(content_en=content_en, content_de=content_de, translations=translations)


def _stamped(row, kind="tech", **langs):
    src = ti.record_source_hash(row, kind)
    row.translations = {lang: {**fields, ti.SRC_KEY: src} for lang, fields in langs.items()}
    return row


def test_source_hash_is_stable_and_normalized():
    assert ti.source_hash(["  Hello  "]) == ti.source_hash(["Hello"])
    assert ti.source_hash([None]) == ti.source_hash([""])
    assert len(ti.source_hash(["Hello"])) == 16
    assert ti.source_hash(["a", "b"]) != ti.source_hash(["b", "a"])


def test_item_and_record_hash_agree():
    item = {"content": "Tip body.", "tip": "Use X."}
    row = SimpleNamespace(content_en="Tip body.", tip_en="Use X.")
    assert ti.item_source_hash(item, "tip") == ti.record_source_hash(row, "tip")


def test_identity_key_normalizes():
    assert ti.identity_key([" a ", None]) == ("a", "")


def test_entry_is_usable():
    item = {"content": "OpenAI released a model."}
    assert ti.entry_is_usable(item, {"content": "OpenAI 发布了模型。"}, "tech")
    assert not ti.entry_is_usable(item, {"content": "OpenAI released a model."}, "tech")
    assert not ti.entry_is_usable(item, {}, "tech")
    assert not ti.entry_is_usable(item, None, "tech")


def test_status_en_is_always_ok():
    assert ti.translation_status(_tech_row(), "tech", "en") == "ok"


def test_status_ok_for_de_and_zh():
    row = _stamped(_tech_row(), de={}, zh={"content": "OpenAI 发布了模型。"})
    assert ti.translation_status(row, "tech", "de") == "ok"
    assert ti.translation_status(row, "tech", "zh") == "ok"


def test_status_missing_without_entry_or_marker():
    row = _tech_row(translations={"zh": {"content": "OpenAI 发布了模型。"}})
    assert ti.translation_status(row, "tech", "zh") == "missing"
    assert ti.translation_status(row, "tech", "fr") == "missing"


def test_status_stale_when_english_changed():
    row = _stamped(_tech_row(), zh={"content": "OpenAI 发布了模型。"})
    row.content_en = "A different story entirely."
    assert ti.translation_status(row, "tech", "zh") == "stale"


def test_status_untranslated_when_identical_to_english():
    row = _stamped(_tech_row(content_de="OpenAI released a model."),
                   de={}, zh={"content": "OpenAI released a model."})
    assert ti.translation_status(row, "tech", "de") == "untranslated"
    assert ti.translation_status(row, "tech", "zh") == "untranslated"


def test_send_gate_counts():
    good = _stamped(_tech_row(), zh={"content": "OpenAI 发布了模型。"})
    legacy = _tech_row(translations={"zh": {"content": "旧译文"}})
    assert ti.send_gate_counts({"tech": [good, legacy]}, "zh") == {
        "total": 2, "missing": 1, "stale": 0, "untranslated": 0,
    }
    assert ti.send_gate_counts({"tech": [legacy]}, "en") == {
        "total": 0, "missing": 0, "stale": 0, "untranslated": 0,
    }


def test_gate_holds_language():
    assert ti.gate_holds_language({"total": 10, "missing": 0, "stale": 1, "untranslated": 0})
    assert ti.gate_holds_language({"total": 4, "missing": 1, "stale": 0, "untranslated": 1})
    assert ti.gate_holds_language({"total": 1, "missing": 1, "stale": 0, "untranslated": 0})
    assert not ti.gate_holds_language({"total": 10, "missing": 1, "stale": 0, "untranslated": 1})
    assert not ti.gate_holds_language({"total": 0, "missing": 0, "stale": 0, "untranslated": 0})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db venv312/bin/python -m pytest tests/test_translation_integrity.py -q`
Expected: collection error `FileNotFoundError` for `app/services/translation_integrity.py`.

- [ ] **Step 3: Implement** — create `ai-hub-backend/app/services/translation_integrity.py`:

```python
"""Translation integrity helpers (stdlib only).

Every stored translation entry carries ``_src``: a 16-hex-char hash of the
English source text it was translated from. ``get_field`` reads only named
fields, so keys starting with ``_`` are invisible to API readers.

German text lives in the native ``<field>_de`` columns; its marker is kept at
``translations["de"]["_src"]``. The other languages live entirely in the
``translations`` JSONB column.
"""

import hashlib
import json

SRC_KEY = "_src"

# English fields whose text identifies a row and is hashed into ``_src``, per
# section kind. Each is saved verbatim from the English item (``_nn(v, "")``),
# so the hash computed from the item at translation time equals the hash
# computed later from the saved row.
SOURCE_FIELDS: dict[str, list[str]] = {
    "tech": ["content"],
    "video": ["title", "summary"],
    "tip": ["content", "tip"],
    "primary_market": ["content"],
    "secondary_market": ["content"],
    "ma": ["content"],
    "trend": ["title"],
}


def normalize_text(value) -> str:
    """None -> "", everything else -> stripped string."""
    if value is None:
        return ""
    return str(value).strip()


def identity_key(values: list) -> tuple:
    """Hashable identity used to match saved rows to the items they came from."""
    return tuple(normalize_text(v) for v in values)


def source_hash(values: list) -> str:
    """First 16 hex chars of SHA-256 over the normalized values (order matters)."""
    payload = json.dumps(list(identity_key(values)), ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def item_source_hash(item: dict, kind: str) -> str:
    """``_src`` for an English Stage-3 item of the given section kind."""
    return source_hash([item.get(field) for field in SOURCE_FIELDS[kind]])


def record_source_hash(record, kind: str) -> str:
    """``_src`` for a saved row, computed from its ``<field>_en`` columns."""
    return source_hash([getattr(record, f"{field}_en", None) for field in SOURCE_FIELDS[kind]])


def entry_is_usable(item: dict, entry, kind: str) -> bool:
    """True when ``entry`` holds real translated text for the English ``item``.

    The first non-empty source field decides: its translation must exist and
    differ from the English text.
    """
    if not isinstance(entry, dict):
        return False
    for field in SOURCE_FIELDS[kind]:
        english = normalize_text(item.get(field))
        if not english:
            continue
        localized = normalize_text(entry.get(field))
        return bool(localized) and localized != english
    return True


def translation_status(record, kind: str, lang: str) -> str:
    """Classify one saved row's translation: "ok", "missing", "stale" or "untranslated".

    - missing: no entry, no ``_src`` marker, or no translated text
    - stale: ``_src`` does not match the row's current English text
    - untranslated: the translated text is identical to the English text
    """
    if lang == "en":
        return "ok"
    translations = getattr(record, "translations", None)
    entry = translations.get(lang) if isinstance(translations, dict) else None
    if not isinstance(entry, dict) or not entry.get(SRC_KEY):
        return "missing"
    if entry[SRC_KEY] != record_source_hash(record, kind):
        return "stale"
    for field in SOURCE_FIELDS[kind]:
        english = normalize_text(getattr(record, f"{field}_en", None))
        if not english:
            continue
        if lang == "de":
            localized = normalize_text(getattr(record, f"{field}_de", None))
        else:
            localized = normalize_text(entry.get(field))
        if not localized:
            return "missing"
        if localized == english:
            return "untranslated"
        return "ok"
    return "ok"


def send_gate_counts(sections: dict, lang: str) -> dict:
    """Count one language's rows by translation readiness.

    ``sections`` maps a section kind to its rows, e.g.
    ``{"tech": [...], "primary_market": [...], "ma": [...], "tip": [...]}``.
    Returns ``{"total": n, "missing": n, "stale": n, "untranslated": n}``.
    English is always ready (all zeros).
    """
    counts = {"total": 0, "missing": 0, "stale": 0, "untranslated": 0}
    if lang == "en":
        return counts
    for kind, rows in sections.items():
        for row in rows:
            counts["total"] += 1
            status = translation_status(row, kind, lang)
            if status != "ok":
                counts[status] += 1
    return counts


def gate_holds_language(counts: dict) -> bool:
    """Hold a language when any row is stale (another text's translation) or
    at least half of its rows are not ready; otherwise it is sent with English
    fallback for the few rows that are not ready."""
    not_ready = counts["missing"] + counts["untranslated"]
    return counts["stale"] > 0 or (not_ready > 0 and not_ready * 2 >= counts["total"])
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db venv312/bin/python -m pytest tests/test_translation_integrity.py -q`
Expected: `11 passed`.

Run the unit suite command and the lint command from Global Constraints. Expected: all pass.

- [ ] **Step 5: Commit**

```bash
cd <repo-root>
git add ai-hub-backend/app/services/translation_integrity.py ai-hub-backend/tests/test_translation_integrity.py
git commit -m "feat: translation integrity helpers (source hash, status, send gate)"
```

---

### Task 3: Match translations to saved rows by identity and stamp `_src`

**Files:**
- Modify: `ai-hub-backend/app/services/collector.py` (7 edits below)
- Create: `ai-hub-backend/tests/test_translation_alignment_integration.py`

**Interfaces:**
- Consumes (Task 2): `SRC_KEY`, `identity_key`, `item_source_hash`, `source_hash`, `translation_status`.
- Produces (collector.py): `_jsonb_view(translations) -> dict | None`; `_jsonb_translations(item: dict) -> dict | None` (same name, new behavior); `_video_translations_for_tech_row(item: dict, translations: dict) -> dict`; `_store_translations(section_name: str, items: list, translated: list, target_lang: str, name_map: dict) -> None`; `_match_by_identity(records: list, en_items: list, record_key, item_key) -> list`; `_apply_translations_to_record(record, trans) -> None` (same name, keeps German marker); `_backfill_translations_to_db(db, week_id, results)` (same name, identity mapping).

- [ ] **Step 1: Write the failing test** — create `ai-hub-backend/tests/test_translation_alignment_integration.py`:

```python
"""Stage 3.5 translations land on the rows they were translated for.

Regression for the 2026-08 misalignment: translations were written onto saved
rows by position, so interleaved video rows shifted later tech cards onto
another story's text and left the last rows untranslated.

Requires local PostgreSQL (see tests/conftest.py and pytest.ini).
"""

from datetime import date

import pytest

import app.services.collector as collector
from app.database import get_session_local
from app.models import (
    MAPost, PrimaryMarketPost, SecondaryMarketPost, TechPost, TipPost, Trend, Video, Week,
)
from app.services.i18n_utils import TRANSLATION_LANGUAGES
from app.services.translation_integrity import translation_status

pytestmark = pytest.mark.integration

WEEK_ID = "2026-08-02"
VIDEO_IDS = ["vidalign0001", "vidalign0002"]


class FakeTranslator:
    """Deterministic stand-in for LLMProcessor: prefixes text with the language."""

    def translate_batch(self, items, target_lang, fields, batch_size=10, models=None):
        out = []
        for item in items:
            entry = {}
            for field in fields:
                value = item.get(field)
                if isinstance(value, str):
                    entry[field] = f"[{target_lang}] {value}"
                elif isinstance(value, list):
                    entry[field] = [f"[{target_lang}] {v}" for v in value]
            out.append(entry)
        return out


@pytest.fixture()
def db():
    session = get_session_local()()
    yield session
    session.rollback()
    session.close()


@pytest.fixture(autouse=True)
def clean_period(db, monkeypatch):
    monkeypatch.setattr(collector, "LLMProcessor", FakeTranslator)
    for model_cls in (TechPost, Video, TipPost, PrimaryMarketPost, SecondaryMarketPost, MAPost, Trend):
        db.query(model_cls).filter(model_cls.week_id == WEEK_ID).delete()
    db.query(Video).filter(Video.video_id.in_(VIDEO_IDS)).delete(synchronize_session=False)
    if not db.query(Week).filter(Week.id == WEEK_ID).first():
        db.add(Week(
            id=WEEK_ID, label="Aug 2", year=2026, week_num=None,
            date_range="02.08.", is_current=False, period_type="day",
            sort_date=date(2026, 8, 2),
        ))
    db.commit()
    yield


def _results():
    tech = [
        {
            "content": f"Story {i}: a distinct AI news item number {i}.",
            "category": "AI", "tags": ["AI"], "iconType": "Brain", "impact": "medium",
            "timestamp": "2026-08-02", "source": "Example",
            "sourceUrl": f"https://example.com/story-{i}",
        }
        for i in range(10)
    ]
    videos = [
        {"video_id": vid, "title": f"Video {n}", "summary": f"Video summary {n}.", "category": "Video"}
        for n, vid in enumerate(VIDEO_IDS)
    ]
    tips = [{
        "content": "Tip context A.", "tip": "Do A.", "category": "Prompting",
        "difficulty": "Beginner", "platform": "Reddit", "timestamp": "2026-08-02",
        "sourceUrl": "https://example.com/tip-a",
    }]
    return {
        "tech": {"en": tech},
        "videos": {"en": videos},
        "tips": {"en": tips},
        "investment": {"primaryMarket": {"en": []}, "secondaryMarket": {"en": []}, "ma": {"en": []}},
        "trends": {"trends": {"en": [{"category": "AI", "title": "Agents"}]}},
    }


def _assert_tech_rows_aligned(db):
    rows = (
        db.query(TechPost).filter(TechPost.week_id == WEEK_ID)
        .order_by(TechPost.display_order).all()
    )
    assert len(rows) == 12
    assert sum(1 for r in rows if r.is_video) == 2
    for row in rows:
        assert row.content_de == f"[de] {row.content_en}", row.display_order
        for lang in TRANSLATION_LANGUAGES:
            assert translation_status(row, "tech", lang) == "ok", (row.display_order, lang)
            if lang != "de":
                assert row.translations[lang]["content"] == f"[{lang}] {row.content_en}"


def test_full_collection_order_aligns_translations(db):
    """Production order: save first, translate, then write translations back."""
    results = _results()
    collector.stage4_save_to_database(db, WEEK_ID, results, [])
    collector.stage3_5_translate_content(results)
    collector._backfill_translations_to_db(db, WEEK_ID, results)
    db.expire_all()

    _assert_tech_rows_aligned(db)
    tip = db.query(TipPost).filter(TipPost.week_id == WEEK_ID).one()
    assert translation_status(tip, "tip", "zh") == "ok"
    video = db.query(Video).filter(Video.video_id == VIDEO_IDS[1]).one()
    assert video.summary_de == "[de] Video summary 1."
    assert translation_status(video, "video", "ja") == "ok"
    trend = db.query(Trend).filter(Trend.week_id == WEEK_ID).one()
    assert trend.title_de == "[de] Agents"


def test_process_only_order_aligns_translations(db):
    """Process-only order: translate first, then save."""
    results = _results()
    collector.stage3_5_translate_content(results)
    collector.stage4_save_to_database(db, WEEK_ID, results, [])
    db.expire_all()

    _assert_tech_rows_aligned(db)
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=postgresql://postgres:test@localhost:5433/aihub_test venv312/bin/python -m pytest tests/test_translation_alignment_integration.py -q`
Expected: `2 failed` — assertion errors in `_assert_tech_rows_aligned` (a row's `content_de` belongs to another story, or a status is `missing`).

- [ ] **Step 3: Implement — edit `ai-hub-backend/app/services/collector.py`**

Edit 3a — imports. Find:

```python
from app.services.llm_processor import LLMProcessor
```

Replace with:

```python
from app.services.llm_processor import LLMProcessor
from app.services.translation_integrity import (
    SRC_KEY, identity_key, item_source_hash, source_hash,
)
```

Edit 3b — find the whole function:

```python
def _jsonb_translations(item: dict):
    """Translations destined for the JSONB column: everything except 'de'.

    German lives in the native `_de` columns (mirrored/backfilled), so
    storing it in JSONB as well would be duplication `get_field` never reads.
    """
    translations = item.get("_translations")
    if not isinstance(translations, dict):
        return None
    filtered = {k: v for k, v in translations.items() if k != "de"}
    return filtered or None
```

Replace with:

```python
def _jsonb_view(translations):
    """Translations as stored in the JSONB column.

    German text lives in the native `_de` columns, so under "de" only its
    integrity marker (``{"_src": ...}``) is stored; every other language is
    stored whole. ``get_field`` never reads JSONB for German.
    """
    if not isinstance(translations, dict):
        return None
    stored = {}
    for lang, fields in translations.items():
        if lang == "de":
            if isinstance(fields, dict) and fields.get(SRC_KEY):
                stored["de"] = {SRC_KEY: fields[SRC_KEY]}
        else:
            stored[lang] = fields
    return stored or None


def _jsonb_translations(item: dict):
    """JSONB value for a row saved from an EN item (see `_jsonb_view`)."""
    return _jsonb_view(item.get("_translations"))


def _video_translations_for_tech_row(item: dict, translations: dict) -> dict:
    """Map a video's translations (title/summary) onto its tech-feed row (content).

    The tech-feed row stores the video summary as `content`, so its integrity
    marker is the hash of the English summary (kind "tech" hashes `content`).
    """
    src = source_hash([item.get("summary")])
    mapped = {}
    for lang, fields in (translations or {}).items():
        if isinstance(fields, dict):
            mapped[lang] = {"content": fields.get("summary"), SRC_KEY: src}
    return mapped
```

Edit 3c — inside `_mirror_de_from_translations`, find:

```python
            if de_fields:
                for db_name, value in de_fields.items():
                    de_item[reverse.get(db_name, db_name)] = value
```

Replace with:

```python
            if de_fields:
                for db_name, value in de_fields.items():
                    if db_name.startswith("_"):
                        continue
                    de_item[reverse.get(db_name, db_name)] = value
```

Edit 3d — find:

```python
def stage3_5_translate_content(results: dict) -> dict:
```

Replace with:

```python
def _store_translations(section_name: str, items: list, translated: list,
                        target_lang: str, name_map: dict) -> None:
    """Attach one language's translations to EN items, stamped with `_src`."""
    for i, item in enumerate(items):
        if i < len(translated) and translated[i] and isinstance(item, dict):
            mapped = {name_map.get(k, k): v for k, v in translated[i].items()}
            mapped[SRC_KEY] = item_source_hash(item, section_name)
            item.setdefault("_translations", {})[target_lang] = mapped


def stage3_5_translate_content(results: dict) -> dict:
```

Then, inside `stage3_5_translate_content`, find:

```python
    def do_translate(section_idx: int, target_lang: str):
        section_name, items, fields, name_map = translation_tasks[section_idx]
        thread_processor = LLMProcessor()
        translated = thread_processor.translate_batch(items, target_lang, fields)

        for i, item in enumerate(items):
            if i < len(translated) and translated[i] and isinstance(item, dict):
                mapped = {}
                for k, v in translated[i].items():
                    db_name = name_map.get(k, k)
                    mapped[db_name] = v
                item["_translations"][target_lang] = mapped
```

Replace with:

```python
    def do_translate(section_idx: int, target_lang: str):
        section_name, items, fields, name_map = translation_tasks[section_idx]
        thread_processor = LLMProcessor()
        translated = thread_processor.translate_batch(items, target_lang, fields)
        _store_translations(section_name, items, translated, target_lang, name_map)
```

Edit 3e — find the whole function:

```python
def _apply_translations_to_record(record, trans) -> None:
    """Write Stage 3.5 output onto an already-saved record.

    German goes into the native `_de` columns (overwriting the EN fallback
    that the stage-4 mirror saved); the other six languages go into the
    JSONB `translations` column. Stage 3.5 emits DB field names, so the
    `_de` attribute lookup is direct.
    """
    if not isinstance(trans, dict):
        return
    de_fields = trans.get("de")
    if isinstance(de_fields, dict):
        for db_name, value in de_fields.items():
            attr = f"{db_name}_de"
            if value is not None and hasattr(record, attr):
                setattr(record, attr, value)
    filtered = {k: v for k, v in trans.items() if k != "de"}
    record.translations = filtered or None
```

Replace with:

```python
def _apply_translations_to_record(record, trans) -> None:
    """Write Stage 3.5 output onto an already-saved record.

    German text goes into the native `_de` columns (overwriting the EN
    fallback that the stage-4 mirror saved); the JSONB column stores the other
    languages plus the German integrity marker (see `_jsonb_view`). Stage 3.5
    emits DB field names, so the `_de` attribute lookup is direct.
    """
    if not isinstance(trans, dict):
        return
    de_fields = trans.get("de")
    if isinstance(de_fields, dict):
        for db_name, value in de_fields.items():
            if db_name.startswith("_"):
                continue
            attr = f"{db_name}_de"
            if value is not None and hasattr(record, attr):
                setattr(record, attr, value)
    record.translations = _jsonb_view(trans)
```

Edit 3f — replace the entire function `_backfill_translations_to_db`. It starts at the line `def _backfill_translations_to_db(db: Session, week_id: str, results: dict):` and ends with these lines, immediately before `def _save_deals(`:

```python
    try:
        db.commit()
    except Exception as e:
        logger.warning(f"Failed to save translations for {week_id}: {e}")
        db.rollback()
```

Replace that whole function with:

```python
def _match_by_identity(records: list, en_items: list, record_key, item_key) -> list:
    """Pair saved rows with the EN items they were created from.

    Rows are matched on the English text they were saved with, never by
    position: positional pairing shifted translations onto the wrong rows
    whenever video rows were interleaved into the tech feed or a row was
    dropped at save time. Duplicate keys pair in order.
    Returns [(record, item), ...].
    """
    buckets: dict = {}
    for item in en_items:
        if isinstance(item, dict):
            buckets.setdefault(item_key(item), []).append(item)
    pairs = []
    for record in records:
        queue = buckets.get(record_key(record))
        if queue:
            pairs.append((record, queue.pop(0)))
    return pairs


def _backfill_translations_to_db(db: Session, week_id: str, results: dict):
    """
    Update already-saved records with translations from Stage 3.5.

    Stage 3.5 mutates results in place, adding _translations dicts to each EN
    item. Each saved row is matched to its EN item by identity (see
    `_match_by_identity`) and the translations are written onto it.
    """
    def apply(label, query, en_items, record_key, item_key, transform=None):
        if not en_items:
            return
        records = query.all()
        pairs = _match_by_identity(records, en_items, record_key, item_key)
        applied = 0
        for record, item in pairs:
            trans = item.get("_translations")
            if not trans:
                continue
            _apply_translations_to_record(record, transform(item, trans) if transform else trans)
            applied += 1
        if len(pairs) < len(records):
            logger.warning(
                f"Translations {label}: {len(records) - len(pairs)} row(s) had no matching EN item"
            )
        logger.info(f"Translations {label}: applied to {applied}/{len(records)} row(s)")

    def by_week(model_cls):
        return db.query(model_cls).filter(model_cls.week_id == week_id)

    def content_of_record(record):
        return identity_key([record.content_en])

    def content_of_item(item):
        return identity_key([item.get("content")])

    def video_id_of_record(record):
        return identity_key([record.video_id])

    def video_id_of_item(item):
        return identity_key([item.get("video_id")])

    tech_en = (results.get("tech") or {}).get("en", [])
    video_en = (results.get("videos") or {}).get("en", [])
    tips_en = (results.get("tips") or {}).get("en", [])

    apply("tech", by_week(TechPost).filter(TechPost.is_video == False),  # noqa: E712
          tech_en, content_of_record, content_of_item)
    apply("tech-video", by_week(TechPost).filter(TechPost.is_video == True),  # noqa: E712
          video_en, video_id_of_record, video_id_of_item,
          transform=_video_translations_for_tech_row)
    apply("videos", by_week(Video), video_en, video_id_of_record, video_id_of_item)
    apply("tips", by_week(TipPost), tips_en,
          lambda record: identity_key([record.content_en, record.tip_en]),
          lambda item: identity_key([item.get("content"), item.get("tip")]))

    inv = results.get("investment") or {}
    if isinstance(inv, dict):
        for key, model_cls in (
            ("primaryMarket", PrimaryMarketPost),
            ("secondaryMarket", SecondaryMarketPost),
            ("ma", MAPost),
        ):
            sub = inv.get(key)
            sub_en = sub.get("en", []) if isinstance(sub, dict) else []
            apply(f"investment.{key}", by_week(model_cls), sub_en,
                  content_of_record, content_of_item)

    trends = results.get("trends") or {}
    trends_section = trends.get("trends", {}) if isinstance(trends, dict) else {}
    trends_en = trends_section.get("en", []) if isinstance(trends_section, dict) else []
    apply("trends", by_week(Trend), trends_en,
          lambda record: identity_key([record.title_en]),
          lambda item: identity_key([item.get("title")]))

    try:
        db.commit()
    except Exception as e:
        logger.warning(f"Failed to save translations for {week_id}: {e}")
        db.rollback()
```

Edit 3g — in `stage4_save_to_database`, find:

```python
            translations=en_v.get("_translations") or None,
```

Replace with:

```python
            translations=_jsonb_translations(en_v),
```

Then find:

```python
        # Create video post for tech feed
        # Map video translations (summary→content) for TechPost
        video_trans = en_v.get("_translations")
        tech_video_trans = None
        if video_trans:
            tech_video_trans = {}
            for lang, fields in video_trans.items():
                tech_video_trans[lang] = {"content": fields.get("summary", "")}
```

Replace with:

```python
        # Create video post for tech feed. In the process-only path Stage 3.5
        # already ran, so map the video's translations (summary -> content).
        video_trans = en_v.get("_translations")
        tech_video_trans = (
            _jsonb_view(_video_translations_for_tech_row(en_v, video_trans))
            if video_trans else None
        )
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=postgresql://postgres:test@localhost:5433/aihub_test venv312/bin/python -m pytest tests/test_translation_alignment_integration.py -q`
Expected: `2 passed`.

Run the unit suite command, the integration suite command and the lint command from Global Constraints. Expected: all pass.

- [ ] **Step 5: Commit**

```bash
cd <repo-root>
git add ai-hub-backend/app/services/collector.py ai-hub-backend/tests/test_translation_alignment_integration.py
git commit -m "fix: match translations to saved rows by identity, not position"
```

---

### Task 4: Retry translation gaps in Stage 3.5 and report the remainder

**Files:**
- Modify: `ai-hub-backend/app/services/collector.py` (3 edits)
- Create: `ai-hub-backend/tests/test_stage3_5_translation_retry.py`

**Interfaces:**
- Consumes (Task 2): `entry_is_usable(item, entry, kind)`. Consumes (Task 3): `_store_translations(...)`.
- Produces: `_translation_gaps(translation_tasks: list) -> dict` mapping `(section_index, lang) -> [item indexes]`; `results["_translation_gaps"]: int` after `stage3_5_translate_content`; `counts["translation_gaps"]` in the completed collection status.

- [ ] **Step 1: Write the failing test** — create `ai-hub-backend/tests/test_stage3_5_translation_retry.py`:

```python
"""Stage 3.5 retries item/language pairs that came back empty or untranslated."""

import app.services.collector as collector
from app.services.i18n_utils import TRANSLATION_LANGUAGES


def _results():
    return {"tech": {"en": [
        {"content": f"Story {i} about AI.", "category": "AI", "tags": ["AI"]} for i in range(4)
    ]}}


class FlakyKoreanTranslator:
    """Returns nothing for Korean on the first (batch_size=10) pass."""

    calls: list = []

    def translate_batch(self, items, target_lang, fields, batch_size=10, models=None):
        FlakyKoreanTranslator.calls.append((target_lang, len(items), batch_size))
        if target_lang == "ko" and batch_size == 10:
            return [{} for _ in items]
        return [
            {field: f"[{target_lang}] {item[field]}" for field in fields if isinstance(item.get(field), str)}
            for item in items
        ]


class NeverKoreanTranslator:
    """Korean always comes back identical to English."""

    def translate_batch(self, items, target_lang, fields, batch_size=10, models=None):
        if target_lang == "ko":
            return [{"content": item["content"]} for item in items]
        return [{"content": f"[{target_lang}] {item['content']}"} for item in items]


def test_retry_fills_a_failed_language(monkeypatch):
    FlakyKoreanTranslator.calls = []
    monkeypatch.setattr(collector, "LLMProcessor", FlakyKoreanTranslator)
    results = _results()

    collector.stage3_5_translate_content(results)

    for item in results["tech"]["en"]:
        for lang in TRANSLATION_LANGUAGES:
            assert item["_translations"][lang]["content"] == f"[{lang}] {item['content']}"
            assert len(item["_translations"][lang]["_src"]) == 16
    assert ("ko", 4, 3) in FlakyKoreanTranslator.calls
    assert results["_translation_gaps"] == 0


def test_unfixable_language_is_counted(monkeypatch):
    monkeypatch.setattr(collector, "LLMProcessor", NeverKoreanTranslator)
    results = _results()

    collector.stage3_5_translate_content(results)

    assert results["_translation_gaps"] == 4
    assert results["tech"]["de"][0]["content"] == "[de] Story 0 about AI."
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db venv312/bin/python -m pytest tests/test_stage3_5_translation_retry.py -q`
Expected: `2 failed` (`KeyError: '_translation_gaps'` / Korean entries missing).

- [ ] **Step 3: Implement — edit `ai-hub-backend/app/services/collector.py`**

Edit 4a — find:

```python
    SRC_KEY, identity_key, item_source_hash, source_hash,
```

Replace with:

```python
    SRC_KEY, entry_is_usable, identity_key, item_source_hash, source_hash,
```

Edit 4b — find:

```python
def _store_translations(section_name: str, items: list, translated: list,
```

Replace with:

```python
def _translation_gaps(translation_tasks: list) -> dict:
    """(section index, language) -> indexes of EN items without a usable translation."""
    from app.services.i18n_utils import TRANSLATION_LANGUAGES

    gaps: dict = {}
    for section_idx, (section_name, items, _fields, _name_map) in enumerate(translation_tasks):
        for item_idx, item in enumerate(items):
            if not isinstance(item, dict):
                continue
            translations = item.get("_translations") or {}
            for lang in TRANSLATION_LANGUAGES:
                if not entry_is_usable(item, translations.get(lang), section_name):
                    gaps.setdefault((section_idx, lang), []).append(item_idx)
    return gaps


def _store_translations(section_name: str, items: list, translated: list,
```

Edit 4c — inside `stage3_5_translate_content`, find:

```python
    # EN is the only natively generated language — mirror the German
    # translations into full DE item arrays for the stage-4 save sites.
    _mirror_de_from_translations(results)
```

Replace with:

```python
    # Retry every (item, language) pair that is still missing or came back
    # identical to English, once, in small batches.
    gaps = _translation_gaps(translation_tasks)
    if gaps:
        logger.warning(
            f"Stage 3.5: retrying {sum(len(ix) for ix in gaps.values())} "
            f"untranslated item/language pair(s)"
        )
        retry_processor = LLMProcessor()
        for (section_idx, lang), item_indexes in gaps.items():
            section_name, items, fields, name_map = translation_tasks[section_idx]
            subset = [items[i] for i in item_indexes]
            try:
                translated = retry_processor.translate_batch(subset, lang, fields, batch_size=3)
            except Exception as e:
                logger.warning(f"Stage 3.5 retry failed for {section_name}→{lang}: {e}")
                continue
            _store_translations(section_name, subset, translated, lang, name_map)

    remaining = sum(len(ix) for ix in _translation_gaps(translation_tasks).values())
    results["_translation_gaps"] = remaining
    if remaining:
        logger.warning(f"Stage 3.5: {remaining} item/language pair(s) still untranslated")

    # EN is the only natively generated language — mirror the German
    # translations into full DE item arrays for the stage-4 save sites.
    _mirror_de_from_translations(results)
```

Edit 4d — inside `run_collection`, find:

```python
            stage3_5_translate_content(results)
            _backfill_translations_to_db(db, week_id, results)
            logger.info(f"Translations saved for {week_id}")
```

Replace with:

```python
            stage3_5_translate_content(results)
            _backfill_translations_to_db(db, week_id, results)
            counts["translation_gaps"] = results.get("_translation_gaps", 0)
            logger.info(f"Translations saved for {week_id}")
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db venv312/bin/python -m pytest tests/test_stage3_5_translation_retry.py -q`
Expected: `2 passed`.

Run the unit suite command, the integration suite command and the lint command from Global Constraints. Expected: all pass.

- [ ] **Step 5: Commit**

```bash
cd <repo-root>
git add ai-hub-backend/app/services/collector.py ai-hub-backend/tests/test_stage3_5_translation_retry.py
git commit -m "fix: retry untranslated item/language pairs in stage 3.5 and report remaining gaps"
```

---

### Task 5: Translation backfill service, cheap model chain, admin endpoint and CLI

**Files:**
- Modify: `ai-hub-backend/app/services/llm_processor.py` (3 edits)
- Create: `ai-hub-backend/app/services/translation_backfill.py`
- Modify: `ai-hub-backend/app/routers/admin.py` (2 edits)
- Modify: `ai-hub-backend/scripts/backfill_translations.py` (whole file)
- Create: `ai-hub-backend/tests/test_translation_backfill_integration.py`

**Interfaces:**
- Consumes (Task 2): `SRC_KEY`, `record_source_hash`, `translation_status`. Consumes (Task 3): `collector._apply_translations_to_record(record, trans)`.
- Produces: `LLMProcessor.CHEAP_TRANSLATOR_MODELS: list[str]`; `LLMProcessor.translate_batch(items, target_lang, fields, batch_size=10, models=None)`; module `app.services.translation_backfill` with `SECTIONS`, `resolve_periods(db, period_id=None, since=None) -> list[str]`, `fields_for(kind, record) -> list[str]`, `plan_period(db, period_id, force=False) -> dict`, `summarize_periods(db, period_ids, force=False) -> dict`, `translate_groups(groups, models=None, workers=3) -> dict`, `backfill_periods(db, period_ids, force=False, cheap=False) -> dict`, `backfill_with_new_session(period_ids, force=False, cheap=False) -> None`; endpoint `POST /api/admin/backfill-translations?period_id=&since=&force=&dry_run=&cheap=`.

- [ ] **Step 1: Write the failing test** — create `ai-hub-backend/tests/test_translation_backfill_integration.py`:

```python
"""The translation backfill repairs misaligned rows and writes German columns.

Requires local PostgreSQL.
"""

from datetime import date

import pytest
from fastapi.testclient import TestClient

import app.services.translation_backfill as backfill
from app.database import get_session_local
from app.main import app
from app.models import TechPost, Week
from app.routers.admin import verify_api_key
from app.services.i18n_utils import TRANSLATION_LANGUAGES
from app.services.translation_integrity import translation_status

pytestmark = pytest.mark.integration

WEEK_ID = "2026-08-03"


class FakeTranslator:
    CHEAP_TRANSLATOR_MODELS = ["cheap/test-model"]
    models_seen: list = []

    def translate_batch(self, items, target_lang, fields, batch_size=10, models=None):
        FakeTranslator.models_seen.append(models)
        return [
            {field: f"[{target_lang}] {item[field]}" for field in fields if isinstance(item.get(field), str)}
            for item in items
        ]


@pytest.fixture()
def db():
    session = get_session_local()()
    yield session
    session.rollback()
    session.close()


@pytest.fixture(autouse=True)
def misaligned_period(db, monkeypatch):
    FakeTranslator.models_seen = []
    monkeypatch.setattr(backfill, "LLMProcessor", FakeTranslator)
    db.query(TechPost).filter(TechPost.week_id == WEEK_ID).delete()
    if not db.query(Week).filter(Week.id == WEEK_ID).first():
        db.add(Week(
            id=WEEK_ID, label="Aug 3", year=2026, week_num=None,
            date_range="03.08.", is_current=False, period_type="day",
            sort_date=date(2026, 8, 3),
        ))
    db.commit()
    # Two rows whose German/Chinese text belongs to the other story (the
    # 2026-08 shift), without integrity markers.
    for n, other in ((0, 1), (1, 0)):
        db.add(TechPost(
            week_id=WEEK_ID, content_en=f"English story {n}.", content_de=f"Deutsche Geschichte {other}.",
            category_en="AI", category_de="KI", author={"name": "Example"},
            tags_en=["AI"], tags_de=["KI"], icon_type="Brain", impact="medium",
            timestamp="2026-08-03", source="Example", source_url=f"https://example.com/{n}",
            metrics={}, is_video=False, display_order=n,
            translations={"zh": {"content": f"中文故事 {other}。"}},
        ))
    db.commit()
    yield


def _rows(db):
    db.expire_all()
    return (
        db.query(TechPost).filter(TechPost.week_id == WEEK_ID)
        .order_by(TechPost.display_order).all()
    )


def test_dry_run_counts_without_changes(db):
    summary = backfill.summarize_periods(db, [WEEK_ID])
    assert summary[WEEK_ID]["tech:zh"] == 2
    assert summary[WEEK_ID]["tech:de"] == 2
    assert _rows(db)[0].content_de == "Deutsche Geschichte 1."


def test_backfill_repairs_rows_and_german_columns(db):
    report = backfill.backfill_periods(db, [WEEK_ID], cheap=True)

    assert report == {WEEK_ID: 2}
    for row in _rows(db):
        assert row.content_de == f"[de] {row.content_en}"
        assert row.translations["zh"]["content"] == f"[zh] {row.content_en}"
        for lang in TRANSLATION_LANGUAGES:
            assert translation_status(row, "tech", lang) == "ok"
    assert FakeTranslator.models_seen
    assert all(models == ["cheap/test-model"] for models in FakeTranslator.models_seen)
    assert backfill.backfill_periods(db, [WEEK_ID]) == {}


def test_resolve_periods_since_selects_daily_periods(db):
    assert WEEK_ID in backfill.resolve_periods(db, since="2026-08-03")
    assert backfill.resolve_periods(db, period_id=WEEK_ID) == [WEEK_ID]


def test_admin_endpoint_dry_run(db):
    app.dependency_overrides[verify_api_key] = lambda: True
    try:
        response = TestClient(app).post(
            f"/api/admin/backfill-translations?period_id={WEEK_ID}&dry_run=true"
        )
    finally:
        app.dependency_overrides.pop(verify_api_key, None)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "dry_run"
    assert body["periods"][WEEK_ID]["tech:ko"] == 2
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=postgresql://postgres:test@localhost:5433/aihub_test venv312/bin/python -m pytest tests/test_translation_backfill_integration.py -q`
Expected: collection error `ModuleNotFoundError: No module named 'app.services.translation_backfill'`.

- [ ] **Step 3: Implement**

Edit 5a — `ai-hub-backend/app/services/llm_processor.py`: find:

```python
    PROCESSOR_MODELS = [
```

Replace with:

```python
    # Cheapest paid model first, then the free fallbacks. Used for bulk
    # translation repairs (admin backfill with cheap=true).
    CHEAP_TRANSLATOR_MODELS = [
        "qwen/qwen3.7-flash",
        "nvidia/nemotron-3-super-120b-a12b:free",
        "nvidia/nemotron-3-nano-30b-a3b:free",
        "google/gemma-4-31b-it:free",
    ]

    PROCESSOR_MODELS = [
```

Edit 5b — in the same file find:

```python
    def _try_translate_batch(
        self,
        batch: list[dict],
        target_lang: str,
        fields: list[str],
        lang_name: str,
    ) -> "list[dict] | None":
```

Replace with:

```python
    def _try_translate_batch(
        self,
        batch: list[dict],
        target_lang: str,
        fields: list[str],
        lang_name: str,
        models: "list[str] | None" = None,
    ) -> "list[dict] | None":
```

Then find:

```python
            response = self._call_with_fallback(
                prompt, temperature=0.2, timeout=120.0, expect_json=True,
                models=self.TRANSLATOR_MODELS, chain_name="translator",
            )
```

Replace with:

```python
            response = self._call_with_fallback(
                prompt, temperature=0.2, timeout=120.0, expect_json=True,
                models=models or self.TRANSLATOR_MODELS, chain_name="translator",
            )
```

Edit 5c — in the same file find:

```python
        fields: list[str],
        batch_size: int = 10,
    ) -> list[dict]:
```

Replace with:

```python
        fields: list[str],
        batch_size: int = 10,
        models: "list[str] | None" = None,
    ) -> list[dict]:
```

Then find:

```python
            batch_size: Number of items per LLM call.
```

Replace with:

```python
            batch_size: Number of items per LLM call.
            models: Optional translator model chain (defaults to TRANSLATOR_MODELS).
```

Then find:

```python
            translated = self._try_translate_batch(batch, target_lang, fields, lang_name)
```

Replace with:

```python
            translated = self._try_translate_batch(batch, target_lang, fields, lang_name, models)
```

Then find:

```python
                    mini_result = self._try_translate_batch(
                        mini_batch, target_lang, fields, lang_name,
                    )
```

Replace with:

```python
                    mini_result = self._try_translate_batch(
                        mini_batch, target_lang, fields, lang_name, models,
                    )
```

Create `ai-hub-backend/app/services/translation_backfill.py`:

```python
"""Repair translations on saved rows.

A row/language needs work when its translation is missing, stale (English
changed or attached to the wrong row) or identical to English — or always,
with ``force``. Translations run in worker threads; every database read and
write stays on the caller's session in the calling thread.
"""

import logging
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

from sqlalchemy.orm import Session

from app.models import (
    MAPost, PrimaryMarketPost, SecondaryMarketPost, TechPost, TipPost, Trend, Video, Week,
)
from app.services.collector import _apply_translations_to_record
from app.services.i18n_utils import TRANSLATION_LANGUAGES
from app.services.llm_processor import LLMProcessor
from app.services.translation_integrity import SRC_KEY, record_source_hash, translation_status

logger = logging.getLogger(__name__)

# Section kind -> (model, translatable fields). Kinds match
# translation_integrity.SOURCE_FIELDS.
SECTIONS = {
    "tech": (TechPost, ["content", "category", "tags"]),
    "video": (Video, ["title", "summary"]),
    "tip": (TipPost, ["content", "tip", "category", "difficulty"]),
    "primary_market": (PrimaryMarketPost, ["content", "amount", "valuation"]),
    "secondary_market": (SecondaryMarketPost, ["content"]),
    "ma": (MAPost, ["content", "deal_value", "deal_type"]),
    "trend": (Trend, ["category", "title"]),
}


def resolve_periods(db: Session, period_id: str | None = None, since: str | None = None) -> list[str]:
    """One period, every daily period on/after ``since`` (YYYY-MM-DD), or all periods."""
    if period_id:
        return [period_id]
    query = db.query(Week.id)
    if since:
        query = query.filter(Week.period_type == "day", Week.id >= since)
    return [row[0] for row in query.order_by(Week.id).all()]


def fields_for(kind: str, record) -> list[str]:
    """Video rows in the tech feed only carry translatable `content`."""
    if kind == "tech" and getattr(record, "is_video", False):
        return ["content"]
    return SECTIONS[kind][1]


def plan_period(db: Session, period_id: str, force: bool = False) -> dict:
    """(kind, language, fields) -> rows that need translating in one period."""
    groups: dict = {}
    for kind, (model_cls, _fields) in SECTIONS.items():
        rows = (
            db.query(model_cls).filter(model_cls.week_id == period_id)
            .order_by(model_cls.id).all()
        )
        for row in rows:
            for lang in TRANSLATION_LANGUAGES:
                if force or translation_status(row, kind, lang) != "ok":
                    key = (kind, lang, tuple(fields_for(kind, row)))
                    groups.setdefault(key, []).append(row)
    return groups


def summarize_periods(db: Session, period_ids: list[str], force: bool = False) -> dict:
    """{period: {"kind:lang": row count}} without translating anything."""
    summary = {}
    for period_id in period_ids:
        counts: dict = {}
        for (kind, lang, _fields), rows in plan_period(db, period_id, force).items():
            label = f"{kind}:{lang}"
            counts[label] = counts.get(label, 0) + len(rows)
        if counts:
            summary[period_id] = counts
    return summary


def _english_item(row, fields: list[str]) -> dict:
    item = {}
    for field in fields:
        value = getattr(row, f"{field}_en", None)
        if value is not None:
            item[field] = value
    return item


def translate_groups(groups: dict, models: list[str] | None = None, workers: int = 3) -> dict:
    """Translate planned groups in parallel.

    Returns {(kind, row id): {language: entry}}; every entry carries `_src`
    computed from the English text of the row that was sent to the translator.
    """
    translated: dict = {}
    lock = threading.Lock()

    def work(key, rows):
        kind, lang, fields = key
        items = [_english_item(row, list(fields)) for row in rows]
        output = LLMProcessor().translate_batch(items, lang, list(fields), models=models)
        with lock:
            for row, entry in zip(rows, output):
                if entry:
                    stamped = dict(entry)
                    stamped[SRC_KEY] = record_source_hash(row, kind)
                    translated.setdefault((kind, row.id), {})[lang] = stamped

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(work, key, rows): key for key, rows in groups.items()}
        for future in as_completed(futures):
            try:
                future.result()
            except Exception as e:
                kind, lang, _fields = futures[future]
                logger.warning(f"Backfill {kind}→{lang} failed: {e}")
    return translated


def backfill_periods(db: Session, period_ids: list[str], force: bool = False, cheap: bool = False) -> dict:
    """Plan, translate and write back each period. Returns {period: rows updated}."""
    models = LLMProcessor.CHEAP_TRANSLATOR_MODELS if cheap else None
    report = {}
    for period_id in period_ids:
        groups = plan_period(db, period_id, force)
        if not groups:
            continue
        rows_by_key = {(key[0], row.id): row for key, rows in groups.items() for row in rows}
        translated = translate_groups(groups, models=models)
        for key, entries in translated.items():
            row = rows_by_key[key]
            merged = dict(row.translations or {})
            merged.update(entries)
            _apply_translations_to_record(row, merged)
        db.commit()
        report[period_id] = len(translated)
        logger.info(f"Backfill {period_id}: {len(translated)} row(s) updated")
    return report


def backfill_with_new_session(period_ids: list[str], force: bool = False, cheap: bool = False) -> None:
    """Background-thread entry point with its own database session."""
    from app.database import get_session_local

    db = get_session_local()()
    try:
        report = backfill_periods(db, period_ids, force=force, cheap=cheap)
        logger.info(f"Translation backfill complete: {report}")
    except Exception:
        logger.exception("Translation backfill failed")
        db.rollback()
    finally:
        db.close()
```

Edit 5d — `ai-hub-backend/app/routers/admin.py`: delete the whole function `_run_backfill_translations_with_new_session` (from `def _run_backfill_translations_with_new_session(` through its final `db.close()`) and replace the whole endpoint that follows it — from `@router.post("/backfill-translations")` through its closing `}` of the returned dict (the line `    }` after `"message": "Translation backfill started in background thread",`) — with:

```python
@router.post("/backfill-translations")
def trigger_backfill_translations(
    period_id: str | None = None,
    since: str | None = None,
    force: bool = False,
    dry_run: bool = False,
    cheap: bool = False,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_api_key),
):
    """
    Repair translations for one period (`period_id`), every daily period on or
    after `since` (YYYY-MM-DD), or all periods.

    A row/language is repaired when its translation is missing, stale or
    identical to English; `force=true` re-translates everything selected.
    `dry_run=true` returns per-period row counts and changes nothing.
    `cheap=true` uses the cheapest translator model chain. Writes both the
    German `_de` columns and the JSONB translations.

    Requires X-API-Key header.
    """
    import threading

    from app.services.translation_backfill import (
        backfill_with_new_session, resolve_periods, summarize_periods,
    )

    period_ids = resolve_periods(db, period_id, since)
    if dry_run:
        return {
            "status": "dry_run",
            "force": force,
            "periods": summarize_periods(db, period_ids, force),
        }
    thread = threading.Thread(
        target=backfill_with_new_session,
        args=(period_ids, force, cheap),
        daemon=True,
    )
    thread.start()
    return {"status": "started", "periods": len(period_ids), "force": force, "cheap": cheap}
```

Edit 5e — in `patch_translation` in the same file, find:

```python
    existing = dict(record.translations or {})
    existing[lang] = translations_data
    record.translations = existing
    db.commit()
```

Replace with:

```python
    from app.services.collector import _apply_translations_to_record
    from app.services.translation_integrity import SRC_KEY, record_source_hash

    entry = dict(translations_data)
    entry[SRC_KEY] = record_source_hash(record, table)
    merged = dict(record.translations or {})
    merged[lang] = entry
    _apply_translations_to_record(record, merged)
    db.commit()
```

Edit 5f — replace the whole content of `ai-hub-backend/scripts/backfill_translations.py` with:

```python
#!/usr/bin/env python3
"""
Repair translations for existing content.

CLI wrapper around app.services.translation_backfill (same logic as
POST /api/admin/backfill-translations). Export a DATABASE_URL first.

Usage:
    python -m scripts.backfill_translations                          # all periods
    python -m scripts.backfill_translations --period 2026-09-12      # one period
    python -m scripts.backfill_translations --since 2026-08-01       # daily periods from a date
    python -m scripts.backfill_translations --since 2026-08-01 --force --cheap
    python -m scripts.backfill_translations --since 2026-08-01 --dry-run
"""

import argparse
import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


def main():
    parser = argparse.ArgumentParser(description="Repair translations for existing content")
    parser.add_argument("--period", default=None, help="Single period id, e.g. 2026-09-12")
    parser.add_argument("--since", default=None, help="All daily periods on/after YYYY-MM-DD")
    parser.add_argument("--force", action="store_true", help="Re-translate everything selected")
    parser.add_argument("--cheap", action="store_true", help="Use the cheapest translator chain")
    parser.add_argument("--dry-run", action="store_true", help="Only print what would be translated")
    args = parser.parse_args()

    from app.database import get_session_local
    from app.services.translation_backfill import backfill_periods, resolve_periods, summarize_periods

    db = get_session_local()()
    try:
        period_ids = resolve_periods(db, args.period, args.since)
        if args.dry_run:
            print(json.dumps(summarize_periods(db, period_ids, args.force), indent=2))
            return
        report = backfill_periods(db, period_ids, force=args.force, cheap=args.cheap)
        print(json.dumps(report, indent=2))
    finally:
        db.close()


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=postgresql://postgres:test@localhost:5433/aihub_test venv312/bin/python -m pytest tests/test_translation_backfill_integration.py -q`
Expected: `4 passed`.

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=postgresql://postgres:test@localhost:5433/aihub_test venv312/bin/python -m scripts.backfill_translations --period 2026-08-03 --dry-run`
Expected: prints a JSON object (`{}` because the test already repaired that period, or counts) and exits 0.

Run the unit suite command, the integration suite command and the lint command from Global Constraints. Expected: all pass.

- [ ] **Step 5: Commit**

```bash
cd <repo-root>
git add ai-hub-backend/app/services/llm_processor.py ai-hub-backend/app/services/translation_backfill.py ai-hub-backend/app/routers/admin.py ai-hub-backend/scripts/backfill_translations.py ai-hub-backend/tests/test_translation_backfill_integration.py
git commit -m "fix: translation backfill repairs misaligned rows and German columns"
```

---

### Task 6: Hold newsletter languages whose translations are not ready

**Files:**
- Modify: `ai-hub-backend/app/services/newsletter_sender.py` (5 edits)
- Modify: `ai-hub-backend/app/routers/admin.py` (1 edit)
- Create: `ai-hub-backend/tests/test_newsletter_translation_gate.py`

**Interfaces:**
- Consumes (Task 2): `send_gate_counts(sections, lang)`, `gate_holds_language(counts)`, `SRC_KEY`, `record_source_hash`.
- Produces: `send_newsletter(...)` result gains `"held_languages"` and `"translation_warnings"` (both `{lang: {"total": n, "missing": n, "stale": n, "untranslated": n}}`) and status `"held"`; `POST /api/admin/newsletter?wait=true` returns 502 when `held_languages` is non-empty.

- [ ] **Step 1: Write the failing test** — create `ai-hub-backend/tests/test_newsletter_translation_gate.py`:

```python
"""The newsletter holds any language whose translations are not usable."""

from types import SimpleNamespace

from fastapi.testclient import TestClient

import app.services.newsletter_sender as sender
from app.main import app
from app.routers.admin import verify_api_key
from app.services.translation_integrity import SRC_KEY, record_source_hash


def _ready_row():
    row = SimpleNamespace(
        content_en="OpenAI released a model.", content_de="OpenAI hat ein Modell veröffentlicht.",
        category_en="AI", category_de="KI", tags_en=[], tags_de=[], translations=None,
        impact="high", source="Example", source_url="https://example.com", display_order=0,
    )
    src = record_source_hash(row, "tech")
    row.translations = {"de": {SRC_KEY: src}, "zh": {"content": "OpenAI 发布了模型。", SRC_KEY: src}}
    return row


def _patch_sender(monkeypatch, rows):
    sent = []
    monkeypatch.setattr(sender, "get_settings", lambda: SimpleNamespace(
        resend_api_key="re_test", beehiiv_api_key="bh_test", beehiiv_publication_id="pub_test",
        newsletter_from_email="News <news@example.com>", app_timezone="Europe/Berlin",
    ))
    monkeypatch.setattr(sender, "_fetch_period_content", lambda db, period_id: {
        "period_id": period_id, "tech": rows, "videos": [], "funding": [], "ma": [], "tips": [],
    })
    monkeypatch.setattr(sender, "_fetch_beehiiv_subscribers", lambda api_key, publication_id: [
        {"email": "en@example.com", "language": "en"},
        {"email": "de@example.com", "language": "de"},
        {"email": "zh@example.com", "language": "zh"},
    ])
    monkeypatch.setattr(sender, "_acquire_send_lock", lambda db, period_id, lang: True)
    monkeypatch.setattr(sender, "_mark_send_sent", lambda db, period_id, lang, count: None)
    monkeypatch.setattr(sender, "_mark_send_failed", lambda db, period_id, lang, error: None)
    monkeypatch.setattr(sender, "_build_email_html", lambda data, lang: "<html></html>")

    def fake_send(from_email, subject, html_content, addrs):
        sent.append(tuple(addrs))
        return len(addrs), 0

    monkeypatch.setattr(sender, "_send_via_resend", fake_send)
    return sent


def test_ready_translations_are_sent(monkeypatch):
    sent = _patch_sender(monkeypatch, [_ready_row()])

    result = sender.send_newsletter(None, "2026-09-12")

    assert result["held_languages"] == {}
    assert result["status"] == "sent"
    assert len(sent) == 3


def test_misaligned_language_is_held(monkeypatch):
    row = _ready_row()
    row.translations["zh"] = {"content": "Sam Altman 确认不上市。"}  # legacy entry, no marker
    sent = _patch_sender(monkeypatch, [row])

    result = sender.send_newsletter(None, "2026-09-12")

    assert result["held_languages"] == {"zh": {"total": 1, "missing": 1, "stale": 0, "untranslated": 0}}
    assert ("zh@example.com",) not in sent
    assert ("en@example.com",) in sent
    assert ("de@example.com",) in sent
    assert result["status"] == "partial"


def test_few_unready_rows_send_with_english_fallback(monkeypatch):
    legacy = _ready_row()
    legacy.translations["zh"] = {"content": "旧译文。"}  # legacy entry, no marker
    sent = _patch_sender(monkeypatch, [_ready_row(), _ready_row(), legacy])

    result = sender.send_newsletter(None, "2026-09-12")

    assert result["held_languages"] == {}
    assert result["translation_warnings"] == {
        "zh": {"total": 3, "missing": 1, "stale": 0, "untranslated": 0},
    }
    assert ("zh@example.com",) in sent
    assert result["status"] == "sent"


def test_admin_returns_502_when_a_language_is_held(monkeypatch):
    monkeypatch.setattr(sender, "send_newsletter", lambda db, period_id: {
        "period_id": "2026-09-12", "status": "held", "total_sent": 0, "total_failed": 0,
        "lang_breakdown": {}, "skipped_already_sent": 0,
        "held_languages": {"de": {"missing": 2, "stale": 0, "untranslated": 0}},
    })
    app.dependency_overrides[verify_api_key] = lambda: True
    try:
        response = TestClient(app).post("/api/admin/newsletter?period_id=2026-09-12&wait=true")
    finally:
        app.dependency_overrides.pop(verify_api_key, None)

    assert response.status_code == 502
    assert response.json()["detail"]["held_languages"]["de"]["missing"] == 2
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db venv312/bin/python -m pytest tests/test_newsletter_translation_gate.py -q`
Expected: `4 failed` (`KeyError: 'held_languages'` / `KeyError: 'translation_warnings'` and `assert 200 == 502`).

- [ ] **Step 3: Implement**

Edit 6a — `ai-hub-backend/app/services/newsletter_sender.py`: find:

```python
from app.services.i18n_utils import get_field, SUPPORTED_LANGUAGES
```

Replace with:

```python
from app.services.i18n_utils import get_field, SUPPORTED_LANGUAGES
from app.services.translation_integrity import gate_holds_language, send_gate_counts
```

Edit 6b — find:

```python
            "status": "sent" | "no_subscribers" | "no_content" | "skipped" | "no_period",
```

Replace with:

```python
            "status": "sent" | "partial" | "held" | "no_subscribers" | "no_content" | "skipped" | "no_period",
```

Then find:

```python
            "skipped_already_sent": int,
        }
    """
```

Replace with:

```python
            "skipped_already_sent": int,
            "held_languages": {lang: {"total": int, "missing": int, "stale": int, "untranslated": int}},
            "translation_warnings": {lang: {"total": int, "missing": int, "stale": int, "untranslated": int}},
        }
    """
```

Edit 6c — find (inside `_empty_result`):

```python
            "lang_breakdown": {},
            "skipped_already_sent": 0,
        }
```

Replace with:

```python
            "lang_breakdown": {},
            "skipped_already_sent": 0,
            "held_languages": {},
            "translation_warnings": {},
        }
```

Edit 6d — find:

```python
    lang_counts = {lang: len(addrs) for lang, addrs in by_lang.items() if addrs}
    logger.info(f"Language split: {lang_counts}")
```

Replace with:

```python
    lang_counts = {lang: len(addrs) for lang, addrs in by_lang.items() if addrs}
    logger.info(f"Language split: {lang_counts}")

    # Translation gate: never send a language carrying another story's text
    # (stale) or that is mostly untranslated; a few unready rows fall back to
    # English and are reported. EN always passes.
    gate_sections = {
        "tech": list(data["tech"]) + list(data.get("videos", [])),
        "primary_market": list(data["funding"]),
        "ma": list(data.get("ma", [])),
        "tip": list(data["tips"]),
    }
    held_languages: dict[str, dict[str, int]] = {}
    translation_warnings: dict[str, dict[str, int]] = {}
```

Then find:

```python
        if not addrs:
            continue

        if not _acquire_send_lock(db, period_id, lang):
```

Replace with:

```python
        if not addrs:
            continue

        gate = send_gate_counts(gate_sections, lang)
        if gate_holds_language(gate):
            held_languages[lang] = gate
            logger.error(
                f"Holding {lang.upper()} newsletter for {period_id}: "
                f"translations not ready ({gate})"
            )
            continue
        if gate["missing"] or gate["untranslated"]:
            translation_warnings[lang] = gate
            logger.warning(
                f"{lang.upper()} newsletter for {period_id}: sending with English "
                f"fallback for rows not ready ({gate})"
            )

        if not _acquire_send_lock(db, period_id, lang):
```

Edit 6e — find:

```python
    elif total_failed > 0:
        status = "partial"
    elif total_sent > 0:
        status = "sent"
```

Replace with:

```python
    elif total_failed > 0:
        status = "partial"
    elif held_languages:
        status = "held" if total_sent == 0 else "partial"
    elif total_sent > 0:
        status = "sent"
```

Then find:

```python
        "lang_breakdown": lang_breakdown,
        "skipped_already_sent": skipped_already_sent,
    }
```

Replace with:

```python
        "lang_breakdown": lang_breakdown,
        "skipped_already_sent": skipped_already_sent,
        "held_languages": held_languages,
        "translation_warnings": translation_warnings,
    }
```

Edit 6f — `ai-hub-backend/app/routers/admin.py`: in `trigger_newsletter` find:

```python
        if total_sent == 0 and total_failed > 0:
            raise HTTPException(
                status_code=502,
                detail={
                    "message": "Newsletter run produced zero successful sends",
                    **result,
                },
            )
        return result
```

Replace with:

```python
        if total_sent == 0 and total_failed > 0:
            raise HTTPException(
                status_code=502,
                detail={
                    "message": "Newsletter run produced zero successful sends",
                    **result,
                },
            )
        if result.get("held_languages"):
            raise HTTPException(
                status_code=502,
                detail={
                    "message": "Newsletter held for languages whose translations are not ready",
                    **result,
                },
            )
        return result
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db venv312/bin/python -m pytest tests/test_newsletter_translation_gate.py -q`
Expected: `4 passed`.

Run the unit suite command, the integration suite command and the lint command from Global Constraints. Expected: all pass.

- [ ] **Step 5: Commit**

```bash
cd <repo-root>
git add ai-hub-backend/app/services/newsletter_sender.py ai-hub-backend/app/routers/admin.py ai-hub-backend/tests/test_newsletter_translation_gate.py
git commit -m "fix: hold newsletter languages whose translations are not ready"
```

---

### Task 7: M&A-only save keeps EN-native rows

**Files:**
- Modify: `ai-hub-backend/app/services/collector.py` (1 edit in `stage4_save_ma_to_database`)
- Create: `ai-hub-backend/tests/test_ma_only_save_integration.py`

**Interfaces:**
- Consumes (Task 3): `_jsonb_translations(item)`; existing `_mirror_de_from_translations`, `_pair_de_en`, `_nn`, `_source_author`.

- [ ] **Step 1: Write the failing test** — create `ai-hub-backend/tests/test_ma_only_save_integration.py`:

```python
"""M&A-only saves keep EN-native rows (regression: zero rows were saved).

Requires local PostgreSQL.
"""

from datetime import date

import pytest

from app.database import get_session_local
from app.models import MAPost, Week
from app.services.collector import stage4_save_ma_to_database

pytestmark = pytest.mark.integration

WEEK_ID = "2026-08-04"


@pytest.fixture()
def db():
    session = get_session_local()()
    yield session
    session.rollback()
    session.close()


@pytest.fixture(autouse=True)
def clean_period(db):
    db.query(MAPost).filter(MAPost.week_id == WEEK_ID).delete()
    if not db.query(Week).filter(Week.id == WEEK_ID).first():
        db.add(Week(
            id=WEEK_ID, label="Aug 4", year=2026, week_num=None,
            date_range="04.08.", is_current=False, period_type="day",
            sort_date=date(2026, 8, 4),
        ))
    db.commit()
    yield


def test_ma_only_save_keeps_english_native_rows(db):
    investment = {"ma": {"en": [{
        "acquirer": "Acme", "target": "Widget AI", "dealValue": "$100M", "dealType": "Acquisition",
        "industry": "AI Enterprise", "content": "Acme acquires Widget AI.",
        "timestamp": "2026-08-04", "sourceUrl": "https://example.com/acme-widget",
    }]}}

    stage4_save_ma_to_database(db, WEEK_ID, investment)

    rows = db.query(MAPost).filter(MAPost.week_id == WEEK_ID).all()
    assert len(rows) == 1
    assert rows[0].content_en == "Acme acquires Widget AI."
    assert rows[0].content_de == "Acme acquires Widget AI."  # EN fallback until translated
    assert rows[0].acquirer == "Acme"
    assert rows[0].deal_type_en == "Acquisition"
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=postgresql://postgres:test@localhost:5433/aihub_test venv312/bin/python -m pytest tests/test_ma_only_save_integration.py -q`
Expected: `1 failed` with `assert 0 == 1`.

- [ ] **Step 3: Implement** — in `ai-hub-backend/app/services/collector.py`, inside `stage4_save_ma_to_database`, find:

```python
    ma_data = investment_data.get("ma", {}) if isinstance(investment_data, dict) else {}
    de_posts = ma_data.get("de", []) if isinstance(ma_data, dict) else []
    en_posts = ma_data.get("en", []) if isinstance(ma_data, dict) else []

    for de_p, en_p in zip(de_posts, en_posts):
        post = MAPost(
            week_id=week_id,
            content_de=de_p.get("content", ""),
            content_en=en_p.get("content", ""),
            acquirer=de_p.get("acquirer", ""),
            target=de_p.get("target", ""),
            deal_value_de=de_p.get("dealValue"),
            deal_value_en=en_p.get("dealValue"),
            deal_type_de=de_p.get("dealType", ""),
            deal_type_en=en_p.get("dealType", ""),
            industry=de_p.get("industry") or en_p.get("industry"),
            author=_source_author(en_p),
            timestamp=de_p.get("timestamp", ""),
            source_url=de_p.get("sourceUrl"),
            metrics=de_p.get("metrics", {}),
        )
        db.add(post)
```

Replace with:

```python
    # EN is the only natively generated language: build the DE side from EN
    # (plus German translations when present) before pairing.
    if isinstance(investment_data, dict):
        _mirror_de_from_translations({"investment": investment_data})
    ma_data = investment_data.get("ma", {}) if isinstance(investment_data, dict) else {}
    de_posts = ma_data.get("de", []) if isinstance(ma_data, dict) else []
    en_posts = ma_data.get("en", []) if isinstance(ma_data, dict) else []

    for de_p, en_p in _pair_de_en(de_posts, en_posts, "investment.ma"):
        if not (
            de_p.get("acquirer") or en_p.get("acquirer")
            or de_p.get("target") or en_p.get("target")
        ):
            continue
        post = MAPost(
            week_id=week_id,
            content_de=_nn(de_p.get("content"), ""),
            content_en=_nn(en_p.get("content"), ""),
            acquirer=_nn(de_p.get("acquirer") or en_p.get("acquirer"), ""),
            target=_nn(de_p.get("target") or en_p.get("target"), ""),
            deal_value_de=de_p.get("dealValue"),
            deal_value_en=en_p.get("dealValue"),
            deal_type_de=_nn(de_p.get("dealType"), ""),
            deal_type_en=_nn(en_p.get("dealType"), ""),
            industry=de_p.get("industry") or en_p.get("industry"),
            author=_source_author(en_p),
            timestamp=_nn(de_p.get("timestamp"), ""),
            source_url=de_p.get("sourceUrl"),
            metrics=_nn(de_p.get("metrics"), {}),
            translations=_jsonb_translations(en_p),
        )
        db.add(post)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=postgresql://postgres:test@localhost:5433/aihub_test venv312/bin/python -m pytest tests/test_ma_only_save_integration.py -q`
Expected: `1 passed`.

Run the unit suite command, the integration suite command and the lint command from Global Constraints. Expected: all pass.

- [ ] **Step 5: Commit**

```bash
cd <repo-root>
git add ai-hub-backend/app/services/collector.py ai-hub-backend/tests/test_ma_only_save_integration.py
git commit -m "fix: M&A-only save pairs EN-native items instead of dropping them"
```
