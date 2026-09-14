# R1 Delivery & Safety Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship SP1 — RFC 8058 one-click unsubscribe, hardened subscribe, removal of the legacy Stripe endpoints, counts-only diagnose and email-free logs, a scripts database guard, faithfulness prompt rules, a delivering contact form, and the dead `/pricing` link fix.

**Architecture:** The backend owns every secret-bearing step: an HMAC token module, a small Beehiiv client, `POST /api/newsletter/unsubscribe`, `POST /api/contact` and an admin test-send. The sender still renders one HTML per language, now with a placeholder that `_recipient_messages` replaces per recipient while adding the `List-Unsubscribe` header pair. The Next.js app gains a thin one-click route on the canonical `www` host that forwards server-side, a confirm page that reads `?t=`, and pure modules covered by a new Vitest suite.

**Tech Stack:** Python 3.11 in CI (local `venv312`), FastAPI 0.128, pydantic 2.12, requests, resend 2.30.1, pytest · Next.js 16.0.10, React 19, TypeScript 5.9, Vitest 5.0.0

**Spec:** `docs/superpowers/specs/2026-09-13-independent-newsletter-program-design.md` — §3 (constraints), AD3, AD5, §6.1 (scope), §7 (testing), §8 (rollout)

## Global Constraints

- **Scope:** spec §6.1 only. Keep `app/models/subscription.py`, migration `0009` and the `stripe_*` fields in `app/config.py` — SP3a reuses them, and deleting the fields would break local `.env` files that still set them (pydantic-settings rejects unknown keys).
- **Authorization (spec §3.6):** pushing this branch and opening a PR are pre-approved; test emails to the founder's inbox are pre-approved. Merging to `main` (deploys Vercel), `railway up`, setting Railway variables, emails to subscribers and DNS changes each need explicit founder approval.
- **Test safety (spec §3.7):** tests and scripts never touch the production database. `ai-hub-backend/.env` stays renamed to `.env.r1-backup` for the whole execution. Every local `python`, `pytest` or `alembic` command sets a local `DATABASE_URL` in the same command. Never wrap Python in `railway run`.
- **Frontend builds:** `next build` runs in CI only (it fetches the production API). Locally run `npm test` and `npm run lint`.
- **Python compatibility:** CI runs Python 3.11 (`ruff.toml` targets py311). No 3.12-only syntax.
- **Untracked files:** never stage or edit `ai-information-hub/lib/text-split.ts` or `docs/monetization-plan.md`.
- **Public repository:** committed files contain no absolute local paths (write `<repo-root>`) and no employer references; the controller scans the branch before every push.
- **AD3 headers, exactly:** `List-Unsubscribe: <https://www.datacubeai.space/api/newsletter/unsubscribe?t=<token>>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`. Canonical `www` host only. `GET` never unsubscribes. No email address in any URL.
- **AD3 token:** `v1.<kid>.<subscription_id>.<signature>`, HMAC-SHA256, compared with `hmac.compare_digest`. Verification fails closed without a usable `SIGNING_SECRET` (at least 32 characters); `SIGNING_SECRET_PREVIOUS` also verifies during a rotation. Minting without a usable secret degrades — no headers, token-less footer link, one error log line — and never blocks a send.
- **Privacy:** subscriber and visitor email addresses never appear in log lines; use `mask_email`, `redact_emails` or the Beehiiv subscription id.
- **AD5 prompts:** edits are additive — append rule text, leave existing prompt lines unchanged.
- **Resend quota:** Resend Free allows 100 emails/day, shared with the newsletter; the contact route caps itself at 20 emails/day.
- **Copy:** never "Edited by …"; the unsubscribe page never tells readers to reply.
- **Release timing:** merging to `main` only redeploys Vercel and can happen at any time. Before `railway up`, confirm that no Daily Collection or Daily Newsletter run is in progress (`gh run list --workflow daily-collect.yml --limit 1`, and the same for `daily-newsletter.yml`) and that no translation backfill thread is running: the redeploy kills in-process work. Since PR #8 a newsletter run can start anywhere between 06:00 and 21:59 Berlin.
- **Commits:** one commit per task (fix-up commits allowed). Every commit message ends with the trailer `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Stage by explicit path with `git -C <repo-root> add <paths>`; run git from the repository root, never from a subdirectory.

### Command reference

| Purpose | Command |
|---|---|
| Backend unit tests | `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m "not integration" -q` |
| One backend test file | `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/<file>.py -q` |
| Backend integration tests | `cd <repo-root>/ai-hub-backend && DATABASE_URL=postgresql://postgres:test@localhost:5433/aihub_test OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m integration -q` (Docker container `aihub-test-pg`) |
| Backend lint | `cd <repo-root>/ai-hub-backend && venv312/bin/python -m ruff check app/ scripts/ tests/` |
| Frontend unit tests | `cd <repo-root>/ai-information-hub && npm test` |
| Frontend type check | `cd <repo-root>/ai-information-hub && npm run lint` |

## File map

| Path | Change | Responsibility |
|---|---|---|
| `ai-hub-backend/app/db_guard.py` | create | local-database detection; script guard |
| `ai-hub-backend/app/services/privacy.py` | create | `mask_email`, `redact_emails` for log lines |
| `ai-hub-backend/app/services/unsubscribe_tokens.py` | create | mint/verify signed unsubscribe tokens |
| `ai-hub-backend/app/services/beehiiv.py` | create | Beehiiv unsubscribe-by-id and lookup-by-email |
| `ai-hub-backend/app/services/rate_limit.py` | create | in-process sliding-window limiter |
| `ai-hub-backend/app/routers/newsletter.py` | create | `POST /api/newsletter/unsubscribe` |
| `ai-hub-backend/app/routers/contact.py` | create | `POST /api/contact` |
| `ai-hub-backend/app/routers/stripe_webhook.py` | delete | legacy Stripe endpoints |
| `ai-hub-backend/app/routers/__init__.py`, `app/main.py` | modify | router registration |
| `ai-hub-backend/app/config.py` | modify | `signing_secret`, `signing_secret_previous`, `contact_inbox` |
| `ai-hub-backend/app/routers/admin.py` | modify | counts-only diagnose; test-send endpoint |
| `ai-hub-backend/app/routers/developer.py` | modify | masked logs; API tool page link |
| `ai-hub-backend/app/services/newsletter_sender.py` | modify | subscription ids, per-recipient messages, test send |
| `ai-hub-backend/app/services/llm_processor.py` | modify | AD5 rule constants appended to five prompts |
| `ai-hub-backend/scripts/{daily_collect,weekly_collect,send_newsletter,backfill_translations,init_db}.py` | modify | call the guard first |
| `ai-hub-backend/requirements.txt` | modify | drop `stripe` |
| `ai-hub-backend/tests/conftest.py` | modify | import the guard from `app.db_guard` |
| `ai-hub-backend/tests/test_conftest_guard.py` | delete | superseded by `tests/test_db_guard.py` |
| `ai-hub-backend/tests/test_newsletter_translation_gate.py` | modify | new sender shapes |
| `ai-hub-backend/tests/test_*.py` (13 new files, named per task) | create | tests |
| `ai-hub-backend/.env.example`, `ai-hub-backend/README.md` | modify | docs |
| `ai-information-hub/package.json`, `package-lock.json`, `vitest.config.ts` | modify/create | Vitest |
| `ai-information-hub/lib/newsletter/subscribe-request.ts` (+ test) | create | subscribe input validation helpers |
| `ai-information-hub/lib/newsletter/unsubscribe-token.ts` (+ test) | create | token shape + extraction |
| `ai-information-hub/app/api/subscribe/route.ts` | modify | hardening |
| `ai-information-hub/lib/translations.ts` | modify | double opt-in success copy (8 languages) |
| `ai-information-hub/app/api/newsletter/unsubscribe/route.ts` | create | RFC 8058 endpoint |
| `ai-information-hub/app/unsubscribe/page.tsx`, `unsubscribe-confirm.tsx` | modify/create | confirm page |
| `ai-information-hub/app/api/checkout/route.ts` | delete | dead Stripe proxy |
| `ai-information-hub/app/for-teams/contact-form.tsx`, `page.tsx` | modify | contact form posts to the backend |
| `.github/workflows/ci.yml` | modify | frontend `npm test` step |
| `README.md`, `ai-information-hub/README.md` | modify | docs |

## Task order

| Task | Deliverable | Depends on |
|---|---|---|
| 1 | Scripts DB guard | — |
| 2 | Privacy helpers, developer log masking, API link fix | — |
| 3 | Legacy Stripe removal | — |
| 4 | New settings, counts-only diagnose with required `test_email` | 2 |
| 5 | AD5 faithfulness prompt rules | — |
| 6 | Vitest setup, subscribe hardening, CI test step | — |
| 7 | Unsubscribe token module | — |
| 8 | Beehiiv client, `POST /api/newsletter/unsubscribe` | 4, 7 |
| 9 | Sender per-recipient delivery | 2, 4, 7 |
| 10 | Admin test-send | 8, 9 |
| 11 | Frontend one-click route and confirm page | 6, 8 |
| 12 | Contact form end to end | 4 |
| 13 | Docs and env template | 1–12 |

## Execution setup (controller, once, before Task 1)

- [ ] **Step 1: Confirm the branch and a clean tree**

```bash
git -C <repo-root> switch feat/r1-delivery-safety
git -C <repo-root> status --short
```

Expected: only `?? ai-information-hub/lib/text-split.ts` and `?? docs/monetization-plan.md`.

- [ ] **Step 2: Park the production `.env` for the whole execution**

```bash
mv <repo-root>/ai-hub-backend/.env <repo-root>/ai-hub-backend/.env.r1-backup
```

- [ ] **Step 3: Record the baseline**

```bash
cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m "not integration" -q
cd <repo-root>/ai-hub-backend && DATABASE_URL=postgresql://postgres:test@localhost:5433/aihub_test venv312/bin/python -m alembic upgrade head
cd <repo-root>/ai-hub-backend && DATABASE_URL=postgresql://postgres:test@localhost:5433/aihub_test OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m integration -q
cd <repo-root>/ai-hub-backend && venv312/bin/python -m ruff check app/ scripts/ tests/
cd <repo-root>/ai-information-hub && npm run lint
```

Expected: all green. Write the pass/deselect counts into the ledger.

---

### Task 1: Scripts DB guard

Spec §6.1: scripts refuse a non-local database when `DATABASE_URL` is not set in the process environment (i.e. inherited from `.env`). `Settings` cannot tell an exported value from a `.env` value, so the guard reads `os.environ` directly. It runs first in `main()`: `init_db.py` opens a connection in `create_tables()` before it creates a session.

**Files:**
- Create: `ai-hub-backend/app/db_guard.py`
- Create: `ai-hub-backend/tests/test_db_guard.py`
- Delete: `ai-hub-backend/tests/test_conftest_guard.py`
- Modify: `ai-hub-backend/tests/conftest.py`
- Modify: `ai-hub-backend/scripts/daily_collect.py`, `scripts/weekly_collect.py`, `scripts/send_newsletter.py`, `scripts/backfill_translations.py`, `scripts/init_db.py`

**Interfaces:**
- Consumes: `app.config.get_settings()` (existing)
- Produces: `app.db_guard.database_url_is_local(url: str) -> bool`; `app.db_guard.script_database_refusal(environ: Mapping[str, str], settings_url: str) -> str | None`; `app.db_guard.guard_script_database() -> None` (prints the refusal to stderr and raises `SystemExit(2)`)

- [ ] **Step 1: Write the failing tests** — create `ai-hub-backend/tests/test_db_guard.py`:

```python
"""Tests and scripts refuse a production database inherited from `.env`."""

import importlib
import sys
from types import SimpleNamespace

import pytest

import app.database as database
import app.db_guard as db_guard
from app.db_guard import database_url_is_local, script_database_refusal

REMOTE_URL = "postgresql://user:secret@db.example-host.railway.app:5432/railway"
SCRIPTS = [
    "scripts.daily_collect",
    "scripts.weekly_collect",
    "scripts.send_newsletter",
    "scripts.backfill_translations",
    "scripts.init_db",
]


def _database_tripwire(*args, **kwargs):
    raise AssertionError("the script touched the database before the guard ran")


def test_sqlite_is_local():
    assert database_url_is_local("sqlite:///./test.db")


def test_localhost_postgres_is_local():
    assert database_url_is_local("postgresql://postgres:test@localhost:5433/aihub_test")
    assert database_url_is_local("postgresql://postgres:test@127.0.0.1:5432/aihub_test")


def test_remote_postgres_is_rejected():
    assert not database_url_is_local(REMOTE_URL)
    assert not database_url_is_local("postgresql://user:secret@10.0.0.5:5432/app")


def test_exported_database_url_is_trusted_even_when_remote():
    assert script_database_refusal({"DATABASE_URL": REMOTE_URL}, REMOTE_URL) is None


def test_local_database_from_env_file_is_allowed():
    assert script_database_refusal({}, "postgresql://postgres:test@localhost:5433/aihub_test") is None


def test_remote_database_from_env_file_is_refused_without_echoing_credentials():
    message = script_database_refusal({}, REMOTE_URL)
    assert message is not None
    assert "DATABASE_URL" in message
    assert "secret" not in message


def test_blank_exported_database_url_does_not_count_as_exported():
    assert script_database_refusal({"DATABASE_URL": "  "}, REMOTE_URL) is not None


@pytest.mark.parametrize("module_name", SCRIPTS)
def test_every_script_refuses_an_inherited_remote_database_first(monkeypatch, module_name):
    module = importlib.import_module(module_name)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setattr(db_guard, "get_settings", lambda: SimpleNamespace(database_url=REMOTE_URL))
    monkeypatch.setattr(sys, "argv", [module_name])
    for target in (database, module):
        for name in ("get_engine", "get_session_local"):
            if hasattr(target, name):
                monkeypatch.setattr(target, name, _database_tripwire)

    with pytest.raises(SystemExit) as excinfo:
        module.main()

    assert excinfo.value.code == 2
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_db_guard.py -q`
Expected: collection error `ModuleNotFoundError: No module named 'app.db_guard'`.

- [ ] **Step 3: Create `ai-hub-backend/app/db_guard.py`**

```python
"""Refuse to run tests or scripts against a database that is not clearly local.

`app/config.py` reads `.env`, which can point at production. A process that
exported DATABASE_URL itself (Railway, CI, an explicit local command) made a
deliberate choice; a remote URL that only came from `.env` is refused.
"""

import os
import sys
from typing import Mapping
from urllib.parse import urlparse

from app.config import get_settings

LOCAL_DB_HOSTS = {"localhost", "127.0.0.1", "::1"}


def database_url_is_local(url: str) -> bool:
    """True for sqlite URLs and URLs whose host is this machine."""
    if url.startswith("sqlite"):
        return True
    return (urlparse(url).hostname or "") in LOCAL_DB_HOSTS


def script_database_refusal(environ: Mapping[str, str], settings_url: str) -> str | None:
    """Why a script must not run, or None when its database is safe to use."""
    if environ.get("DATABASE_URL", "").strip():
        return None
    if database_url_is_local(settings_url):
        return None
    return (
        "Refusing to run: DATABASE_URL is not exported in this shell and the value from .env "
        "points at a non-local database. Export DATABASE_URL explicitly in the same command "
        "(Railway and CI already do)."
    )


def guard_script_database() -> None:
    """Exit with status 2 before a script can connect to a remote database inherited from .env."""
    message = script_database_refusal(os.environ, get_settings().database_url)
    if message:
        print(message, file=sys.stderr)
        raise SystemExit(2)
```

- [ ] **Step 4: Point the pytest guard at the shared function and delete the old test file**

Replace the whole content of `ai-hub-backend/tests/conftest.py` with:

```python
"""Pytest bootstrap for the backend test suite.

1. Make the backend package root importable.
2. Refuse to run against a non-local database: `app/config.py` reads `.env`,
   which can point at production, and the integration tests delete rows.
"""

import pathlib
import sys

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))


def pytest_configure(config):
    from app.config import get_settings
    from app.db_guard import database_url_is_local

    url = get_settings().database_url
    if not database_url_is_local(url):
        pytest.exit(
            "Refusing to run tests: DATABASE_URL is not a local database. Export one first, "
            "e.g. DATABASE_URL=postgresql://postgres:test@localhost:5433/aihub_test (integration) "
            "or DATABASE_URL=sqlite:///./test.db (unit).",
            returncode=2,
        )
```

Then:

```bash
git -C <repo-root> rm -q ai-hub-backend/tests/test_conftest_guard.py
```

- [ ] **Step 5: Run the tests — the function tests pass, the script tests still fail**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_db_guard.py -q`
Expected: `5 failed, 7 passed`; every failure is `AssertionError: the script touched the database before the guard ran`.

- [ ] **Step 6: Call the guard first in every script**

`ai-hub-backend/scripts/daily_collect.py` — replace

```python
sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
```

with

```python
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db_guard import guard_script_database

logging.basicConfig(
```

and replace

```python
def main():
    parser = argparse.ArgumentParser(description="Daily data collection")
```

with

```python
def main():
    guard_script_database()
    parser = argparse.ArgumentParser(description="Daily data collection")
```

`ai-hub-backend/scripts/send_newsletter.py` — replace

```python
sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
```

with

```python
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db_guard import guard_script_database

logging.basicConfig(
```

and replace

```python
def main():
    parser = argparse.ArgumentParser(description="Send daily newsletter")
```

with

```python
def main():
    guard_script_database()
    parser = argparse.ArgumentParser(description="Send daily newsletter")
```

`ai-hub-backend/scripts/backfill_translations.py` — replace

```python
sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
```

with

```python
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db_guard import guard_script_database

logging.basicConfig(
```

and replace

```python
def main():
    parser = argparse.ArgumentParser(description="Repair translations for existing content")
```

with

```python
def main():
    guard_script_database()
    parser = argparse.ArgumentParser(description="Repair translations for existing content")
```

`ai-hub-backend/scripts/weekly_collect.py` — replace

```python
from app.database import get_session_local
from app.services.collector import run_collection
```

with

```python
from app.database import get_session_local
from app.db_guard import guard_script_database
from app.services.collector import run_collection
```

and replace

```python
def main():
    parser = argparse.ArgumentParser(description="Data collection (weekly mode)")
```

with

```python
def main():
    guard_script_database()
    parser = argparse.ArgumentParser(description="Data collection (weekly mode)")
```

`ai-hub-backend/scripts/init_db.py` — replace

```python
from app.database import Base, get_engine, get_session_local
```

with

```python
from app.database import Base, get_engine, get_session_local
from app.db_guard import guard_script_database
```

and replace

```python
def main():
    parser = argparse.ArgumentParser(description="Initialize AI Hub database")
```

with

```python
def main():
    guard_script_database()
    parser = argparse.ArgumentParser(description="Initialize AI Hub database")
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_db_guard.py -q`
Expected: `12 passed`.

- [ ] **Step 8: Run the unit suite and lint**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m "not integration" -q`
Expected: 0 failures.
Run: `cd <repo-root>/ai-hub-backend && venv312/bin/python -m ruff check app/ scripts/ tests/`
Expected: `All checks passed!`

- [ ] **Step 9: Commit**

```bash
git -C <repo-root> add ai-hub-backend/app/db_guard.py ai-hub-backend/tests/test_db_guard.py ai-hub-backend/tests/conftest.py ai-hub-backend/scripts/daily_collect.py ai-hub-backend/scripts/weekly_collect.py ai-hub-backend/scripts/send_newsletter.py ai-hub-backend/scripts/backfill_translations.py ai-hub-backend/scripts/init_db.py
git -C <repo-root> commit -m "feat(safety): scripts refuse a remote database inherited from .env" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

(The deletion of `tests/test_conftest_guard.py` is already staged by `git rm`.)

---

### Task 2: Privacy helpers, developer log masking, API link fix

**Files:**
- Create: `ai-hub-backend/app/services/privacy.py`
- Create: `ai-hub-backend/tests/test_privacy.py`
- Create: `ai-hub-backend/tests/test_developer_rate_limit_message.py`
- Modify: `ai-hub-backend/app/routers/developer.py` (import block; log lines 116 and 176; 429 detail at 223–224)

**Interfaces:**
- Produces: `app.services.privacy.mask_email(value: str | None) -> str` (`"jane.doe@example.com"` → `"j***@example.com"`, anything else → `"<no-email>"`); `app.services.privacy.redact_emails(text: str) -> str` (every address-like token → `"<email>"`)

- [ ] **Step 1: Write the failing tests**

Create `ai-hub-backend/tests/test_privacy.py`:

```python
"""Log lines never carry full email addresses."""

from app.services.privacy import mask_email, redact_emails


def test_mask_email_keeps_only_first_character_and_domain():
    assert mask_email("jane.doe@example.com") == "j***@example.com"
    assert mask_email("  Jane@Example.com ") == "J***@Example.com"


def test_mask_email_handles_missing_or_malformed_values():
    assert mask_email(None) == "<no-email>"
    assert mask_email("") == "<no-email>"
    assert mask_email("not-an-email") == "<no-email>"
    assert mask_email("@example.com") == "<no-email>"


def test_redact_emails_replaces_addresses_in_free_text():
    assert redact_emails('Invalid `to` field: "reader@example.com"') == 'Invalid `to` field: "<email>"'
    assert redact_emails("no address here") == "no address here"
```

Create `ai-hub-backend/tests/test_developer_rate_limit_message.py`:

```python
"""The developer API 429 message links to a page that exists."""

from datetime import datetime
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

import app.routers.developer as developer


class _Query:
    def __init__(self, record):
        self.record = record

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self.record


def test_rate_limit_message_links_to_the_api_tool_page(monkeypatch):
    record = SimpleNamespace(
        is_active=True, tier="free", calls_today=100,
        calls_today_date=datetime.utcnow().date(), calls_total=100,
    )
    db = SimpleNamespace(query=lambda model: _Query(record))
    request = SimpleNamespace(headers={"X-API-Key": "dcai_test"})
    monkeypatch.setattr("app.config.get_settings", lambda: SimpleNamespace(admin_api_key="admin-key"))

    with pytest.raises(HTTPException) as excinfo:
        developer.check_developer_rate_limit(request, db)

    assert excinfo.value.status_code == 429
    assert "https://www.datacubeai.space/en/tools/ai-news-api" in excinfo.value.detail
    assert "/pricing" not in excinfo.value.detail
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_privacy.py tests/test_developer_rate_limit_message.py -q`
Expected: `test_privacy.py` errors with `ModuleNotFoundError: No module named 'app.services.privacy'`; the rate-limit test fails on the `/en/tools/ai-news-api` assertion.

- [ ] **Step 3: Create `ai-hub-backend/app/services/privacy.py`**

```python
"""Keep subscriber and visitor email addresses out of log lines."""

import re

_EMAIL_PATTERN = re.compile(r"[^\s@\"'<>]+@[^\s@\"'<>]+")


def mask_email(value: str | None) -> str:
    """Log-safe form of an email address: first character and domain."""
    if not value or "@" not in value:
        return "<no-email>"
    local, _, domain = value.strip().rpartition("@")
    if not local or not domain:
        return "<no-email>"
    return f"{local[0]}***@{domain}"


def redact_emails(text: str) -> str:
    """Replace anything that looks like an email address in free text, e.g. provider errors."""
    return _EMAIL_PATTERN.sub("<email>", text)
```

- [ ] **Step 4: Update `ai-hub-backend/app/routers/developer.py`**

Replace

```python
from app.database import get_db
from app.models.developer import ApiKey
```

with

```python
from app.database import get_db
from app.models.developer import ApiKey
from app.services.privacy import mask_email
```

Replace `    logger.info(f"New API key registered for {body.email}")` with

```python
    logger.info(f"New API key registered for {mask_email(body.email)}")
```

Replace `    logger.info(f"API key rotated for {record.email}")` with

```python
    logger.info(f"API key rotated for {mask_email(record.email)}")
```

Replace

```python
            detail=f"Daily rate limit exceeded ({limit} calls/day for {record.tier} tier). "
                   f"Upgrade your plan at https://www.datacubeai.space/pricing",
```

with

```python
            detail=f"Daily rate limit exceeded ({limit} calls/day for {record.tier} tier). "
                   f"API details: https://www.datacubeai.space/en/tools/ai-news-api",
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_privacy.py tests/test_developer_rate_limit_message.py -q`
Expected: `4 passed`.

- [ ] **Step 6: Run the unit suite and lint**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m "not integration" -q`
Expected: 0 failures.
Run: `cd <repo-root>/ai-hub-backend && venv312/bin/python -m ruff check app/ scripts/ tests/`
Expected: `All checks passed!`

- [ ] **Step 7: Commit**

```bash
git -C <repo-root> add ai-hub-backend/app/services/privacy.py ai-hub-backend/tests/test_privacy.py ai-hub-backend/tests/test_developer_rate_limit_message.py ai-hub-backend/app/routers/developer.py
git -C <repo-root> commit -m "fix(privacy): mask developer emails in logs; link 429 to the API page" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Legacy Stripe removal

Removes the unauthenticated `POST /api/stripe/cancel` (cancel by email), `GET /api/stripe/subscription/{email}`, `POST /api/stripe/create-checkout`, the legacy webhook, and the unused frontend `/api/checkout` proxy. The `subscriptions` model, migration `0009` and the `stripe_*` settings stay.

**Files:**
- Create: `ai-hub-backend/tests/test_legacy_stripe_removed.py`
- Delete: `ai-hub-backend/app/routers/stripe_webhook.py`
- Delete: `ai-information-hub/app/api/checkout/route.ts`
- Modify: `ai-hub-backend/app/routers/__init__.py`, `ai-hub-backend/app/main.py`, `ai-hub-backend/requirements.txt`

**Interfaces:**
- Produces: `app.routers` no longer exports `stripe_router`; Task 8 and Task 12 add `newsletter_router` and `contact_router` to the same two files.

- [ ] **Step 1: Write the failing test** — create `ai-hub-backend/tests/test_legacy_stripe_removed.py`:

```python
"""The unauthenticated legacy Stripe endpoints are gone (SP3a re-introduces payments)."""

from app.main import app


def test_no_route_is_registered_under_api_stripe():
    paths = {getattr(route, "path", "") for route in app.routes}
    assert not [path for path in paths if path.startswith("/api/stripe")]


def test_openapi_schema_has_no_stripe_paths():
    assert not [path for path in app.openapi()["paths"] if path.startswith("/api/stripe")]
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_legacy_stripe_removed.py -q`
Expected: `2 failed` (the lists contain `/api/stripe/webhook`, `/api/stripe/create-checkout`, `/api/stripe/subscription/{email}`, `/api/stripe/cancel`).

- [ ] **Step 3: Delete the router and the frontend proxy**

```bash
git -C <repo-root> rm -q ai-hub-backend/app/routers/stripe_webhook.py ai-information-hub/app/api/checkout/route.ts
```

- [ ] **Step 4: Remove the registrations and the dependency**

`ai-hub-backend/app/routers/__init__.py` — delete the line `from app.routers.stripe_webhook import router as stripe_router` and the line `    "stripe_router",`.

`ai-hub-backend/app/main.py` — delete the line `    stripe_router,` from the `from app.routers import (...)` block and the line `app.include_router(stripe_router, prefix="/api")`.

`ai-hub-backend/requirements.txt` — replace

```text
# Email
resend>=2.0.0

# Payments
stripe>=8.0.0

# Rate Limiting
```

with

```text
# Email
resend>=2.0.0

# Rate Limiting
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_legacy_stripe_removed.py -q`
Expected: `2 passed`.

- [ ] **Step 6: Verify nothing else references the removed code**

Run: `grep -rn "stripe" <repo-root>/ai-hub-backend/app <repo-root>/ai-hub-backend/scripts <repo-root>/ai-hub-backend/tests --include=*.py`
Expected: matches only in `app/config.py` (the kept `stripe_*` settings), `app/models/` (the kept `Subscription` model) and `tests/test_legacy_stripe_removed.py` (this task's test).
Run: `grep -rn "api/checkout" <repo-root>/ai-information-hub/app <repo-root>/ai-information-hub/components <repo-root>/ai-information-hub/lib`
Expected: no output.

- [ ] **Step 7: Run the unit suite, lint and the frontend type check**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m "not integration" -q`
Expected: 0 failures.
Run: `cd <repo-root>/ai-hub-backend && venv312/bin/python -m ruff check app/ scripts/ tests/`
Expected: `All checks passed!`
Run: `cd <repo-root>/ai-information-hub && npm run lint`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git -C <repo-root> add ai-hub-backend/tests/test_legacy_stripe_removed.py ai-hub-backend/app/routers/__init__.py ai-hub-backend/app/main.py ai-hub-backend/requirements.txt
git -C <repo-root> commit -m "fix(security): remove unauthenticated legacy Stripe endpoints and checkout proxy" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: New settings; counts-only diagnose with a required `test_email`

**Files:**
- Modify: `ai-hub-backend/app/config.py`
- Modify: `ai-hub-backend/app/routers/admin.py` (import block; the whole `diagnose_newsletter` function)
- Create: `ai-hub-backend/tests/test_newsletter_diagnose.py`

**Interfaces:**
- Consumes: `mask_email`, `redact_emails` (Task 2)
- Produces: `Settings.signing_secret: str = ""`, `Settings.signing_secret_previous: str = ""`, `Settings.contact_inbox: str = ""` (env vars `SIGNING_SECRET`, `SIGNING_SECRET_PREVIOUS`, `CONTACT_INBOX`); `admin.py` imports `BaseModel`, `EmailStr`, `mask_email` and `redact_emails` (Task 10 reuses them); `POST /api/admin/newsletter/diagnose` requires a JSON body `{"test_email": "…"}` (never a query parameter: access logs record URLs) and reports `env_check.variables.SIGNING_SECRET` / `CONTACT_INBOX` as booleans

- [ ] **Step 1: Write the failing tests** — create `ai-hub-backend/tests/test_newsletter_diagnose.py`:

```python
"""Diagnose reports counts only and mails nobody but the explicit test address."""

from types import SimpleNamespace

import requests
import resend
from fastapi.testclient import TestClient

import app.routers.admin as admin
from app.config import Settings
from app.database import get_db
from app.main import app
from app.routers.admin import verify_api_key

SUBSCRIBERS = [
    {"id": "sub_1", "email": "reader.one@example.com", "custom_fields": [{"name": "Language", "value": "de"}]},
    {"id": "sub_2", "email": "reader.two@example.com", "custom_fields": [{"name": "language", "value": "en"}]},
    {"id": "sub_3", "email": "reader.three@example.com", "custom_fields": []},
]


class _BeehiivPage:
    ok = True
    status_code = 200
    text = "not used"

    def json(self):
        return {"data": SUBSCRIBERS, "total_pages": 1, "total_results": 3}


def _post(monkeypatch, url, body=None):
    sent = []
    monkeypatch.setattr(admin, "get_settings", lambda: SimpleNamespace(
        resend_api_key="re_test", beehiiv_api_key="bh_test", beehiiv_publication_id="pub_test",
        newsletter_from_email="News <news@example.com>", signing_secret="", contact_inbox="",
    ))
    monkeypatch.setattr(requests, "get", lambda *args, **kwargs: _BeehiivPage())
    monkeypatch.setattr(resend.Emails, "send", lambda params: sent.append(params) or {"id": "email_1"})
    app.dependency_overrides[verify_api_key] = lambda: True
    app.dependency_overrides[get_db] = lambda: None
    try:
        response = TestClient(app).post(url, json=body)
    finally:
        app.dependency_overrides.pop(verify_api_key, None)
        app.dependency_overrides.pop(get_db, None)
    return response, sent


def test_new_settings_default_to_empty_and_read_the_environment(monkeypatch):
    assert Settings(_env_file=None).signing_secret == ""
    monkeypatch.setenv("SIGNING_SECRET", "x" * 40)
    monkeypatch.setenv("CONTACT_INBOX", "inbox@example.com")
    settings = Settings(_env_file=None)
    assert settings.signing_secret == "x" * 40
    assert settings.signing_secret_previous == ""
    assert settings.contact_inbox == "inbox@example.com"


def test_diagnose_requires_test_email(monkeypatch):
    response, sent = _post(monkeypatch, "/api/admin/newsletter/diagnose?period_id=2026-09-12", body={})

    assert response.status_code == 422
    assert sent == []


def test_diagnose_returns_counts_without_subscriber_addresses(monkeypatch):
    response, sent = _post(
        monkeypatch, "/api/admin/newsletter/diagnose?period_id=2026-09-12", body={"test_email": "founder@example.com"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["beehiiv_subscribers"]["subscriber_count_page1"] == 3
    assert body["beehiiv_subscribers"]["language_counts"] == {"de": 1, "en": 2}
    assert "raw_response" not in body["beehiiv_subscribers"]
    assert "parsed_subscribers" not in body["beehiiv_subscribers"]
    assert "reader." not in response.text
    assert body["env_check"]["variables"]["SIGNING_SECRET"] is False
    assert body["env_check"]["variables"]["CONTACT_INBOX"] is False
    assert [params["to"] for params in sent] == [["founder@example.com"]]
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_newsletter_diagnose.py -q`
Expected: `3 failed` — `Settings` has no attribute `signing_secret`; diagnose answers 200 without `test_email`; the report contains `raw_response` and subscriber addresses.

- [ ] **Step 3: Add the settings** — in `ai-hub-backend/app/config.py` replace

```python
    newsletter_from_email: str = "Data Cube AI <newsletter@datacubeai.space>"

    # Stripe
```

with

```python
    newsletter_from_email: str = "Data Cube AI <newsletter@datacubeai.space>"

    # One-click unsubscribe tokens (HMAC-SHA256, at least 32 characters). Generate with:
    #   python -c "import secrets; print(secrets.token_urlsafe(48))"
    signing_secret: str = ""
    signing_secret_previous: str = ""  # keeps old links valid during a key rotation

    # Contact form destination (POST /api/contact)
    contact_inbox: str = ""

    # Stripe (unused since R1; membership / SP3a reuses these)
```

- [ ] **Step 4: Update the imports of `ai-hub-backend/app/routers/admin.py`** — replace

```python
from typing import Optional

from app.database import get_db, get_session_local
from app.config import get_settings
```

with

```python
from typing import Optional

from pydantic import BaseModel, EmailStr

from app.database import get_db, get_session_local
from app.config import get_settings
from app.services.privacy import mask_email, redact_emails
```

- [ ] **Step 5: Replace the diagnose function** — in `ai-hub-backend/app/routers/admin.py`, replace everything from `@router.post("/newsletter/diagnose")` down to and including the `    return report` line directly above `@router.get("/health")` with:

```python
class NewsletterDiagnoseBody(BaseModel):
    test_email: EmailStr


@router.post("/newsletter/diagnose")
async def diagnose_newsletter(
    body: NewsletterDiagnoseBody,
    period_id: Optional[str] = None,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_api_key),
):
    """
    Diagnostic endpoint that tests each step of the newsletter pipeline independently.

    Returns a JSON report with results for:
    1. Environment variable checks (booleans, never secret values)
    2. Beehiiv subscriber counts (first page; counts and languages, never addresses)
    3. Content availability for the given period
    4. Test email send via Resend to the required `test_email`

    Requires X-API-Key header.
    """
    import requests as http_requests
    import resend
    from datetime import date, timedelta
    from app.models.week import Week

    test_email = body.test_email  # JSON body, never the query string: access logs record URLs
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
        "SIGNING_SECRET": bool(settings.signing_secret),
        "CONTACT_INBOX": bool(settings.contact_inbox),
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

    # ---- Step 2: Count Beehiiv subscribers (first page; never addresses) ----
    logger.info("[diagnose] Step 2: Counting Beehiiv subscribers (page 1)")
    if settings.beehiiv_api_key and settings.beehiiv_publication_id:
        try:
            resp = http_requests.get(
                f"https://api.beehiiv.com/v2/publications/{settings.beehiiv_publication_id}/subscriptions",
                headers={"Authorization": f"Bearer {settings.beehiiv_api_key}"},
                params={"status": "active", "limit": 100, "page": 1, "expand[]": "custom_fields"},
                timeout=30,
            )
            report["beehiiv_subscribers"] = {"status_code": resp.status_code, "ok": resp.ok}
            if resp.ok:
                data = resp.json()
                subs = data.get("data", [])
                language_counts: dict[str, int] = {}
                for sub in subs:
                    lang = "en"
                    for field in sub.get("custom_fields", []):
                        if field.get("name", "").lower() == "language" and field.get("value"):
                            lang = str(field["value"]).strip().lower()
                    language_counts[lang] = language_counts.get(lang, 0) + 1
                report["beehiiv_subscribers"].update({
                    "subscriber_count_page1": len(subs),
                    "total_pages": data.get("total_pages", 1),
                    "total_results": data.get("total_results"),
                    "language_counts": language_counts,
                })
            logger.info(f"[diagnose] Beehiiv response: {resp.status_code}")
        except Exception as e:
            report["beehiiv_subscribers"] = {"error": redact_emails(str(e))}
            logger.error(f"[diagnose] Beehiiv fetch failed: {redact_emails(str(e))}")
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

    # ---- Step 4: Send test email via Resend (only to the explicit test_email) ----
    logger.info(f"[diagnose] Step 4: Sending test email to {mask_email(test_email)}")
    if settings.resend_api_key:
        try:
            resend.api_key = settings.resend_api_key
            result = resend.Emails.send({
                "from": settings.newsletter_from_email,
                "to": [test_email],
                "subject": f"[DIAGNOSTIC] Newsletter pipeline test — {period_id}",
                "html": (
                    "<h2>Newsletter Diagnostic Test</h2>"
                    f"<p>This is a test email from the newsletter diagnostic endpoint.</p>"
                    f"<p><strong>Period:</strong> {period_id}</p>"
                    f"<p><strong>Timestamp:</strong> {date.today().isoformat()}</p>"
                    "<p>If you received this, Resend is working correctly.</p>"
                ),
            })
            report["resend_test"] = {"ok": True, "recipient": test_email, "result": result}
            logger.info(f"[diagnose] Resend test result: {result}")
        except Exception as e:
            report["resend_test"] = {"ok": False, "recipient": test_email, "error": redact_emails(str(e))}
            logger.error(f"[diagnose] Resend test failed: {redact_emails(str(e))}")
    else:
        report["resend_test"] = {"ok": False, "error": "RESEND_API_KEY not set"}
        logger.warning("[diagnose] Skipping Resend — missing API key")

    logger.info(f"[diagnose] Diagnosis complete for {period_id}")
    return report
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_newsletter_diagnose.py -q`
Expected: `3 passed`.

- [ ] **Step 7: Run the unit suite and lint**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m "not integration" -q`
Expected: 0 failures.
Run: `cd <repo-root>/ai-hub-backend && venv312/bin/python -m ruff check app/ scripts/ tests/`
Expected: `All checks passed!`

- [ ] **Step 8: Commit**

```bash
git -C <repo-root> add ai-hub-backend/app/config.py ai-hub-backend/app/routers/admin.py ai-hub-backend/tests/test_newsletter_diagnose.py
git -C <repo-root> commit -m "fix(privacy): diagnose reports counts only and requires test_email" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: AD5 faithfulness prompt rules

AD5: the tech, investment, M&A and editorial prompts gain epistemic-status rules (preserve hedges, attribute claims, include a counterparty response only when the source contains one, never upgrade a claim to a fact); the translation prompt preserves hedging and attribution. The rules live in two module constants so the prompt-contract tests can pin them.

**Files:**
- Modify: `ai-hub-backend/app/services/llm_processor.py` (constants above `class LLMProcessor:`; five prompt f-strings)
- Create: `ai-hub-backend/tests/test_prompt_contracts.py`

**Interfaces:**
- Produces: `app.services.llm_processor.EPISTEMIC_RULES: str`, `app.services.llm_processor.TRANSLATION_FAITHFULNESS_RULES: str`

- [ ] **Step 1: Write the failing tests** — create `ai-hub-backend/tests/test_prompt_contracts.py`:

```python
"""Every prompt that writes or translates news prose carries the AD5 faithfulness rules."""

from app.services.llm_processor import EPISTEMIC_RULES, TRANSLATION_FAITHFULNESS_RULES, LLMProcessor

ARTICLE = {
    "source": "Example News",
    "title": "Startup reportedly in talks to raise $50M",
    "link": "https://example.com/story",
    "summary": "The startup is reportedly in talks to raise $50M, according to people familiar with the matter.",
    "published": "2026-09-12",
}


def _processor(monkeypatch, response):
    processor = LLMProcessor.__new__(LLMProcessor)  # skip __init__: no API key, no client
    prompts = []

    def fake_call_llm(prompt, temperature=0.3, **kwargs):
        prompts.append(prompt)
        return response

    def fake_call_with_fallback(prompt, temperature, timeout, **kwargs):
        prompts.append(prompt)
        return response

    monkeypatch.setattr(processor, "_call_llm", fake_call_llm)
    monkeypatch.setattr(processor, "_call_with_fallback", fake_call_with_fallback)
    return processor, prompts


def test_rules_cover_every_ad5_obligation():
    rules = EPISTEMIC_RULES.lower()
    assert "hedge" in rules
    assert "attribute" in rules
    assert "declined to comment" in rules
    assert "never upgrade" in rules
    assert "hedges" in TRANSLATION_FAITHFULNESS_RULES
    assert "attribution" in TRANSLATION_FAITHFULNESS_RULES


def test_tech_prompt_carries_the_rules(monkeypatch):
    processor, prompts = _processor(monkeypatch, '{"en": []}')
    processor.process_tech_articles([ARTICLE], count=5)
    assert len(prompts) == 1
    assert EPISTEMIC_RULES in prompts[0]


def test_investment_prompt_carries_the_rules(monkeypatch):
    processor, prompts = _processor(
        monkeypatch, '{"primaryMarket": {"en": []}, "secondaryMarket": {"en": []}, "ma": {"en": []}}'
    )
    processor.process_investment_articles([ARTICLE], count=5)
    assert EPISTEMIC_RULES in prompts[0]


def test_ma_prompt_carries_the_rules(monkeypatch):
    processor, prompts = _processor(monkeypatch, '{"ma": {"en": []}}')
    processor.process_ma_articles([ARTICLE], count=5)
    assert EPISTEMIC_RULES in prompts[0]


def test_editorial_prompt_carries_the_rules(monkeypatch):
    processor, prompts = _processor(monkeypatch, '{"bullets": []}')
    processor.generate_editorial({"en": [{"impact": "high", "content": ARTICLE["summary"]}]}, {}, {})
    assert EPISTEMIC_RULES in prompts[0]


def test_translation_prompt_carries_the_rules(monkeypatch):
    processor, prompts = _processor(monkeypatch, '[{"_idx": 0, "content": "Das Startup verhandelt angeblich."}]')
    processor._try_translate_batch([{"content": ARTICLE["summary"]}], "de", ["content"], "German")
    assert TRANSLATION_FAITHFULNESS_RULES in prompts[0]
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_prompt_contracts.py -q`
Expected: collection error `ImportError: cannot import name 'EPISTEMIC_RULES'`.

- [ ] **Step 3: Add the constants** — in `ai-hub-backend/app/services/llm_processor.py` replace the line `class LLMProcessor:` with:

```python
# AD5 — faithfulness by prompt contract. Appended to every prompt that writes or
# translates news prose; tests/test_prompt_contracts.py pins that they stay there.
EPISTEMIC_RULES = """Epistemic status (faithfulness):
- Preserve hedges at the strength the source uses: "may", "could", "reportedly", "plans to", "is expected to" and "in talks" stay hedged; never present them as completed facts.
- Attribute claims to whoever makes them ("the company says", "according to Reuters"); benchmark results, capability claims and figures published by a company are attributed to that company.
- Mention a response from a person or company named in a story (a denial, "declined to comment") only when the source text contains it; never invent one and never state that none was given.
- Never upgrade a claim, rumor, plan, forecast or allegation to a fact."""

TRANSLATION_FAITHFULNESS_RULES = """Preserve epistemic status: translate hedges ("may", "could", "reportedly", "plans to", "is expected to") with equally tentative wording, keep every attribution ("says", "according to", "claims"), and never turn a claim into a statement of fact."""


class LLMProcessor:
```

- [ ] **Step 4: Run the tests — only the rules test passes**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_prompt_contracts.py -q`
Expected: `5 failed, 1 passed` (each failure: the rules are not in the captured prompt).

- [ ] **Step 5: Append the rules to the five prompts** (all edits add lines; no existing prompt line changes)

Translation prompt in `_try_translate_batch` — replace

```text
For array fields (like tags), translate each element.

Input:
```

with

```text
For array fields (like tags), translate each element.
{TRANSLATION_FAITHFULNESS_RULES}

Input:
```

Tech prompt in `process_tech_articles` — replace

```text
- No hype, no marketing language, no rhetorical questions.

Rules:
- iconType: Brain (LLM/AI models), Server (infrastructure), Zap (research), Cpu (safety/technical)
```

with

```text
- No hype, no marketing language, no rhetorical questions.

{EPISTEMIC_RULES}

Rules:
- iconType: Brain (LLM/AI models), Server (infrastructure), Zap (research), Cpu (safety/technical)
```

Investment prompt in `process_investment_articles` — replace

```text
- For secondaryMarket: ONLY include ticker and content. Price/change/marketCap will be fetched from real-time API.

ROUND CATEGORY CLASSIFICATION (for Primary Market):
```

with

```text
- For secondaryMarket: ONLY include ticker and content. Price/change/marketCap will be fetched from real-time API.

{EPISTEMIC_RULES}

ROUND CATEGORY CLASSIFICATION (for Primary Market):
```

M&A prompt in `process_ma_articles` — replace

```text
  sentence supports them.

AI INDUSTRY TAXONOMY (required - skip deal if none apply):
```

with

```text
  sentence supports them.

{EPISTEMIC_RULES}

AI INDUSTRY TAXONOMY (required - skip deal if none apply):
```

Editorial prompt in `generate_editorial` — replace

```text
- Write as neutral analysis, not opinion theater.

Output ONLY valid JSON:
```

with

```text
- Write as neutral analysis, not opinion theater.

{EPISTEMIC_RULES}

Output ONLY valid JSON:
```

All five prompts are f-strings, so `{EPISTEMIC_RULES}` and `{TRANSLATION_FAITHFULNESS_RULES}` interpolate the constants.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_prompt_contracts.py -q`
Expected: `6 passed`.

- [ ] **Step 7: Run the unit suite and lint**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m "not integration" -q`
Expected: 0 failures.
Run: `cd <repo-root>/ai-hub-backend && venv312/bin/python -m ruff check app/ scripts/ tests/`
Expected: `All checks passed!`

- [ ] **Step 8: Commit**

```bash
git -C <repo-root> add ai-hub-backend/app/services/llm_processor.py ai-hub-backend/tests/test_prompt_contracts.py
git -C <repo-root> commit -m "feat(faithfulness): hedge and attribution rules in writing and translation prompts" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Vitest setup, subscribe hardening, CI test step

Spec §6.1 subscribe hardening: server-side email validation; a per-IP rate limit (not the cookie/origin guard); default language `en`; `double_opt_override: "on"` with `reactivate_existing: true`; `utm_source`/`referring_site`. With forced double opt-in the success message must tell the reader to confirm by email. Vitest (spec §7: "Vitest for pure modules") arrives here with its first consumer.

**Files:**
- Modify: `ai-information-hub/package.json`, `ai-information-hub/package-lock.json` (via npm)
- Create: `ai-information-hub/vitest.config.ts`
- Create: `ai-information-hub/lib/newsletter/subscribe-request.ts`
- Create: `ai-information-hub/lib/newsletter/subscribe-request.test.ts`
- Modify: `ai-information-hub/app/api/subscribe/route.ts` (whole file)
- Modify: `ai-information-hub/lib/translations.ts` (eight `subscribed:` lines)
- Modify: `.github/workflows/ci.yml` (frontend job)

**Interfaces:**
- Consumes: `enforceRateLimit`, `readJsonBody`, `ApiRouteError`, `apiErrorResponse` from `@/lib/server/api-guard` (existing)
- Produces: `npm test` (runs `vitest run` over `lib/**/*.test.ts`; Task 11 adds a test file there); `parseSubscribeRequest(body: unknown): SubscribeRequest | null`; `referringSite(referer: string | null): string | undefined`; `redactEmails(text: string): string`

- [ ] **Step 1: Install Vitest and add the test script**

```bash
cd <repo-root>/ai-information-hub && npm install --save-dev --save-exact vitest@5.0.0
```

In `ai-information-hub/package.json` replace

```json
    "lint": "tsc --noEmit",
    "start": "next start"
  },
```

with

```json
    "lint": "tsc --noEmit",
    "start": "next start",
    "test": "vitest run"
  },
```

Create `ai-information-hub/vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Write the failing test** — create `ai-information-hub/lib/newsletter/subscribe-request.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseSubscribeRequest, redactEmails, referringSite } from "./subscribe-request";

describe("parseSubscribeRequest", () => {
  it("accepts a valid address and trims it", () => {
    expect(parseSubscribeRequest({ email: "  reader@example.com ", language: "zh" })).toEqual({
      email: "reader@example.com",
      language: "zh",
    });
  });

  it("defaults an unsupported or missing language to English", () => {
    expect(parseSubscribeRequest({ email: "reader@example.com", language: "xx" })?.language).toBe("en");
    expect(parseSubscribeRequest({ email: "reader@example.com" })?.language).toBe("en");
  });

  it("rejects malformed, missing or oversized addresses", () => {
    expect(parseSubscribeRequest({ email: "not-an-email" })).toBeNull();
    expect(parseSubscribeRequest({ email: "a@b" })).toBeNull();
    expect(parseSubscribeRequest({ language: "en" })).toBeNull();
    expect(parseSubscribeRequest(null)).toBeNull();
    expect(parseSubscribeRequest({ email: `${"a".repeat(250)}@example.com` })).toBeNull();
  });
});

describe("referringSite", () => {
  it("keeps origin and path but drops query and fragment", () => {
    expect(referringSite("https://www.datacubeai.space/en/week/2026-09-12?utm=x#top")).toBe(
      "https://www.datacubeai.space/en/week/2026-09-12",
    );
  });

  it("ignores missing or non-http referers", () => {
    expect(referringSite(null)).toBeUndefined();
    expect(referringSite("javascript:alert(1)")).toBeUndefined();
    expect(referringSite("not a url")).toBeUndefined();
  });
});

describe("redactEmails", () => {
  it("removes addresses from provider error text", () => {
    expect(redactEmails('{"error":"reader@example.com is invalid"}')).toBe('{"error":"<email> is invalid"}');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd <repo-root>/ai-information-hub && npm test`
Expected: FAIL — the suite cannot resolve `./subscribe-request`.

- [ ] **Step 4: Create `ai-information-hub/lib/newsletter/subscribe-request.ts`**

```ts
export const SUPPORTED_NEWSLETTER_LANGUAGES = ["de", "en", "zh", "fr", "es", "pt", "ja", "ko"] as const;

export type NewsletterLanguage = (typeof SUPPORTED_NEWSLETTER_LANGUAGES)[number];

export type SubscribeRequest = { email: string; language: NewsletterLanguage };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LENGTH = 254;

/** Validated subscribe input, or null when the email address is missing or malformed. */
export function parseSubscribeRequest(body: unknown): SubscribeRequest | null {
  if (!body || typeof body !== "object") return null;
  const { email, language } = body as { email?: unknown; language?: unknown };
  if (typeof email !== "string") return null;
  const trimmed = email.trim();
  if (trimmed.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(trimmed)) return null;
  const lang = SUPPORTED_NEWSLETTER_LANGUAGES.find((code) => code === language) ?? "en";
  return { email: trimmed, language: lang };
}

/** Page the reader subscribed from (origin + path only), for Beehiiv's referring_site. */
export function referringSite(referer: string | null): string | undefined {
  if (!referer) return undefined;
  try {
    const url = new URL(referer);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return `${url.origin}${url.pathname}`.slice(0, 500);
  } catch {
    return undefined;
  }
}

/** Remove email addresses from provider error text before it is logged. */
export function redactEmails(text: string): string {
  return text.replace(/[^\s@"'<>]+@[^\s@"'<>]+/g, "<email>");
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd <repo-root>/ai-information-hub && npm test`
Expected: `Tests  6 passed (6)`.

- [ ] **Step 6: Replace `ai-information-hub/app/api/subscribe/route.ts`** with:

```ts
import {
  ApiRouteError,
  apiErrorResponse,
  enforceRateLimit,
  readJsonBody,
} from "@/lib/server/api-guard";
import {
  parseSubscribeRequest,
  redactEmails,
  referringSite,
} from "@/lib/newsletter/subscribe-request";

// Per-IP limit only: subscribe forms must work for first-time visitors, so the
// cookie/origin guard used by the LLM endpoints does not apply here.
const SUBSCRIBE_RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };

export async function POST(req: Request) {
  try {
    enforceRateLimit(req, "subscribe", SUBSCRIBE_RATE_LIMIT);
    const parsed = parseSubscribeRequest(await readJsonBody<unknown>(req, 2_000));
    if (!parsed) {
      return Response.json({ error: "A valid email address is required" }, { status: 400 });
    }

    const apiKey = process.env.BEEHIIV_API_KEY;
    const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
    if (!apiKey || !publicationId) {
      console.error("Missing BEEHIIV_API_KEY or BEEHIIV_PUBLICATION_ID");
      return Response.json({ error: "Newsletter service not configured" }, { status: 503 });
    }

    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: parsed.email,
          // Forced double opt-in: every signup, including a re-subscribe of an
          // address that opted out, must be confirmed from the inbox.
          double_opt_override: "on",
          reactivate_existing: true,
          send_welcome_email: true,
          utm_source: "website",
          referring_site: referringSite(req.headers.get("referer")),
          custom_fields: [{ name: "language", value: parsed.language }],
        }),
      },
    );

    if (!res.ok) {
      const detail = redactEmails((await res.text()).slice(0, 300));
      console.error(`Beehiiv API error ${res.status}: ${detail}`);
      if (res.status === 409) {
        return Response.json({ ok: true, alreadySubscribed: true });
      }
      return Response.json({ error: "Subscription failed" }, { status: 502 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof ApiRouteError) return apiErrorResponse(err);
    console.error("Subscribe error:", err instanceof Error ? err.message : "unknown");
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
```

- [ ] **Step 7: Update the success copy for double opt-in** — `ai-information-hub/lib/translations.ts` stores non-ASCII characters as literal `\uXXXX` escape sequences (backslash, `u`, four hex digits). Type them exactly as shown; do not insert the characters themselves. Replace each line:

```text
    subscribed: "Abonniert!",
→   subscribed: "Bitte bestätige die E-Mail in deinem Postfach!",

    subscribed: "Subscribed!",
→   subscribed: "Check your inbox to confirm!",

    subscribed: "订阅成功！",
→   subscribed: "请查收邮件并确认订阅！",

    subscribed: "Abonné !",
→   subscribed: "Confirmez via l’e-mail reçu !",

    subscribed: "¡Suscrito!",
→   subscribed: "¡Confirma desde tu correo!",

    subscribed: "Inscrito!",
→   subscribed: "Confirme pelo e-mail recebido!",

    subscribed: "購読完了！",
→   subscribed: "確認メールで登録を完了してください！",

    subscribed: "구독 완료!",
→   subscribed: "메일에서 구독을 확인해 주세요!",
```

(DE, EN, ZH, FR, ES, PT, JA, KO. Each `→` line is the complete replacement line, with the same four-space indentation.)

Then verify: `grep -c "subscribed: " <repo-root>/ai-information-hub/lib/translations.ts` prints `8`.

- [ ] **Step 8: Run the tests in CI** — in `.github/workflows/ci.yml` replace

```yaml
      - name: TypeScript type check
        run: npm run lint

      - name: Build
```

with

```yaml
      - name: TypeScript type check
        run: npm run lint

      - name: Unit tests (Vitest)
        run: npm test

      - name: Build
```

- [ ] **Step 9: Run the frontend checks**

Run: `cd <repo-root>/ai-information-hub && npm test`
Expected: `Tests  6 passed (6)`.
Run: `cd <repo-root>/ai-information-hub && npm run lint`
Expected: exit 0 (this also type-checks `vitest.config.ts` and the test file).

- [ ] **Step 10: Commit**

```bash
git -C <repo-root> add ai-information-hub/package.json ai-information-hub/package-lock.json ai-information-hub/vitest.config.ts ai-information-hub/lib/newsletter/subscribe-request.ts ai-information-hub/lib/newsletter/subscribe-request.test.ts ai-information-hub/app/api/subscribe/route.ts ai-information-hub/lib/translations.ts .github/workflows/ci.yml
git -C <repo-root> commit -m "feat(subscribe): validation, per-IP limit, EN default, forced double opt-in; Vitest" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Unsubscribe token module

AD3 token: `v1.` + key id + HMAC-SHA256 over the Beehiiv subscription id; `hmac.compare_digest`; fail closed without `SIGNING_SECRET`; two keys verify during rotation; no email addresses in URLs.

**Files:**
- Create: `ai-hub-backend/app/services/unsubscribe_tokens.py`
- Create: `ai-hub-backend/tests/test_unsubscribe_tokens.py`

**Interfaces:**
- Produces (Tasks 8–10 rely on these exact names):
  - `MIN_SECRET_LENGTH = 32`
  - `usable_secret(secret: str | None) -> bool`
  - `mint_token(subscription_id: str | None, secret: str | None) -> str | None`
  - `verify_token(token: str | None, keys: list[str]) -> str | None` (returns the subscription id)
  - `verification_keys(settings) -> list[str]` (usable values of `settings.signing_secret` and `settings.signing_secret_previous`, in that order; empty when `settings.signing_secret` is unusable, so verification fails closed even if only the previous secret is set)
- Token shape (Task 11 mirrors it in TypeScript): `^v1\.[0-9a-f]{8}\.[A-Za-z0-9_-]{1,64}\.[A-Za-z0-9_-]{43}$`

- [ ] **Step 1: Write the failing tests** — create `ai-hub-backend/tests/test_unsubscribe_tokens.py`:

```python
"""One-click unsubscribe tokens round-trip, resist tampering and fail closed."""

from types import SimpleNamespace

from app.services.unsubscribe_tokens import mint_token, verification_keys, verify_token

SECRET = "s" * 40
OLD_SECRET = "o" * 40
SUBSCRIPTION_ID = "sub_3f6a7c1e-1b2c-4d5e-8f90-123456789abc"


def test_token_round_trips_to_the_subscription_id():
    token = mint_token(SUBSCRIPTION_ID, SECRET)
    assert token.startswith("v1.")
    assert verify_token(token, [SECRET]) == SUBSCRIPTION_ID


def test_token_contains_no_email_and_is_url_safe():
    token = mint_token(SUBSCRIPTION_ID, SECRET)
    assert "@" not in token
    assert all(ch.isalnum() or ch in "._-" for ch in token)


def test_tampered_tokens_are_rejected():
    token = mint_token(SUBSCRIPTION_ID, SECRET)
    version, kid, subscription_id, signature = token.split(".")
    other_signature = ("A" if signature[0] != "A" else "B") + signature[1:]
    assert verify_token(f"{version}.{kid}.sub_other.{signature}", [SECRET]) is None
    assert verify_token(f"{version}.{kid}.{subscription_id}.{other_signature}", [SECRET]) is None
    assert verify_token(token + "\n", [SECRET]) is None
    assert verify_token("", [SECRET]) is None
    assert verify_token(None, [SECRET]) is None


def test_verification_fails_closed_without_usable_keys():
    token = mint_token(SUBSCRIPTION_ID, SECRET)
    assert verify_token(token, []) is None
    assert verify_token(token, ["short"]) is None


def test_previous_secret_still_verifies_during_rotation():
    old_token = mint_token(SUBSCRIPTION_ID, OLD_SECRET)
    assert verify_token(old_token, [SECRET, OLD_SECRET]) == SUBSCRIPTION_ID
    assert verify_token(old_token, [SECRET]) is None


def test_minting_needs_a_usable_secret_and_a_plain_subscription_id():
    assert mint_token(SUBSCRIPTION_ID, "") is None
    assert mint_token(SUBSCRIPTION_ID, "too-short") is None
    assert mint_token("", SECRET) is None
    assert mint_token(None, SECRET) is None
    assert mint_token("sub/../../admin", SECRET) is None


def test_verification_keys_need_a_usable_current_secret():
    assert verification_keys(SimpleNamespace(signing_secret=SECRET, signing_secret_previous="")) == [SECRET]
    assert verification_keys(SimpleNamespace(signing_secret=SECRET, signing_secret_previous=OLD_SECRET)) == [SECRET, OLD_SECRET]
    assert verification_keys(SimpleNamespace(signing_secret=SECRET, signing_secret_previous="short")) == [SECRET]
    assert verification_keys(SimpleNamespace(signing_secret="short", signing_secret_previous=OLD_SECRET)) == []
    assert verification_keys(SimpleNamespace(signing_secret="", signing_secret_previous=OLD_SECRET)) == []
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_unsubscribe_tokens.py -q`
Expected: collection error `ModuleNotFoundError: No module named 'app.services.unsubscribe_tokens'`.

- [ ] **Step 3: Create `ai-hub-backend/app/services/unsubscribe_tokens.py`**

```python
"""Opaque one-click unsubscribe tokens (spec AD3).

Format: ``v1.<kid>.<subscription_id>.<signature>``

- ``kid``: 8 hex characters derived from the signing secret, so the verifier
  can pick the matching key while two secrets are live during a rotation.
- ``signature``: unpadded base64url HMAC-SHA256 over
  ``unsubscribe.v1.<kid>.<subscription_id>``.

Tokens carry the Beehiiv subscription id, never an email address. Minting
without a usable secret returns None (the sender degrades); verification
without a usable secret always fails (fail closed).
"""

import base64
import hashlib
import hmac
import re

TOKEN_VERSION = "v1"
MIN_SECRET_LENGTH = 32
_PURPOSE = "unsubscribe"
_SUBSCRIPTION_ID_PATTERN = re.compile(r"[A-Za-z0-9_-]{1,64}")
_TOKEN_PATTERN = re.compile(r"v1\.([0-9a-f]{8})\.([A-Za-z0-9_-]{1,64})\.([A-Za-z0-9_-]{43})")


def usable_secret(secret: str | None) -> bool:
    """True when a signing secret is long enough to trust."""
    return bool(secret) and len(secret) >= MIN_SECRET_LENGTH


def key_id(secret: str) -> str:
    """Public 8-hex identifier of a signing secret."""
    return hmac.new(secret.encode(), b"unsubscribe-key-id", hashlib.sha256).hexdigest()[:8]


def _signature(secret: str, kid: str, subscription_id: str) -> str:
    message = f"{_PURPOSE}.{TOKEN_VERSION}.{kid}.{subscription_id}".encode()
    digest = hmac.new(secret.encode(), message, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()


def mint_token(subscription_id: str | None, secret: str | None) -> str | None:
    """Token for one subscription, or None when the secret or the id is unusable."""
    if not usable_secret(secret) or not subscription_id:
        return None
    if not _SUBSCRIPTION_ID_PATTERN.fullmatch(subscription_id):
        return None
    kid = key_id(secret)
    return f"{TOKEN_VERSION}.{kid}.{subscription_id}.{_signature(secret, kid, subscription_id)}"


def verify_token(token: str | None, keys: list[str]) -> str | None:
    """Subscription id for a valid token, else None. Fails closed without usable keys."""
    match = _TOKEN_PATTERN.fullmatch(token or "")
    if not match:
        return None
    kid, subscription_id, signature = match.groups()
    for secret in keys:
        if usable_secret(secret) and hmac.compare_digest(key_id(secret), kid):
            expected = _signature(secret, kid, subscription_id)
            return subscription_id if hmac.compare_digest(expected, signature) else None
    return None


def verification_keys(settings) -> list[str]:
    """Usable current and previous signing secrets, current first.

    Empty when SIGNING_SECRET itself is unusable: verification fails closed even
    if SIGNING_SECRET_PREVIOUS is still set (a rotation always has a current key).
    """
    if not usable_secret(settings.signing_secret):
        return []
    return [s for s in (settings.signing_secret, settings.signing_secret_previous) if usable_secret(s)]
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_unsubscribe_tokens.py -q`
Expected: `7 passed`.

- [ ] **Step 5: Lint**

Run: `cd <repo-root>/ai-hub-backend && venv312/bin/python -m ruff check app/ scripts/ tests/`
Expected: `All checks passed!`

- [ ] **Step 6: Commit**

```bash
git -C <repo-root> add ai-hub-backend/app/services/unsubscribe_tokens.py ai-hub-backend/tests/test_unsubscribe_tokens.py
git -C <repo-root> commit -m "feat(newsletter): signed one-click unsubscribe tokens with key rotation" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Beehiiv client and `POST /api/newsletter/unsubscribe`

AD3: the backend calls Beehiiv's update-subscription-by-id endpoint with `unsubscribe: true` — confirmed against Beehiiv's OpenAPI document: `PUT https://api.beehiiv.com/v2/publications/{publicationId}/subscriptions/{subscriptionId}` with body `{"unsubscribe": true}`. `GET` never unsubscribes. The endpoint is idempotent: a subscription Beehiiv no longer knows (404) still answers `unsubscribed`.

**Files:**
- Create: `ai-hub-backend/app/services/beehiiv.py`
- Create: `ai-hub-backend/app/routers/newsletter.py`
- Modify: `ai-hub-backend/app/routers/__init__.py`, `ai-hub-backend/app/main.py`
- Create: `ai-hub-backend/tests/test_beehiiv_client.py`
- Create: `ai-hub-backend/tests/test_newsletter_unsubscribe_router.py`

**Interfaces:**
- Consumes: `verify_token`, `verification_keys` (Task 7); `Settings.signing_secret`, `Settings.signing_secret_previous` (Task 4)
- Produces:
  - `app.services.beehiiv.BeehiivError(RuntimeError)`
  - `app.services.beehiiv.unsubscribe_subscription(api_key: str, publication_id: str, subscription_id: str) -> str` (`"unsubscribed"` or `"not_found"`; raises `BeehiivError` on any other non-2xx status)
  - `app.services.beehiiv.find_subscription_id(api_key: str, publication_id: str, email: str) -> str | None` (Task 10)
  - `POST /api/newsletter/unsubscribe`, JSON body `{"token": "<token>"}` → `200 {"status": "unsubscribed"}` · `400 {"detail": "invalid_token"}` · `503 {"detail": "unsubscribe_unavailable"}` (no usable `SIGNING_SECRET` or no Beehiiv settings) · `502 {"detail": "unsubscribe_failed"}` (Task 11 maps these)
  - `app.routers.newsletter_router`

- [ ] **Step 1: Write the failing tests**

Create `ai-hub-backend/tests/test_beehiiv_client.py`:

```python
"""The Beehiiv client calls the documented endpoints and keeps response bodies out of errors."""

import pytest
import requests

from app.services import beehiiv


class _Response:
    def __init__(self, status_code, payload=None):
        self.status_code = status_code
        self.ok = 200 <= status_code < 300
        self._payload = payload or {}
        self.text = '{"email": "reader@example.com"}'

    def json(self):
        return self._payload


def test_unsubscribe_puts_unsubscribe_true_on_the_subscription(monkeypatch):
    calls = []
    monkeypatch.setattr(requests, "put", lambda url, **kwargs: calls.append((url, kwargs)) or _Response(200))

    assert beehiiv.unsubscribe_subscription("bh_key", "pub_1", "sub_abc") == "unsubscribed"

    url, kwargs = calls[0]
    assert url == "https://api.beehiiv.com/v2/publications/pub_1/subscriptions/sub_abc"
    assert kwargs["json"] == {"unsubscribe": True}
    assert kwargs["headers"] == {"Authorization": "Bearer bh_key"}


def test_unsubscribe_of_an_unknown_subscription_reports_not_found(monkeypatch):
    monkeypatch.setattr(requests, "put", lambda url, **kwargs: _Response(404))
    assert beehiiv.unsubscribe_subscription("bh_key", "pub_1", "sub_gone") == "not_found"


def test_unsubscribe_errors_do_not_include_response_bodies(monkeypatch):
    monkeypatch.setattr(requests, "put", lambda url, **kwargs: _Response(500))
    with pytest.raises(beehiiv.BeehiivError) as excinfo:
        beehiiv.unsubscribe_subscription("bh_key", "pub_1", "sub_abc")
    assert "reader@example.com" not in str(excinfo.value)


def test_find_subscription_id_url_encodes_the_address(monkeypatch):
    calls = []
    monkeypatch.setattr(
        requests, "get",
        lambda url, **kwargs: calls.append(url) or _Response(200, {"data": {"id": "sub_abc"}}),
    )

    assert beehiiv.find_subscription_id("bh_key", "pub_1", "founder+test@example.com") == "sub_abc"
    assert calls == [
        "https://api.beehiiv.com/v2/publications/pub_1/subscriptions/by_email/founder%2Btest%40example.com"
    ]


def test_find_subscription_id_returns_none_for_unknown_addresses(monkeypatch):
    monkeypatch.setattr(requests, "get", lambda url, **kwargs: _Response(404))
    assert beehiiv.find_subscription_id("bh_key", "pub_1", "nobody@example.com") is None
```

Create `ai-hub-backend/tests/test_newsletter_unsubscribe_router.py`:

```python
"""POST /api/newsletter/unsubscribe verifies the token and unsubscribes by subscription id only."""

from types import SimpleNamespace

from fastapi.testclient import TestClient

import app.routers.newsletter as newsletter
from app.main import app
from app.services.beehiiv import BeehiivError
from app.services.unsubscribe_tokens import mint_token

SECRET = "s" * 40


def _settings(signing_secret=SECRET):
    return SimpleNamespace(
        signing_secret=signing_secret, signing_secret_previous="",
        beehiiv_api_key="bh_key", beehiiv_publication_id="pub_1",
    )


def _client(monkeypatch, settings, calls, outcome="unsubscribed"):
    monkeypatch.setattr(newsletter, "get_settings", lambda: settings)

    def fake_unsubscribe(api_key, publication_id, subscription_id):
        calls.append(subscription_id)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    monkeypatch.setattr(newsletter, "unsubscribe_subscription", fake_unsubscribe)
    return TestClient(app)


def test_valid_token_unsubscribes_that_subscription(monkeypatch):
    calls = []
    response = _client(monkeypatch, _settings(), calls).post(
        "/api/newsletter/unsubscribe", json={"token": mint_token("sub_abc", SECRET)}
    )
    assert response.status_code == 200
    assert response.json() == {"status": "unsubscribed"}
    assert calls == ["sub_abc"]


def test_unknown_subscription_still_reports_unsubscribed(monkeypatch):
    calls = []
    response = _client(monkeypatch, _settings(), calls, outcome="not_found").post(
        "/api/newsletter/unsubscribe", json={"token": mint_token("sub_gone", SECRET)}
    )
    assert response.status_code == 200


def test_forged_token_is_rejected_without_calling_beehiiv(monkeypatch):
    calls = []
    response = _client(monkeypatch, _settings(), calls).post(
        "/api/newsletter/unsubscribe", json={"token": mint_token("sub_abc", "x" * 40)}
    )
    assert response.status_code == 400
    assert calls == []


def test_missing_signing_secret_fails_closed(monkeypatch):
    calls = []
    response = _client(monkeypatch, _settings(signing_secret=""), calls).post(
        "/api/newsletter/unsubscribe", json={"token": mint_token("sub_abc", SECRET)}
    )
    assert response.status_code == 503
    assert calls == []


def test_previous_secret_alone_does_not_verify(monkeypatch):
    calls = []
    settings = _settings(signing_secret="")
    settings.signing_secret_previous = SECRET
    response = _client(monkeypatch, settings, calls).post(
        "/api/newsletter/unsubscribe", json={"token": mint_token("sub_abc", SECRET)}
    )
    assert response.status_code == 503
    assert calls == []


def test_beehiiv_failure_returns_502(monkeypatch):
    calls = []
    failure = BeehiivError("Beehiiv unsubscribe returned HTTP 500")
    response = _client(monkeypatch, _settings(), calls, outcome=failure).post(
        "/api/newsletter/unsubscribe", json={"token": mint_token("sub_abc", SECRET)}
    )
    assert response.status_code == 502


def test_get_never_unsubscribes(monkeypatch):
    calls = []
    token = mint_token("sub_abc", SECRET)
    response = _client(monkeypatch, _settings(), calls).get(f"/api/newsletter/unsubscribe?t={token}")
    assert response.status_code == 405
    assert calls == []
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_beehiiv_client.py tests/test_newsletter_unsubscribe_router.py -q`
Expected: two collection errors (`Interrupted: 2 errors during collection`) — `ImportError: cannot import name 'beehiiv' from 'app.services'` in `test_beehiiv_client.py` and `ModuleNotFoundError: No module named 'app.routers.newsletter'` in `test_newsletter_unsubscribe_router.py`.

- [ ] **Step 3: Create `ai-hub-backend/app/services/beehiiv.py`**

```python
"""Minimal Beehiiv API client for subscription changes (Beehiiv is the list of record)."""

from urllib.parse import quote

import requests

BEEHIIV_API = "https://api.beehiiv.com/v2"
TIMEOUT_SECONDS = 15


class BeehiivError(RuntimeError):
    """Unexpected Beehiiv status. Messages carry the status only, never response bodies."""


def _headers(api_key: str) -> dict:
    return {"Authorization": f"Bearer {api_key}"}


def unsubscribe_subscription(api_key: str, publication_id: str, subscription_id: str) -> str:
    """Unsubscribe one subscription by id. Returns "unsubscribed" or "not_found"."""
    response = requests.put(
        f"{BEEHIIV_API}/publications/{publication_id}/subscriptions/{quote(subscription_id, safe='')}",
        headers=_headers(api_key),
        json={"unsubscribe": True},
        timeout=TIMEOUT_SECONDS,
    )
    if response.status_code == 404:
        return "not_found"
    if not response.ok:
        raise BeehiivError(f"Beehiiv unsubscribe returned HTTP {response.status_code}")
    return "unsubscribed"


def find_subscription_id(api_key: str, publication_id: str, email: str) -> str | None:
    """Subscription id for an address, or None when Beehiiv has no such subscription."""
    response = requests.get(
        f"{BEEHIIV_API}/publications/{publication_id}/subscriptions/by_email/{quote(email, safe='')}",
        headers=_headers(api_key),
        timeout=TIMEOUT_SECONDS,
    )
    if response.status_code == 404:
        return None
    if not response.ok:
        raise BeehiivError(f"Beehiiv subscription lookup returned HTTP {response.status_code}")
    return (response.json().get("data") or {}).get("id")
```

- [ ] **Step 4: Run the client tests to verify they pass**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_beehiiv_client.py -q`
Expected: `5 passed`.

- [ ] **Step 5: Create `ai-hub-backend/app/routers/newsletter.py`**

```python
"""Public newsletter endpoints: RFC 8058 one-click unsubscribe (spec AD3)."""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import get_settings
from app.services.beehiiv import BeehiivError, unsubscribe_subscription
from app.services.unsubscribe_tokens import verification_keys, verify_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/newsletter", tags=["newsletter"])


class UnsubscribeRequest(BaseModel):
    token: str = Field(..., max_length=200)


@router.post("/unsubscribe")
def unsubscribe(body: UnsubscribeRequest):
    """Unsubscribe the subscription named by a signed token. Idempotent."""
    settings = get_settings()
    keys = verification_keys(settings)
    if not keys or not settings.beehiiv_api_key or not settings.beehiiv_publication_id:
        logger.error("One-click unsubscribe unavailable: SIGNING_SECRET or Beehiiv settings missing")
        raise HTTPException(status_code=503, detail="unsubscribe_unavailable")

    subscription_id = verify_token(body.token, keys)
    if subscription_id is None:
        raise HTTPException(status_code=400, detail="invalid_token")

    try:
        outcome = unsubscribe_subscription(
            settings.beehiiv_api_key, settings.beehiiv_publication_id, subscription_id
        )
    except (BeehiivError, OSError) as exc:
        logger.error(f"One-click unsubscribe failed: {exc}")
        raise HTTPException(status_code=502, detail="unsubscribe_failed")

    logger.info(f"One-click unsubscribe processed ({outcome})")
    return {"status": "unsubscribed"}
```

(`requests` exceptions subclass `OSError`.)

- [ ] **Step 6: Register the router**

`ai-hub-backend/app/routers/__init__.py` — replace

```python
from app.routers.deals import router as deals_router
```

with

```python
from app.routers.deals import router as deals_router
from app.routers.newsletter import router as newsletter_router
```

and replace

```python
    "deals_router",
]
```

with

```python
    "deals_router",
    "newsletter_router",
]
```

`ai-hub-backend/app/main.py` — replace

```python
    deals_router,
)
```

with

```python
    deals_router,
    newsletter_router,
)
```

and replace

```python
app.include_router(deals_router, prefix="/api")
```

with

```python
app.include_router(deals_router, prefix="/api")
app.include_router(newsletter_router, prefix="/api")
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_beehiiv_client.py tests/test_newsletter_unsubscribe_router.py -q`
Expected: `12 passed`.

- [ ] **Step 8: Run the unit suite and lint**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m "not integration" -q`
Expected: 0 failures.
Run: `cd <repo-root>/ai-hub-backend && venv312/bin/python -m ruff check app/ scripts/ tests/`
Expected: `All checks passed!`

- [ ] **Step 9: Commit**

```bash
git -C <repo-root> add ai-hub-backend/app/services/beehiiv.py ai-hub-backend/app/routers/newsletter.py ai-hub-backend/app/routers/__init__.py ai-hub-backend/app/main.py ai-hub-backend/tests/test_beehiiv_client.py ai-hub-backend/tests/test_newsletter_unsubscribe_router.py
git -C <repo-root> commit -m "feat(newsletter): POST /api/newsletter/unsubscribe via Beehiiv subscription id" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Sender per-recipient delivery

Spec §6.1: the sender keeps the Beehiiv subscription `id`; per-recipient headers and footer URL, with a placeholder replaced per recipient in the batch loop. HTML is still rendered once per language. This task changes the code path of the next scheduled send, so it updates the translation-gate tests in the same commit.

**Files:**
- Modify: `ai-hub-backend/app/services/newsletter_sender.py`
- Modify: `ai-hub-backend/tests/test_newsletter_translation_gate.py` (`_patch_sender` only)
- Create: `ai-hub-backend/tests/test_newsletter_recipient_messages.py`

**Interfaces:**
- Consumes: `mint_token`, `usable_secret` (Task 7); `redact_emails` (Task 2); `Settings.signing_secret` (Task 4)
- Produces (Task 10 relies on these exact names):
  - `UNSUBSCRIBE_URL_PLACEHOLDER = "__UNSUBSCRIBE_URL__"` (appears exactly once in `_build_email_html` output)
  - `_fetch_beehiiv_subscribers(api_key, publication_id) -> list[dict]`, each `{"id": str | None, "email": str, "language": str}`
  - `_build_subject(data: dict, period_id: str, lang: str) -> str`
  - `_recipient_messages(from_email: str, subject: str, html_content: str, recipients: list[dict], signing_secret: str) -> list[dict]`; each recipient is `{"id": str | None, "email": str}`; each message is `{"from", "to": [email], "subject", "html"}` plus `"headers"` when a token could be minted
  - `_send_via_resend(messages: list[dict]) -> tuple[int, int]` (sent, failed)

- [ ] **Step 1: Write the failing tests**

Create `ai-hub-backend/tests/test_newsletter_recipient_messages.py`:

```python
"""Each newsletter recipient gets a personal one-click unsubscribe link and headers."""

import logging
from urllib.parse import parse_qs, urlparse

import requests
import resend

import app.services.newsletter_sender as sender
from app.services.unsubscribe_tokens import verify_token

SECRET = "s" * 40
HTML = f'<p>news</p><a href="{sender.UNSUBSCRIBE_URL_PLACEHOLDER}">Unsubscribe</a>'
RECIPIENTS = [
    {"id": "sub_one", "email": "one@example.com"},
    {"id": "sub_two", "email": "two@example.com"},
]


def _token_from(url):
    return parse_qs(urlparse(url).query)["t"][0]


def test_messages_carry_the_rfc8058_header_pair_with_a_valid_token():
    messages = sender._recipient_messages("News <news@example.com>", "Subject", HTML, RECIPIENTS, SECRET)

    assert [m["to"] for m in messages] == [["one@example.com"], ["two@example.com"]]
    for message, recipient in zip(messages, RECIPIENTS):
        headers = message["headers"]
        assert headers["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"
        link = headers["List-Unsubscribe"]
        assert link.startswith("<https://www.datacubeai.space/api/newsletter/unsubscribe?t=")
        assert link.endswith(">")
        assert verify_token(_token_from(link[1:-1]), [SECRET]) == recipient["id"]
        assert recipient["email"] not in link


def test_footer_link_is_personal_and_points_at_the_confirm_page():
    messages = sender._recipient_messages("News <news@example.com>", "Subject", HTML, RECIPIENTS, SECRET)

    first, second = (m["html"] for m in messages)
    assert sender.UNSUBSCRIBE_URL_PLACEHOLDER not in first
    assert 'href="https://www.datacubeai.space/unsubscribe?t=v1.' in first
    assert first != second
    assert "one@example.com" not in first


def test_without_a_usable_secret_messages_degrade_but_still_send():
    messages = sender._recipient_messages("News <news@example.com>", "Subject", HTML, RECIPIENTS, "")

    assert all("headers" not in m for m in messages)
    assert all('href="https://www.datacubeai.space/unsubscribe"' in m["html"] for m in messages)


def test_recipient_without_subscription_id_gets_no_one_click_headers():
    messages = sender._recipient_messages(
        "News <news@example.com>", "Subject", HTML, [{"id": None, "email": "x@example.com"}], SECRET
    )
    assert "headers" not in messages[0]


def test_email_template_contains_exactly_one_unsubscribe_placeholder():
    data = {"period_id": "2026-09-12", "tech": [], "videos": [], "funding": [], "ma": [], "tips": []}
    html = sender._build_email_html(data, "en")
    assert html.count(sender.UNSUBSCRIBE_URL_PLACEHOLDER) == 1


def test_resend_receives_the_prepared_messages_in_batches(monkeypatch):
    batches = []
    monkeypatch.setattr(
        resend.Batch, "send",
        lambda params: batches.append(params) or {"data": [{"id": str(i)} for i in range(len(params))]},
    )
    messages = [
        {"from": "f", "to": [f"r{i}@example.com"], "subject": "s", "html": "h",
         "headers": {"List-Unsubscribe-Post": "List-Unsubscribe=One-Click"}}
        for i in range(150)
    ]

    assert sender._send_via_resend(messages) == (150, 0)
    assert [len(batch) for batch in batches] == [100, 50]
    assert batches[0][0]["headers"] == {"List-Unsubscribe-Post": "List-Unsubscribe=One-Click"}


def test_resend_errors_are_logged_without_addresses(monkeypatch, caplog):
    def reject(params):
        raise ValueError("Invalid `to` field: r0@example.com")

    monkeypatch.setattr(resend.Batch, "send", reject)
    caplog.set_level(logging.WARNING)

    assert sender._send_via_resend([{"from": "f", "to": ["r0@example.com"], "subject": "s", "html": "h"}]) == (0, 1)
    assert "r0@example.com" not in caplog.text


class _BeehiivPage:
    ok = True
    status_code = 200

    def json(self):
        return {
            "data": [{"id": "sub_1", "email": "reader@example.com",
                      "custom_fields": [{"name": "Language", "value": "xx"}]}],
            "total_pages": 1,
        }


def test_subscriber_fetch_keeps_the_subscription_id_and_logs_no_address(monkeypatch, caplog):
    monkeypatch.setattr(requests, "get", lambda *args, **kwargs: _BeehiivPage())
    caplog.set_level(logging.WARNING)

    assert sender._fetch_beehiiv_subscribers("bh_key", "pub_1") == [
        {"id": "sub_1", "email": "reader@example.com", "language": "en"}
    ]
    assert "reader@example.com" not in caplog.text
```

In `ai-hub-backend/tests/test_newsletter_translation_gate.py`, replace the whole `_patch_sender` function with:

```python
def _patch_sender(monkeypatch, rows):
    sent = []
    monkeypatch.setattr(sender, "get_settings", lambda: SimpleNamespace(
        resend_api_key="re_test", beehiiv_api_key="bh_test", beehiiv_publication_id="pub_test",
        newsletter_from_email="News <news@example.com>", app_timezone="Europe/Berlin",
        signing_secret="s" * 40,
    ))
    monkeypatch.setattr(sender, "_fetch_period_content", lambda db, period_id: {
        "period_id": period_id, "tech": rows, "videos": [], "funding": [], "ma": [], "tips": [],
    })
    monkeypatch.setattr(sender, "_fetch_beehiiv_subscribers", lambda api_key, publication_id: [
        {"id": "sub_en", "email": "en@example.com", "language": "en"},
        {"id": "sub_de", "email": "de@example.com", "language": "de"},
        {"id": "sub_zh", "email": "zh@example.com", "language": "zh"},
    ])
    monkeypatch.setattr(sender, "_acquire_send_lock", lambda db, period_id, lang: True)
    monkeypatch.setattr(sender, "_mark_send_sent", lambda db, period_id, lang, count: None)
    monkeypatch.setattr(sender, "_mark_send_failed", lambda db, period_id, lang, error: None)
    monkeypatch.setattr(sender, "_build_email_html", lambda data, lang: "<html></html>")

    def fake_send(messages):
        sent.append(tuple(message["to"][0] for message in messages))
        return len(messages), 0

    monkeypatch.setattr(sender, "_send_via_resend", fake_send)
    return sent
```

The five test functions in that file stay unchanged.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_newsletter_recipient_messages.py -q`
Expected: collection error `AttributeError: module 'app.services.newsletter_sender' has no attribute 'UNSUBSCRIBE_URL_PLACEHOLDER'` (`Interrupted: 1 error during collection`).
Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_newsletter_translation_gate.py -q`
Expected: `3 failed, 2 passed` — the old sender calls `fake_send` with four arguments, so `test_ready_translations_are_sent`, `test_misaligned_language_is_held` and `test_few_unready_rows_send_with_english_fallback` fail. (Run the two files separately: a collection error in one file stops pytest before any test runs.)

- [ ] **Step 3: Update imports and constants in `ai-hub-backend/app/services/newsletter_sender.py`**

Replace

```python
from app.services.i18n_utils import get_field, SUPPORTED_LANGUAGES
from app.services.translation_integrity import gate_holds_language, send_gate_counts
```

with

```python
from app.services.i18n_utils import get_field, SUPPORTED_LANGUAGES
from app.services.privacy import redact_emails
from app.services.translation_integrity import gate_holds_language, send_gate_counts
from app.services.unsubscribe_tokens import mint_token, usable_secret
```

Replace `SITE_URL = "https://www.datacubeai.space"` with

```python
SITE_URL = "https://www.datacubeai.space"

# Footer unsubscribe href in the rendered template; _recipient_messages replaces
# it per recipient (personal token link, or the token-less page when degraded).
UNSUBSCRIBE_URL_PLACEHOLDER = "__UNSUBSCRIBE_URL__"
```

- [ ] **Step 4: Use the placeholder in the footer** — replace

```python
                <a href="{SITE_URL}/unsubscribe" style="color:{TEXT_META};text-decoration:underline;">{_s(lang, "unsubscribe")}</a>
```

with

```python
                <a href="{UNSUBSCRIBE_URL_PLACEHOLDER}" style="color:{TEXT_META};text-decoration:underline;">{_s(lang, "unsubscribe")}</a>
```

- [ ] **Step 5: Extract the subject builder** — replace

```python
# ---------------------------------------------------------------------------
# 3. Fetch subscribers from Beehiiv
# ---------------------------------------------------------------------------
```

with

```python
def _build_subject(data: dict, period_id: str, lang: str) -> str:
    """Subject line: localized date (or week) label plus a lead-story preview."""
    lead_preview = ""
    if data["tech"]:
        first_content = get_field(data["tech"][0], "content", lang)
        if first_content:
            first_sentence = first_content.split(".")[0]
            if len(first_sentence) > 30:
                first_sentence = first_sentence[:27] + "..."
            lead_preview = f": {first_sentence}"

    if "-kw" in period_id:
        week_num = period_id.split("-kw")[1]
        subject = _s(lang, "subject_week").format(num=week_num)
    else:
        date_label = _format_date_label(period_id, lang)
        subject = _s(lang, "subject_daily").format(date=date_label)

    return f"\U0001f9ca {subject}{lead_preview}"


# ---------------------------------------------------------------------------
# 3. Fetch subscribers from Beehiiv
# ---------------------------------------------------------------------------
```

- [ ] **Step 6: Keep the subscription id when fetching subscribers**

In the `_fetch_beehiiv_subscribers` docstring replace

```python
      * If NO subscriber on the first page returns any custom_fields,
        log loudly — almost certainly a Beehiiv API misconfig.
    """
```

with

```python
      * If NO subscriber on the first page returns any custom_fields,
        log loudly — almost certainly a Beehiiv API misconfig.
      * Each entry keeps the Beehiiv subscription ``id``: it signs the
        subscriber's one-click unsubscribe token. Log lines use the id,
        never the address.
    """
```

Replace

```python
                logger.warning(
                    f"Subscriber {email} has unrecognised language '{raw_lang}'; "
                    f"defaulting to 'en'"
                )
```

with

```python
                logger.warning(
                    f"Subscriber {sub.get('id', 'unknown')} has unrecognised language '{raw_lang}'; "
                    f"defaulting to 'en'"
                )
```

Replace `            subscribers.append({"email": email, "language": lang})` with

```python
            subscribers.append({"id": sub.get("id"), "email": email, "language": lang})
```

- [ ] **Step 7: Replace the whole `_send_via_resend` function** (from `def _send_via_resend(` down to its final `    return sent, failed`) with these two functions:

```python
def _recipient_messages(
    from_email: str,
    subject: str,
    html_content: str,
    recipients: list[dict],
    signing_secret: str,
) -> list[dict]:
    """One Resend message per recipient, each with a personal unsubscribe link.

    With a usable SIGNING_SECRET and a Beehiiv subscription id, the footer
    links to the token confirm page and RFC 8058 headers enable one-click
    unsubscribe in the mail client. Otherwise the message still goes out and
    the footer links to the token-less /unsubscribe page (send_newsletter logs
    the degraded state once per run).
    """
    messages = []
    for recipient in recipients:
        token = mint_token(recipient.get("id"), signing_secret)
        message = {"from": from_email, "to": [recipient["email"]], "subject": subject}
        if token:
            message["html"] = html_content.replace(
                UNSUBSCRIBE_URL_PLACEHOLDER, f"{SITE_URL}/unsubscribe?t={token}"
            )
            message["headers"] = {
                "List-Unsubscribe": f"<{SITE_URL}/api/newsletter/unsubscribe?t={token}>",
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            }
        else:
            message["html"] = html_content.replace(UNSUBSCRIBE_URL_PLACEHOLDER, f"{SITE_URL}/unsubscribe")
        messages.append(message)
    return messages


def _send_via_resend(messages: list[dict]) -> tuple[int, int]:
    """Send prepared per-recipient messages (see _recipient_messages) via Resend.

    Returns (sent, failed) so the caller can distinguish partial failures
    (some batches OK, some not) from total failure. Previously returned
    only `sent`, which let partial failures masquerade as full success
    and made the idempotency lock mark the cohort 'sent' even when
    some recipients got nothing.
    """
    sent = 0
    failed = 0
    batch_size = 100  # Resend batch API supports up to 100

    for i in range(0, len(messages), batch_size):
        batch = messages[i : i + batch_size]

        try:
            result = resend.Batch.send(batch)
            # Resend Batch.send returns {"data": [{"id": "..."}, ...]} on success.
            # An "id" per email is the only proof of acceptance: if Resend
            # rejects a batch without raising (unverified sender domain,
            # invalid From, ...), counting len(batch) would report deliveries
            # that never happened.
            ids: list[str] = []
            if isinstance(result, dict):
                payload = result.get("data") or result.get("emails")
                if isinstance(payload, list):
                    ids = [item.get("id") for item in payload if isinstance(item, dict) and item.get("id")]
                elif result.get("id"):  # single-email shape, just in case
                    ids = [result["id"]]

            if ids:
                sent += len(ids)
                # If the API accepted fewer than we sent, count the rest as failed.
                if len(ids) < len(batch):
                    short = len(batch) - len(ids)
                    failed += short
                    logger.error(
                        f"Resend batch {i // batch_size + 1}: only {len(ids)}/{len(batch)} "
                        f"emails accepted; {short} silently rejected. "
                        f"result={redact_emails(repr(result))}"
                    )
                else:
                    logger.info(
                        f"Resend batch {i // batch_size + 1}: {len(ids)}/{len(batch)} accepted"
                    )
            else:
                # No ids in response = total batch rejection (most commonly
                # a 4xx that the SDK didn't raise on, e.g. unverified domain).
                failed += len(batch)
                logger.error(
                    f"Resend batch {i // batch_size + 1}: ZERO ids in response — "
                    f"treating all {len(batch)} as failed. result={redact_emails(repr(result))}"
                )
        except Exception as e:
            # Never log the batch: it holds subscriber addresses.
            logger.error(
                f"Resend batch {i // batch_size + 1} failed for {len(batch)} recipients: "
                f"{type(e).__name__}: {redact_emails(str(e))}"
            )
            failed += len(batch)

    if failed:
        logger.warning(f"Resend partial failure: {failed}/{len(messages)} emails failed")
    return sent, failed
```

- [ ] **Step 8: Carry ids through `send_newsletter`**

Replace

```python
    by_lang: dict[str, list[str]] = {lang: [] for lang in SUPPORTED_LANGUAGES}
    for sub in subscribers:
        lang = sub["language"] if sub["language"] in SUPPORTED_LANGUAGES else "en"
        by_lang[lang].append(sub["email"])

    lang_counts = {lang: len(addrs) for lang, addrs in by_lang.items() if addrs}
    logger.info(f"Language split: {lang_counts}")
```

with

```python
    by_lang: dict[str, list[dict]] = {lang: [] for lang in SUPPORTED_LANGUAGES}
    for sub in subscribers:
        lang = sub["language"] if sub["language"] in SUPPORTED_LANGUAGES else "en"
        by_lang[lang].append({"id": sub.get("id"), "email": sub["email"]})

    lang_counts = {lang: len(recipients) for lang, recipients in by_lang.items() if recipients}
    logger.info(f"Language split: {lang_counts}")
    if not usable_secret(settings.signing_secret):
        logger.error(
            "SIGNING_SECRET is missing or shorter than 32 characters: sending without one-click "
            "unsubscribe headers; footers link to the token-less /unsubscribe page"
        )
```

Replace

```python
    for lang, addrs in by_lang.items():
        if not addrs:
            continue
```

with

```python
    for lang, recipients in by_lang.items():
        if not recipients:
            continue
```

Replace

```python
        try:
            html_content = _build_email_html(data, lang)

            # Build subject line with lead story preview
            lead_preview = ""
            if data["tech"]:
                first_content = get_field(data["tech"][0], "content", lang)
                if first_content:
                    first_sentence = first_content.split(".")[0]
                    if len(first_sentence) > 30:
                        first_sentence = first_sentence[:27] + "..."
                    lead_preview = f": {first_sentence}"

            if "-kw" in period_id:
                week_num = period_id.split("-kw")[1]
                subject = _s(lang, "subject_week").format(num=week_num)
            else:
                date_label = _format_date_label(period_id, lang)
                subject = _s(lang, "subject_daily").format(date=date_label)

            subject = f"\U0001f9ca {subject}{lead_preview}"

            sent, failed = _send_via_resend(
                settings.newsletter_from_email,
                subject,
                html_content,
                addrs,
            )
            lang_breakdown[lang] = {"sent": sent, "failed": failed, "attempted": len(addrs)}
```

with

```python
        try:
            html_content = _build_email_html(data, lang)
            subject = _build_subject(data, period_id, lang)
            messages = _recipient_messages(
                settings.newsletter_from_email,
                subject,
                html_content,
                recipients,
                settings.signing_secret,
            )
            sent, failed = _send_via_resend(messages)
            lang_breakdown[lang] = {"sent": sent, "failed": failed, "attempted": len(recipients)}
```

Replace `                    f"{failed}/{len(addrs)} emails failed"` with

```python
                    f"{failed}/{len(recipients)} emails failed"
```

Replace

```python
            lang_breakdown[lang] = {"sent": 0, "failed": len(addrs), "attempted": len(addrs)}
            total_failed += len(addrs)
```

with

```python
            lang_breakdown[lang] = {"sent": 0, "failed": len(recipients), "attempted": len(recipients)}
            total_failed += len(recipients)
```

Then run `grep -n "addrs" <repo-root>/ai-hub-backend/app/services/newsletter_sender.py` — expected: no output.

- [ ] **Step 9: Run the tests to verify they pass**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_newsletter_recipient_messages.py tests/test_newsletter_translation_gate.py -q`
Expected: `13 passed`.

- [ ] **Step 10: Run the unit suite and lint**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m "not integration" -q`
Expected: 0 failures.
Run: `cd <repo-root>/ai-hub-backend && venv312/bin/python -m ruff check app/ scripts/ tests/`
Expected: `All checks passed!`

- [ ] **Step 11: Commit**

```bash
git -C <repo-root> add ai-hub-backend/app/services/newsletter_sender.py ai-hub-backend/tests/test_newsletter_translation_gate.py ai-hub-backend/tests/test_newsletter_recipient_messages.py
git -C <repo-root> commit -m "feat(newsletter): per-recipient unsubscribe links and RFC 8058 headers" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Admin test-send

AD3 acceptance needs a real message: "on a test send, the `DKIM-Signature` `h=` tag covers `list-unsubscribe` and `list-unsubscribe-post`". Ruling: this plan pulls a minimal `POST /api/admin/newsletter/test-send` forward from SP4 (§6.4), because the one-click headers must be verified before the first scheduled send carries them; SP4 later extends it with editions.

**Files:**
- Modify: `ai-hub-backend/app/services/newsletter_sender.py` (import; new code at the end of the file)
- Modify: `ai-hub-backend/app/routers/admin.py` (new endpoint above `@router.get("/health")`)
- Create: `ai-hub-backend/tests/test_newsletter_test_send.py`

**Interfaces:**
- Consumes: `find_subscription_id` (Task 8); `_build_subject`, `_recipient_messages`, `_send_via_resend`, `UNSUBSCRIBE_URL_PLACEHOLDER` (Task 9); `BaseModel`, `EmailStr`, `mask_email` imports in `admin.py` (Task 4)
- Produces:
  - `TEST_SEND_SUBSCRIPTION_ID = "test-send-preview"`
  - `send_test_newsletter(db, period_id: str, test_email: str, lang: str = "en") -> dict` with keys `period_id`, `language`, `status` (`"sent"` | `"failed"` | `"no_content"`), `sent`, `failed`, and — when content exists — `one_click_headers` (bool) and `matched_subscriber` (bool)
  - `POST /api/admin/newsletter/test-send?period_id=…&language=en` with JSON body `{"test_email": "…"}` (admin key; the address stays out of URLs and access logs): `200` result · `400` unsupported language or missing Resend key · `404` no content · `422` missing or invalid `test_email` · `502` send failure

- [ ] **Step 1: Write the failing tests** — create `ai-hub-backend/tests/test_newsletter_test_send.py`:

```python
"""The admin test-send mails one real render, with one-click headers, to the test address only."""

from types import SimpleNamespace

from fastapi.testclient import TestClient

import app.services.newsletter_sender as sender
from app.database import get_db
from app.main import app
from app.routers.admin import verify_api_key
from app.services.unsubscribe_tokens import verify_token

SECRET = "s" * 40


def _patch(monkeypatch, subscription_id):
    captured = {}
    monkeypatch.setattr(sender, "get_settings", lambda: SimpleNamespace(
        resend_api_key="re_test", beehiiv_api_key="bh_key", beehiiv_publication_id="pub_1",
        newsletter_from_email="News <news@example.com>", signing_secret=SECRET,
    ))
    monkeypatch.setattr(sender, "_fetch_period_content", lambda db, period_id: {
        "period_id": period_id, "tech": [{"content_en": "x"}], "videos": [], "funding": [], "ma": [], "tips": [],
    })
    monkeypatch.setattr(
        sender, "_build_email_html", lambda data, lang: f'<a href="{sender.UNSUBSCRIBE_URL_PLACEHOLDER}">u</a>'
    )
    monkeypatch.setattr(sender, "_build_subject", lambda data, period_id, lang: "AI-News")
    monkeypatch.setattr(sender, "find_subscription_id", lambda api_key, publication_id, email: subscription_id)

    def no_lock(*args, **kwargs):
        raise AssertionError("test-send must not take the send lock")

    def fake_send(messages):
        captured["messages"] = messages
        return len(messages), 0

    monkeypatch.setattr(sender, "_acquire_send_lock", no_lock)
    monkeypatch.setattr(sender, "_send_via_resend", fake_send)
    return captured


def test_subscribed_test_address_uses_its_real_subscription_id(monkeypatch):
    captured = _patch(monkeypatch, "sub_founder")

    result = sender.send_test_newsletter(None, "2026-09-12", "founder@example.com", "en")

    message = captured["messages"][0]
    assert message["to"] == ["founder@example.com"]
    assert message["subject"] == "[TEST] AI-News"
    assert message["headers"]["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"
    token = message["headers"]["List-Unsubscribe"].split("t=", 1)[1].rstrip(">")
    assert verify_token(token, [SECRET]) == "sub_founder"
    assert result["matched_subscriber"] is True
    assert result["one_click_headers"] is True
    assert result["sent"] == 1


def test_non_subscriber_test_address_still_gets_one_click_headers(monkeypatch):
    captured = _patch(monkeypatch, None)

    result = sender.send_test_newsletter(None, "2026-09-12", "founder@example.com", "de")

    token = captured["messages"][0]["headers"]["List-Unsubscribe"].split("t=", 1)[1].rstrip(">")
    assert verify_token(token, [SECRET]) == sender.TEST_SEND_SUBSCRIPTION_ID
    assert result["matched_subscriber"] is False


def test_admin_test_send_requires_a_valid_test_email(monkeypatch):
    _patch(monkeypatch, None)
    app.dependency_overrides[verify_api_key] = lambda: True
    app.dependency_overrides[get_db] = lambda: None
    try:
        client = TestClient(app)
        url = "/api/admin/newsletter/test-send?period_id=2026-09-12"
        missing = client.post(url, json={})
        invalid = client.post(url, json={"test_email": "nope"})
        ok = client.post(url, json={"test_email": "founder@example.com"})
    finally:
        app.dependency_overrides.pop(verify_api_key, None)
        app.dependency_overrides.pop(get_db, None)

    assert missing.status_code == 422
    assert invalid.status_code == 422
    assert ok.status_code == 200
    assert ok.json()["one_click_headers"] is True
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_newsletter_test_send.py -q`
Expected: `3 failed` — `AttributeError: <module 'app.services.newsletter_sender'> has no attribute 'find_subscription_id'`.

- [ ] **Step 3: Add the service function** — in `ai-hub-backend/app/services/newsletter_sender.py` replace

```python
from app.services.i18n_utils import get_field, SUPPORTED_LANGUAGES
from app.services.privacy import redact_emails
```

with

```python
from app.services.beehiiv import find_subscription_id
from app.services.i18n_utils import get_field, SUPPORTED_LANGUAGES
from app.services.privacy import redact_emails
```

and replace the end of `send_newsletter`

```python
        "held_languages": held_languages,
        "translation_warnings": translation_warnings,
    }
```

with

```python
        "held_languages": held_languages,
        "translation_warnings": translation_warnings,
    }


# Used when the test address is not a Beehiiv subscriber: the headers are still
# present for the DKIM h= check, and a click answers "unsubscribed" (Beehiiv 404)
# without touching any real subscription.
TEST_SEND_SUBSCRIPTION_ID = "test-send-preview"


def send_test_newsletter(db: Session, period_id: str, test_email: str, lang: str = "en") -> dict:
    """Send one real newsletter render to an explicit test address.

    Same template, subject, personal footer link and List-Unsubscribe headers
    as the daily send, but no send lock and no subscriber list. When the
    address is a Beehiiv subscriber its real subscription id is used, so the
    one-click link can be tried end to end (it unsubscribes that address).
    """
    settings = get_settings()
    if not settings.resend_api_key:
        raise ValueError("RESEND_API_KEY not configured")
    if lang not in SUPPORTED_LANGUAGES:
        raise ValueError(f"Unsupported language: {lang}")

    data = _fetch_period_content(db, period_id)
    total_items = (
        len(data["tech"]) + len(data["funding"]) + len(data["tips"])
        + len(data.get("ma", [])) + len(data.get("videos", []))
    )
    if total_items == 0:
        return {"period_id": period_id, "language": lang, "status": "no_content", "sent": 0, "failed": 0}

    subscription_id = None
    if settings.beehiiv_api_key and settings.beehiiv_publication_id:
        subscription_id = find_subscription_id(
            settings.beehiiv_api_key, settings.beehiiv_publication_id, test_email
        )

    resend.api_key = settings.resend_api_key
    messages = _recipient_messages(
        settings.newsletter_from_email,
        f"[TEST] {_build_subject(data, period_id, lang)}",
        _build_email_html(data, lang),
        [{"id": subscription_id or TEST_SEND_SUBSCRIPTION_ID, "email": test_email}],
        settings.signing_secret,
    )
    sent, failed = _send_via_resend(messages)
    return {
        "period_id": period_id,
        "language": lang,
        "status": "sent" if sent else "failed",
        "sent": sent,
        "failed": failed,
        "one_click_headers": "headers" in messages[0],
        "matched_subscriber": subscription_id is not None,
    }
```

- [ ] **Step 4: Add the endpoint** — in `ai-hub-backend/app/routers/admin.py` replace the line `@router.get("/health")` with:

```python
class NewsletterTestSendBody(BaseModel):
    test_email: EmailStr


@router.post("/newsletter/test-send")
def newsletter_test_send(
    body: NewsletterTestSendBody,
    period_id: str,
    language: str = "en",
    db: Session = Depends(get_db),
    _: bool = Depends(verify_api_key),
):
    """Send the real newsletter render for one period and language to `test_email` only.

    No send lock, no subscriber list. Use it to check the template and, on the
    received message, that the DKIM-Signature h= tag covers list-unsubscribe
    and list-unsubscribe-post (spec AD3 acceptance).
    """
    from app.services.newsletter_sender import send_test_newsletter

    test_email = body.test_email  # JSON body, never the query string: access logs record URLs
    try:
        result = send_test_newsletter(db, period_id, test_email, language)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error(f"[test-send] failed for {mask_email(test_email)}: {type(exc).__name__}")
        raise HTTPException(status_code=502, detail="test_send_failed")
    if result["status"] == "no_content":
        raise HTTPException(status_code=404, detail=result)
    if result["failed"]:
        raise HTTPException(status_code=502, detail=result)
    return result


@router.get("/health")
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_newsletter_test_send.py -q`
Expected: `3 passed`.

- [ ] **Step 6: Run the unit suite and lint**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m "not integration" -q`
Expected: 0 failures.
Run: `cd <repo-root>/ai-hub-backend && venv312/bin/python -m ruff check app/ scripts/ tests/`
Expected: `All checks passed!`

- [ ] **Step 7: Commit**

```bash
git -C <repo-root> add ai-hub-backend/app/services/newsletter_sender.py ai-hub-backend/app/routers/admin.py ai-hub-backend/tests/test_newsletter_test_send.py
git -C <repo-root> commit -m "feat(newsletter): admin test-send with one-click headers for the DKIM check" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Frontend one-click route and confirm page

AD3: `List-Unsubscribe` points at `https://www.datacubeai.space/api/newsletter/unsubscribe?t=<token>`. The route handler answers the POST directly (server-side call to the backend, never a redirect), accepts form bodies, and does not use `enforceProtectedApiRequest` (mail receivers send no cookies or Origin). `GET` never unsubscribes; it sends the reader to `/unsubscribe?t=`, whose button POSTs. The page copy stops mentioning replies.

**Files:**
- Create: `ai-information-hub/lib/newsletter/unsubscribe-token.ts`
- Create: `ai-information-hub/lib/newsletter/unsubscribe-token.test.ts`
- Create: `ai-information-hub/app/api/newsletter/unsubscribe/route.ts`
- Create: `ai-information-hub/app/unsubscribe/unsubscribe-confirm.tsx`
- Modify: `ai-information-hub/app/unsubscribe/page.tsx` (whole file)

**Interfaces:**
- Consumes: backend `POST /api/newsletter/unsubscribe` JSON `{"token"}` → 200 / 400 / 502 / 503 (Task 8); token shape (Task 7); `API_BASE`, `DEFAULT_API_BASE` from `@/lib/api-base` (existing); `npm test` (Task 6)
- Produces: `isWellFormedUnsubscribeToken(value: unknown): value is string`; `extractUnsubscribeToken(url: { searchParams: URLSearchParams }, contentType: string | null, rawBody: string): string | null`; `POST /api/newsletter/unsubscribe` → `200 {"ok": true}` · `400 {"ok": false, "error": "invalid_token"}` · `413` · `502 {"ok": false, "error": "unavailable"}`; `GET /api/newsletter/unsubscribe?t=` → `303` to `/unsubscribe?t=`

- [ ] **Step 1: Write the failing test** — create `ai-information-hub/lib/newsletter/unsubscribe-token.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractUnsubscribeToken, isWellFormedUnsubscribeToken } from "./unsubscribe-token";

const TOKEN = `v1.0a1b2c3d.sub_3f6a7c1e-1b2c-4d5e-8f90-123456789abc.${"A".repeat(43)}`;
const ENDPOINT = "https://www.datacubeai.space/api/newsletter/unsubscribe";

describe("isWellFormedUnsubscribeToken", () => {
  it("accepts the backend token shape", () => {
    expect(isWellFormedUnsubscribeToken(TOKEN)).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isWellFormedUnsubscribeToken(null)).toBe(false);
    expect(isWellFormedUnsubscribeToken("")).toBe(false);
    expect(isWellFormedUnsubscribeToken(`${TOKEN}\n`)).toBe(false);
    expect(isWellFormedUnsubscribeToken(TOKEN.replace("v1.", "v2."))).toBe(false);
    expect(isWellFormedUnsubscribeToken(`v1.0a1b2c3d.reader@example.com.${"A".repeat(43)}`)).toBe(false);
  });
});

describe("extractUnsubscribeToken", () => {
  it("reads the token from the URL of an RFC 8058 one-click POST", () => {
    const url = new URL(`${ENDPOINT}?t=${TOKEN}`);
    expect(extractUnsubscribeToken(url, "application/x-www-form-urlencoded", "List-Unsubscribe=One-Click")).toBe(TOKEN);
  });

  it("reads the token from the confirm page form body", () => {
    const body = new URLSearchParams({ t: TOKEN }).toString();
    expect(extractUnsubscribeToken(new URL(ENDPOINT), "application/x-www-form-urlencoded;charset=UTF-8", body)).toBe(TOKEN);
  });

  it("returns null when no well-formed token is present", () => {
    const withBadQuery = new URL(`${ENDPOINT}?t=nope`);
    expect(extractUnsubscribeToken(withBadQuery, "application/x-www-form-urlencoded", "List-Unsubscribe=One-Click")).toBeNull();
    expect(extractUnsubscribeToken(new URL(ENDPOINT), "application/json", JSON.stringify({ t: TOKEN }))).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd <repo-root>/ai-information-hub && npm test`
Expected: FAIL — `lib/newsletter/unsubscribe-token.test.ts` cannot resolve `./unsubscribe-token` (the Task 6 suite still passes).

- [ ] **Step 3: Create `ai-information-hub/lib/newsletter/unsubscribe-token.ts`**

```ts
// Mirrors ai-hub-backend/app/services/unsubscribe_tokens.py:
// v1.<8 hex key id>.<Beehiiv subscription id>.<43-char base64url HMAC>
const TOKEN_PATTERN = /^v1\.[0-9a-f]{8}\.[A-Za-z0-9_-]{1,64}\.[A-Za-z0-9_-]{43}$/;

export function isWellFormedUnsubscribeToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

/**
 * Token of a one-click unsubscribe POST. RFC 8058 mail receivers keep it in
 * the URL (`?t=`) and send `List-Unsubscribe=One-Click` as a form body; the
 * confirm page sends it as the form field `t`.
 */
export function extractUnsubscribeToken(
  url: { searchParams: URLSearchParams },
  contentType: string | null,
  rawBody: string,
): string | null {
  const fromQuery = url.searchParams.get("t");
  if (isWellFormedUnsubscribeToken(fromQuery)) return fromQuery;
  if ((contentType ?? "").toLowerCase().startsWith("application/x-www-form-urlencoded")) {
    const fromForm = new URLSearchParams(rawBody).get("t");
    if (isWellFormedUnsubscribeToken(fromForm)) return fromForm;
  }
  return null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd <repo-root>/ai-information-hub && npm test`
Expected: `Tests  11 passed (11)`.

- [ ] **Step 5: Create `ai-information-hub/app/api/newsletter/unsubscribe/route.ts`**

```ts
import type { NextRequest } from "next/server";
import { API_BASE, DEFAULT_API_BASE } from "@/lib/api-base";
import { extractUnsubscribeToken } from "@/lib/newsletter/unsubscribe-token";

// RFC 8058 one-click unsubscribe endpoint named in the List-Unsubscribe header.
// Mail receivers POST here without cookies or Origin, so this route must not
// use enforceProtectedApiRequest, and it answers the POST itself (a redirect
// would drop the POST). The backend verifies the token and calls Beehiiv.
export const dynamic = "force-dynamic";

const MAX_BODY_CHARS = 2_000;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_CHARS) return json({ ok: false, error: "invalid_request" }, 413);

  const token = extractUnsubscribeToken(req.nextUrl, req.headers.get("content-type"), rawBody);
  if (!token) return json({ ok: false, error: "invalid_token" }, 400);

  try {
    const res = await fetch(`${API_BASE || DEFAULT_API_BASE}/newsletter/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return json({ ok: true });
    if (res.status === 400) return json({ ok: false, error: "invalid_token" }, 400);
    return json({ ok: false, error: "unavailable" }, 502);
  } catch {
    return json({ ok: false, error: "unavailable" }, 502);
  }
}

// Link checkers and some mail clients open the header URL with GET. GET never
// unsubscribes: it sends the reader to the confirm page.
export function GET(req: NextRequest) {
  const target = new URL("/unsubscribe", req.nextUrl.origin);
  const token = req.nextUrl.searchParams.get("t");
  if (token) target.searchParams.set("t", token);
  return Response.redirect(target, 303);
}
```

- [ ] **Step 6: Create `ai-information-hub/app/unsubscribe/unsubscribe-confirm.tsx`**

```tsx
'use client'

import { useState } from 'react'

type Status = 'idle' | 'pending' | 'done' | 'invalid' | 'error'

export function UnsubscribeConfirm({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>('idle')

  async function confirm() {
    setStatus('pending')
    try {
      const res = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ t: token }).toString(),
      })
      if (res.ok) setStatus('done')
      else setStatus(res.status === 400 ? 'invalid' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <p role="status" className="text-foreground">
        You are unsubscribed and will not receive further newsletter emails.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground">
        Confirm to stop receiving the newsletter at the address this email was sent to.
      </p>
      <button
        type="button"
        onClick={confirm}
        disabled={status === 'pending'}
        className="inline-block rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
      >
        {status === 'pending' ? 'Unsubscribing…' : 'Unsubscribe'}
      </button>
      {status === 'invalid' && (
        <p role="alert" className="text-sm text-red-700">
          This unsubscribe link is not valid. Use the unsubscribe link in your most recent newsletter email.
        </p>
      )}
      {status === 'error' && (
        <p role="alert" className="text-sm text-red-700">
          Something went wrong on our side. Please try again in a few minutes.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Replace `ai-information-hub/app/unsubscribe/page.tsx`** with:

```tsx
import Link from "next/link";
import type { Metadata } from "next";
import { isWellFormedUnsubscribeToken } from "@/lib/newsletter/unsubscribe-token";
import { UnsubscribeConfirm } from "./unsubscribe-confirm";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const { t } = await searchParams;
  const token = isWellFormedUnsubscribeToken(t) ? t : null;

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold">Unsubscribe</h1>
        {token ? (
          <UnsubscribeConfirm token={token} />
        ) : (
          <p className="text-muted-foreground">
            Every newsletter email has a personal unsubscribe link at the bottom. Open that link
            to unsubscribe with one click. If you cannot find it, send us a message through the{" "}
            <Link href="/contact" className="underline hover:no-underline">
              contact form
            </Link>
            .
          </p>
        )}
        <Link
          href="/"
          className="inline-block rounded-full border border-border px-6 py-2 text-sm font-medium transition-opacity hover:opacity-90"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Run the frontend checks**

Run: `cd <repo-root>/ai-information-hub && npm test`
Expected: `Tests  11 passed (11)`.
Run: `cd <repo-root>/ai-information-hub && npm run lint`
Expected: exit 0.
Run: `grep -rn -i "reply" <repo-root>/ai-information-hub/app/unsubscribe`
Expected: no output.

- [ ] **Step 9: Commit**

```bash
git -C <repo-root> add ai-information-hub/lib/newsletter/unsubscribe-token.ts ai-information-hub/lib/newsletter/unsubscribe-token.test.ts ai-information-hub/app/api/newsletter/unsubscribe/route.ts ai-information-hub/app/unsubscribe/unsubscribe-confirm.tsx ai-information-hub/app/unsubscribe/page.tsx
git -C <repo-root> commit -m "feat(newsletter): RFC 8058 one-click route and token confirm page" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Contact form end to end

Spec §6.1: the `/for-teams` and `/contact` forms → `POST /api/contact` (rate-limited, honeypot) → Resend email to `CONTACT_INBOX` with `reply_to` = the visitor's address. Ruling: the route lives in the backend, which already owns Resend and its settings; the browser posts cross-origin (CORS already allows the site and the CSP `connect-src` already allows the API host). The daily cap keeps a form flood from spending the Resend quota the newsletter needs.

**Files:**
- Create: `ai-hub-backend/app/services/rate_limit.py`
- Create: `ai-hub-backend/app/routers/contact.py`
- Modify: `ai-hub-backend/app/routers/__init__.py`, `ai-hub-backend/app/main.py`
- Create: `ai-hub-backend/tests/test_rate_limit.py`
- Create: `ai-hub-backend/tests/test_contact_router.py`
- Modify: `ai-information-hub/app/for-teams/contact-form.tsx` (whole file)
- Modify: `ai-information-hub/app/for-teams/page.tsx` (one sentence)

**Interfaces:**
- Consumes: `Settings.contact_inbox` (Task 4); `Settings.resend_api_key`, `Settings.newsletter_from_email` (existing); `API_BASE`, `DEFAULT_API_BASE` from `@/lib/api-base` (existing)
- Produces:
  - `app.services.rate_limit.SlidingWindowLimiter(limit: int, window_seconds: float, clock=time.monotonic, max_keys: int = 10_000)` with `.allow(key: str) -> bool`
  - `POST /api/contact`, JSON `{"name", "email", "company", "message", "website"}` → `202 {"status": "received"}` · `422` invalid body · `429 {"detail": "rate_limited"}` · `503 {"detail": "contact_unavailable"}` · `502 {"detail": "contact_failed"}`
  - `app.routers.contact.DAILY_CONTACT_EMAIL_CAP = 20`; `app.routers.contact_router`

- [ ] **Step 1: Write the failing tests**

Create `ai-hub-backend/tests/test_rate_limit.py`:

```python
"""The in-process limiter counts hits per key inside a sliding window."""

from app.services.rate_limit import SlidingWindowLimiter


class _Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


def test_limiter_blocks_after_the_limit_within_the_window():
    limiter = SlidingWindowLimiter(limit=2, window_seconds=60, clock=_Clock())
    assert limiter.allow("ip")
    assert limiter.allow("ip")
    assert not limiter.allow("ip")
    assert limiter.allow("other-ip")


def test_limiter_allows_again_after_the_window_passes():
    clock = _Clock()
    limiter = SlidingWindowLimiter(limit=1, window_seconds=60, clock=clock)
    assert limiter.allow("ip")
    clock.now += 61
    assert limiter.allow("ip")


def test_limiter_bounds_memory_by_clearing_when_full():
    limiter = SlidingWindowLimiter(limit=1, window_seconds=60, clock=_Clock(), max_keys=2)
    assert limiter.allow("a")
    assert limiter.allow("b")
    assert limiter.allow("c")  # table was full: cleared, then "c" recorded
    assert limiter.allow("a")  # "a" was forgotten by the clear
```

Create `ai-hub-backend/tests/test_contact_router.py`:

```python
"""POST /api/contact delivers to the inbox with reply-to, and resists bots and floods."""

from types import SimpleNamespace

import pytest
import resend
from fastapi.testclient import TestClient

import app.routers.contact as contact
from app.main import app
from app.services.rate_limit import SlidingWindowLimiter

VALID = {"name": "Ada Lovelace", "email": "ada@example.com", "company": "Analytical Engines", "message": "Hello"}


def _settings(contact_inbox="inbox@example.com"):
    return SimpleNamespace(
        resend_api_key="re_test", contact_inbox=contact_inbox, newsletter_from_email="News <news@example.com>",
    )


@pytest.fixture
def outbox(monkeypatch):
    sent = []
    monkeypatch.setattr(contact, "get_settings", _settings)
    monkeypatch.setattr(contact, "_per_ip", SlidingWindowLimiter(limit=3, window_seconds=3600))
    monkeypatch.setattr(
        contact, "_daily", SlidingWindowLimiter(limit=contact.DAILY_CONTACT_EMAIL_CAP, window_seconds=86400)
    )
    monkeypatch.setattr(resend.Emails, "send", lambda params: sent.append(params) or {"id": "email_1"})
    return sent


def test_message_goes_to_the_inbox_with_reply_to_the_visitor(outbox):
    response = TestClient(app).post("/api/contact", json=VALID)

    assert response.status_code == 202
    assert response.json() == {"status": "received"}
    assert len(outbox) == 1
    assert outbox[0]["to"] == ["inbox@example.com"]
    assert outbox[0]["reply_to"] == "ada@example.com"
    assert "Hello" in outbox[0]["text"]


def test_honeypot_submissions_are_accepted_but_never_sent(outbox):
    response = TestClient(app).post("/api/contact", json={**VALID, "website": "https://spam.example"})
    assert response.status_code == 202
    assert outbox == []


def test_invalid_email_is_rejected(outbox):
    response = TestClient(app).post("/api/contact", json={**VALID, "email": "not-an-email"})
    assert response.status_code == 422
    assert outbox == []


def test_per_ip_limit_returns_429(outbox):
    client = TestClient(app)
    statuses = [client.post("/api/contact", json=VALID).status_code for _ in range(4)]
    assert statuses == [202, 202, 202, 429]
    assert len(outbox) == 3


def test_daily_cap_protects_the_shared_resend_quota(outbox, monkeypatch):
    monkeypatch.setattr(contact, "_daily", SlidingWindowLimiter(limit=1, window_seconds=86400))
    client = TestClient(app)
    first = client.post("/api/contact", json=VALID, headers={"X-Forwarded-For": "203.0.113.1"})
    second = client.post("/api/contact", json=VALID, headers={"X-Forwarded-For": "203.0.113.2"})
    assert (first.status_code, second.status_code) == (202, 429)
    assert len(outbox) == 1


def test_missing_inbox_configuration_returns_503(outbox, monkeypatch):
    monkeypatch.setattr(contact, "get_settings", lambda: _settings(contact_inbox=""))
    response = TestClient(app).post("/api/contact", json=VALID)
    assert response.status_code == 503
    assert outbox == []


def test_line_breaks_in_the_name_cannot_break_the_subject(outbox):
    TestClient(app).post("/api/contact", json={**VALID, "name": "Ada\r\nBcc: victim@example.com"})
    assert "\n" not in outbox[0]["subject"]
    assert "\r" not in outbox[0]["subject"]
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_rate_limit.py tests/test_contact_router.py -q`
Expected: collection errors — `No module named 'app.services.rate_limit'` and `No module named 'app.routers.contact'`.

- [ ] **Step 3: Create `ai-hub-backend/app/services/rate_limit.py`**

```python
"""In-process sliding-window rate limiting for public form endpoints.

Per worker process and reset on every deploy: a deterrent against casual
abuse, not a guarantee.
"""

import threading
import time
from collections import deque
from typing import Callable


class SlidingWindowLimiter:
    def __init__(
        self,
        limit: int,
        window_seconds: float,
        clock: Callable[[], float] = time.monotonic,
        max_keys: int = 10_000,
    ):
        self.limit = limit
        self.window_seconds = window_seconds
        self._clock = clock
        self._max_keys = max_keys
        self._hits: dict[str, deque] = {}
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        """Record a hit and return True, or return False (recording nothing) when over the limit."""
        now = self._clock()
        with self._lock:
            hits = self._hits.get(key)
            if hits is None:
                if len(self._hits) >= self._max_keys:
                    self._hits.clear()
                hits = self._hits[key] = deque()
            while hits and now - hits[0] >= self.window_seconds:
                hits.popleft()
            if len(hits) >= self.limit:
                return False
            hits.append(now)
            return True
```

- [ ] **Step 4: Run the limiter tests to verify they pass**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_rate_limit.py -q`
Expected: `3 passed`.

- [ ] **Step 5: Create `ai-hub-backend/app/routers/contact.py`**

```python
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
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if forwarded:
        return forwarded
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
```

- [ ] **Step 6: Register the router**

`ai-hub-backend/app/routers/__init__.py` — replace

```python
from app.routers.newsletter import router as newsletter_router
```

with

```python
from app.routers.newsletter import router as newsletter_router
from app.routers.contact import router as contact_router
```

and replace

```python
    "newsletter_router",
]
```

with

```python
    "newsletter_router",
    "contact_router",
]
```

`ai-hub-backend/app/main.py` — replace

```python
    newsletter_router,
)
```

with

```python
    newsletter_router,
    contact_router,
)
```

and replace

```python
app.include_router(newsletter_router, prefix="/api")
```

with

```python
app.include_router(newsletter_router, prefix="/api")
app.include_router(contact_router, prefix="/api")
```

- [ ] **Step 7: Run the backend tests to verify they pass**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_rate_limit.py tests/test_contact_router.py -q`
Expected: `10 passed`.

- [ ] **Step 8: Replace `ai-information-hub/app/for-teams/contact-form.tsx`** with:

```tsx
'use client'

import { useState } from 'react'
import { API_BASE, DEFAULT_API_BASE } from '@/lib/api-base'

type Status = 'idle' | 'sending' | 'sent' | 'rate_limited' | 'error'

const fieldClass =
  'w-full border border-gray-300 rounded px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary focus:outline-none'

// Delivery: POST {API_BASE}/contact → Resend → CONTACT_INBOX, with reply-to set
// to the visitor. The "sent" state appears only after the backend accepted the
// message (HTTP 202).
export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // honeypot: hidden from people, filled by bots

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch(`${API_BASE || DEFAULT_API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, message, website }),
      })
      if (res.status === 202) setStatus('sent')
      else setStatus(res.status === 429 ? 'rate_limited' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div role="status" className="border border-green-200 bg-green-50 rounded-lg p-6 text-center">
        <p className="text-green-800 font-semibold text-lg mb-2">Message sent.</p>
        <p className="text-green-700 text-sm">
          Thank you. Any reply will go to the email address you entered.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div>
        <label htmlFor="contact-name" className="block text-sm font-medium mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldClass}
          placeholder="Your full name"
          autoComplete="name"
        />
      </div>

      <div>
        <label htmlFor="contact-email" className="block text-sm font-medium mb-1">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
          placeholder="you@company.com"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
        />
      </div>

      <div>
        <label htmlFor="contact-company" className="block text-sm font-medium mb-1">
          Company <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <input
          id="contact-company"
          name="organization"
          type="text"
          maxLength={160}
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className={fieldClass}
          placeholder="Company name"
          autoComplete="organization"
        />
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium mb-1">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={4}
          maxLength={5000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${fieldClass} resize-y`}
          placeholder="Corrections: include the page URL. Teams: size, use case and requirements."
        />
      </div>

      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor="contact-website">Leave this field empty</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none transition-colors disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : 'Send Message'}
      </button>

      {status === 'rate_limited' && (
        <p role="alert" className="text-sm text-red-700">
          Too many messages right now. Please try again later.
        </p>
      )}
      {status === 'error' && (
        <p role="alert" className="text-sm text-red-700">
          The message could not be sent. Please try again later.
        </p>
      )}
    </form>
  )
}
```

- [ ] **Step 9: Update the `/for-teams` intro sentence** — in `ai-information-hub/app/for-teams/page.tsx` replace the sentence

```text
Tell us about your team and requirements — the form opens a prefilled email to us. We will get back to you as soon as possible.
```

with

```text
Tell us about your team and requirements. The form sends your message straight to our inbox; any reply goes to the email address you enter.
```

(keep the surrounding JSX and indentation unchanged).

- [ ] **Step 10: Run all checks for this task**

Run: `grep -rn -E "mailto:|enterprise@datacubeai\.space" <repo-root>/ai-information-hub/app/for-teams <repo-root>/ai-information-hub/app/contact`
Expected: no output.
Run: `cd <repo-root>/ai-information-hub && npm run lint`
Expected: exit 0.
Run: `cd <repo-root>/ai-information-hub && npm test`
Expected: `Tests  11 passed (11)`.
Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m "not integration" -q`
Expected: 0 failures.
Run: `cd <repo-root>/ai-hub-backend && venv312/bin/python -m ruff check app/ scripts/ tests/`
Expected: `All checks passed!`

- [ ] **Step 11: Commit**

```bash
git -C <repo-root> add ai-hub-backend/app/services/rate_limit.py ai-hub-backend/app/routers/contact.py ai-hub-backend/app/routers/__init__.py ai-hub-backend/app/main.py ai-hub-backend/tests/test_rate_limit.py ai-hub-backend/tests/test_contact_router.py ai-information-hub/app/for-teams/contact-form.tsx ai-information-hub/app/for-teams/page.tsx
git -C <repo-root> commit -m "feat(contact): contact form delivers via POST /api/contact with honeypot and caps" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Docs and env template

Root `CLAUDE.md` requires every documentation file that references a changed feature to be updated. Tracked files are committed; the four local-only files (not tracked by git) are edited but never staged.

**Files:**
- Modify (tracked): `ai-hub-backend/.env.example`, `ai-hub-backend/README.md`, `README.md`, `ai-information-hub/README.md`
- Modify (local-only, not committed): `CLAUDE.md`, `ai-information-hub/CLAUDE.md`, `.ai-collab/context/project-overview.md`, `.ai-collab/context/codebase-map.md`

**Interfaces:**
- Consumes: the endpoint, setting and file names produced by Tasks 1–12, exactly as listed in their Interfaces blocks

- [ ] **Step 1: `ai-hub-backend/.env.example`** — replace

```text
NEWSLETTER_FROM_EMAIL=Data Cube AI <newsletter@datacubeai.space>
```

with

```text
NEWSLETTER_FROM_EMAIL=Data Cube AI <newsletter@datacubeai.space>

# One-click unsubscribe tokens (at least 32 random characters):
#   python -c "import secrets; print(secrets.token_urlsafe(48))"
SIGNING_SECRET=
# Previous secret, only while rotating (links signed with it keep working)
SIGNING_SECRET_PREVIOUS=

# Contact form destination (POST /api/contact)
CONTACT_INBOX=
```

- [ ] **Step 2: `ai-hub-backend/README.md`**

Replace `- **Stripe Premium Subscriptions** (checkout, webhooks, subscription management)` with

```text
- **One-click unsubscribe** (RFC 8058 `List-Unsubscribe` headers with signed per-subscriber tokens) and a rate-limited **contact form** endpoint
```

Replace `# Key dependencies include: stripe>=8.0.0, slowapi>=0.1.9` with `# Key dependencies include: resend, requests, slowapi>=0.1.9`.

In the Tests section replace

```text
Tests must never reach the production database: `tests/conftest.py` refuses
any non-local `DATABASE_URL`, and integration tests delete rows. Always set a
local URL in the same command.
```

with

```text
Tests must never reach the production database: `tests/conftest.py` refuses
any non-local `DATABASE_URL`, and integration tests delete rows. Always set a
local URL in the same command. Scripts under `scripts/` refuse too
(`app/db_guard.py`) when `DATABASE_URL` is not exported and `.env` points at a
remote database; Railway and CI export it, so they are unaffected.
```

Replace the migration row

```text
| `0009_add_subscriptions` | `subscriptions` table (email, stripe IDs, tier, status, period dates) |
```

with

```text
| `0009_add_subscriptions` | `subscriptions` table (email, stripe IDs, tier, status, period dates); unused since R1 removed the legacy Stripe endpoints — membership (SP3a) reuses it |
```

In the API table replace

```text
| `/api/admin/newsletter` | POST | Send newsletter (per-subscriber language); languages whose translations are stale or mostly not ready are held (status `held`, HTTP 502) |
```

with

```text
| `/api/admin/newsletter` | POST | Send newsletter (per-subscriber language); languages whose translations are stale or mostly not ready are held (status `held`, HTTP 502) |
| `/api/admin/newsletter/diagnose` | POST | Pipeline check: env flags (booleans), Beehiiv subscriber counts (no addresses), content counts, test email to the required `test_email` |
| `/api/admin/newsletter/test-send` | POST | Real newsletter render for `period_id` + `language` to `test_email` only, with one-click unsubscribe headers (use it for the DKIM `h=` check) |
```

and replace

```text
| `/api/stripe/webhook` | POST | Stripe webhook handler (Stripe signature) |
| `/api/stripe/create-checkout` | POST | Create Stripe checkout session |
| `/api/stripe/subscription/{email}` | GET | Subscription status by email |
| `/api/stripe/cancel` | POST | Cancel subscription |
```

with

```text
| `/api/newsletter/unsubscribe` | POST | One-click unsubscribe: JSON `{"token": ...}` signed per subscriber, called by the site's `/api/newsletter/unsubscribe` route; `GET` is not allowed |
| `/api/contact` | POST | Contact form → email to `CONTACT_INBOX` with reply-to the visitor; honeypot, 3/hour per IP, 20/day in total |
```

In the Railway variables block replace

```text
railway variables set STRIPE_SECRET_KEY=sk_xxxxx
railway variables set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
railway variables set STRIPE_PREMIUM_PRICE_ID=price_xxxxx
railway variables set STRIPE_API_DEVELOPER_PRICE_ID=price_xxxxx
railway variables set STRIPE_API_BUSINESS_PRICE_ID=price_xxxxx
```

with

```text
railway variables set SIGNING_SECRET=xxxxx       # ≥ 32 random chars: python -c "import secrets; print(secrets.token_urlsafe(48))"
railway variables set CONTACT_INBOX=you@example.com   # contact form destination
```

In the project tree replace `│   │   ├── stripe_webhook.py  # Stripe payments (webhook, checkout, subscriptions)` with

```text
│   │   ├── newsletter.py    # One-click unsubscribe (POST /api/newsletter/unsubscribe)
│   │   ├── contact.py       # Contact form (POST /api/contact)
```

replace `│   ├── database.py          # DB connection` with

```text
│   ├── database.py          # DB connection
│   ├── db_guard.py          # Refuses tests/scripts on a remote DB inherited from .env
```

and replace `│       ├── hn_fetcher.py    # Hacker News` with

```text
│       ├── hn_fetcher.py    # Hacker News
│       ├── beehiiv.py       # Beehiiv subscription client (unsubscribe by id, lookup by email)
│       ├── unsubscribe_tokens.py  # Signed one-click unsubscribe tokens
│       ├── privacy.py       # mask_email / redact_emails for log lines
│       ├── rate_limit.py    # In-process sliding-window limiter
```

- [ ] **Step 3: `README.md` (repository root)**

Replace `| 💸 | **Monetization** | Premium and team landing pages, Stripe checkout proxy, backend developer API/job board endpoints |` with

```text
| 💸 | **Monetization** | Team landing page with a working contact form, backend developer API and job board endpoints |
```

Replace

```text
| `/api/admin/newsletter/diagnose` | POST | Diagnostic: test Beehiiv, Resend, content |
```

with

```text
| `/api/admin/newsletter/diagnose` | POST | Diagnostic: env flags, subscriber counts (no addresses), content counts, test email to the required `test_email` |
| `/api/admin/newsletter/test-send` | POST | Real newsletter render with one-click unsubscribe headers, sent to `test_email` only |
```

Replace

```text
| `/api/stripe/create-checkout` | POST | Create Stripe checkout session |
```

with

```text
| `/api/newsletter/unsubscribe` | POST | One-click unsubscribe with a signed per-subscriber token |
| `/api/contact` | POST | Contact form → email to `CONTACT_INBOX` |
```

In the backend env block replace

```text
STRIPE_SECRET_KEY=               # Stripe payments
STRIPE_WEBHOOK_SECRET=           # Stripe webhook verification
STRIPE_PREMIUM_PRICE_ID=         # Stripe Premium subscription price
STRIPE_API_DEVELOPER_PRICE_ID=   # Stripe Developer API tier price
STRIPE_API_BUSINESS_PRICE_ID=    # Stripe Business API tier price
```

with

```text
SIGNING_SECRET=                  # One-click unsubscribe tokens (≥ 32 random characters)
CONTACT_INBOX=                   # Contact form destination address
```

In the project tree replace `│   │   ├── unsubscribe/        # Newsletter unsubscribe` with `│   │   ├── unsubscribe/        # One-click unsubscribe confirm page`, replace `│   │   └── api/checkout/       # Stripe checkout` with `│   │   └── api/newsletter/unsubscribe/  # RFC 8058 one-click unsubscribe`, and replace `│   │   │   └── stripe_webhook.py  # Stripe payments` with

```text
│   │   │   ├── newsletter.py   # One-click unsubscribe
│   │   │   └── contact.py      # Contact form
```

- [ ] **Step 4: `ai-information-hub/README.md`**

Replace `- Unsubscribe page (/unsubscribe) with instructions` with

```text
- One-click unsubscribe: RFC 8058 route `/api/newsletter/unsubscribe` and token confirm page `/unsubscribe`
- Unit tests: Vitest for pure modules (`npm test`, `lib/**/*.test.ts`)
```

Replace

```text
- Monetization surfaces: `/for-teams`, `/premium`, Stripe checkout proxy, and backend developer API/job-board endpoints
```

with

```text
- Monetization surfaces: `/for-teams` (contact form → backend `POST /api/contact`), `/premium` (coming soon), and backend developer API/job-board endpoints
```

- [ ] **Step 5: Local-only docs (edit, never stage)**

Root `CLAUDE.md`:
- Status paragraph: `premium/team pages, Stripe checkout proxy, and backend developer API/job-board endpoints` → `premium/team pages, a delivering contact form, RFC 8058 one-click newsletter unsubscribe, and backend developer API/job-board endpoints`.
- Architecture box: `│    • /unsubscribe — Newsletter unsubscribe              │` → `│    • /unsubscribe — One-click unsubscribe confirm page  │`.
- Directory tree: `│   │   │   └── checkout/       # Stripe checkout proxy` → `│   │   │   └── newsletter/unsubscribe/  # RFC 8058 one-click unsubscribe`; `│   │   └── stripe_webhook.py  # Stripe payments` → the two lines `│   │   ├── newsletter.py     # One-click unsubscribe` and `│   │   └── contact.py        # Contact form`.
- Backend env block: delete the five `STRIPE_*` lines; add `SIGNING_SECRET=...               # One-click unsubscribe tokens (≥ 32 chars)` and `CONTACT_INBOX=...                # Contact form destination`.
- API table: delete the four `/api/stripe/*` rows; change the diagnose row description to `Diagnostic: env flags, subscriber counts (no addresses), content counts, test email to the required test_email`; add rows `POST /api/admin/newsletter/test-send` (`Newsletter test send with one-click unsubscribe headers`), `POST /api/newsletter/unsubscribe` (`One-click unsubscribe (signed token)`) and `POST /api/contact` (`Contact form → CONTACT_INBOX`).
- Newsletter System: replace the `**Unsubscribe**` bullet with

  ```text
  - **Unsubscribe**: RFC 8058 one-click — per-recipient `List-Unsubscribe` / `List-Unsubscribe-Post` headers and footer link carry a signed token (`SIGNING_SECRET`); site route `/api/newsletter/unsubscribe` → backend → Beehiiv; `/unsubscribe?t=` confirm page
  ```

  and append `; forced double opt-in (Beehiiv confirmation email)` to the `**Two-step subscribe flow**` bullet.

`ai-information-hub/CLAUDE.md`:
- Status paragraph: `premium/team pages, Stripe checkout proxy,` → `premium/team pages, contact form,`.
- Quick reference: row `app/unsubscribe/page.tsx` → description `One-click unsubscribe confirm page (reads ?t=)`; row `app/api/checkout/route.ts` → path `app/api/newsletter/unsubscribe/route.ts`, description `RFC 8058 one-click unsubscribe (POST forwards to the backend; GET → confirm page)`.
- Architecture box: `│    • /api/checkout — Stripe checkout proxy               │` → `│    • /api/newsletter/unsubscribe — one-click unsubscribe │`.
- Directory tree: `│   │   └── checkout/         # Stripe checkout proxy` → `│   │   └── newsletter/unsubscribe/  # RFC 8058 one-click unsubscribe`; `│   │   └── stripe_webhook.py # Stripe payments` → `│   │   ├── newsletter.py     # One-click unsubscribe` and `│   │   └── contact.py        # Contact form`.
- Commands: add `npm test                 # Vitest unit tests (lib/**/*.test.ts)` below `npm run build            # Production build`.

`.ai-collab/context/project-overview.md`:
- `` - `app/api/checkout/` - Stripe checkout proxy `` → `` - `app/api/newsletter/unsubscribe/` - RFC 8058 one-click unsubscribe ``.
- `` - `app/unsubscribe/` - Newsletter unsubscribe instructions page `` → `` - `app/unsubscribe/` - One-click unsubscribe confirm page ``.
- `` - `app/routers/stripe_webhook.py` - Stripe webhook + checkout + subscriptions `` → the two lines `` - `app/routers/newsletter.py` - One-click unsubscribe (POST /api/newsletter/unsubscribe) `` and `` - `app/routers/contact.py` - Contact form (POST /api/contact) ``.
- API table: delete the four `/api/stripe/*` rows; add `POST /api/newsletter/unsubscribe` (`One-click unsubscribe (signed token)`), `POST /api/contact` (`Contact form → CONTACT_INBOX`) and `POST /api/admin/newsletter/test-send` (`Newsletter test send with one-click headers`).

`.ai-collab/context/codebase-map.md`: replace every `checkout/` → `route.ts` tree entry with `newsletter/unsubscribe/` → `route.ts` (comment `RFC 8058 one-click unsubscribe`); replace every `stripe_webhook.py` entry with `newsletter.py` (`One-click unsubscribe`) and `contact.py` (`Contact form`); in the "most important files" table replace the two Stripe rows with rows for `app/api/newsletter/unsubscribe/route.ts` and `app/routers/newsletter.py`.

- [ ] **Step 6: Verify no stale references remain**

Run: `git -C <repo-root> grep -n -E "stripe_webhook|api/checkout|/api/stripe/|create-checkout|Stripe checkout" -- ':!docs/superpowers'`
Expected: no output. If a match remains in a file this task does not list, report it instead of editing that file.
Run: `grep -n -E "stripe_webhook|api/checkout|/api/stripe/|create-checkout" <repo-root>/CLAUDE.md <repo-root>/ai-information-hub/CLAUDE.md <repo-root>/.ai-collab/context/project-overview.md <repo-root>/.ai-collab/context/codebase-map.md`
Expected: no output.

- [ ] **Step 7: Commit the tracked docs only**

```bash
git -C <repo-root> add ai-hub-backend/.env.example ai-hub-backend/README.md README.md ai-information-hub/README.md
git -C <repo-root> commit -m "docs: one-click unsubscribe, contact form, scripts guard; drop legacy Stripe" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Finish (controller)

- [ ] **Step 1: Full verification on the final tree**

```bash
cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m "not integration" -q
cd <repo-root>/ai-hub-backend && DATABASE_URL=postgresql://postgres:test@localhost:5433/aihub_test OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m integration -q
cd <repo-root>/ai-hub-backend && venv312/bin/python -m ruff check app/ scripts/ tests/
cd <repo-root>/ai-information-hub && npm test && npm run lint
```

Expected: all green; the unit count grew by the new tests and the integration count matches the baseline.

- [ ] **Step 2: Tree and public-repo hygiene**

Run: `git -C <repo-root> status --short` — expected: only the two untracked files from the setup step.
Run: `git -C <repo-root> diff origin/main...HEAD | grep -c "/Users/"` — expected: `0`. The controller also runs the employer-name scan over the same diff (expected: 0 hits).

- [ ] **Step 3: Final whole-branch review** (superpowers:subagent-driven-development final reviewer), then restore the parked `.env`:

```bash
mv <repo-root>/ai-hub-backend/.env.r1-backup <repo-root>/ai-hub-backend/.env
```

- [ ] **Step 4: Push and open the PR** (pre-approved), wait for green CI, then stop for the founder's merge and deploy decision.

## Release runbook (founder-gated)

Preconditions: CI green on the PR; no translation backfill thread running (read-only dry run unchanged for 40 minutes); no Daily Collection or Daily Newsletter run in progress at the moment of `railway up`.

1. **Railway variables (founder approval).** First confirm `railway variables --help` lists `--skip-deploys`; if it does not, set the variables in the Railway dashboard without redeploying (a redeploy of the old code would kill a running backfill and is not needed — step 3 deploys).
   - `SIGNING_SECRET`, generated and set without printing it: `cd <repo-root>/ai-hub-backend && railway variables --service api --skip-deploys --set "SIGNING_SECRET=$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"`
   - `CONTACT_INBOX`: the address the founder chooses, set the same way.
2. **Merge (founder approval), then step 3 at once.** Right before merging, check that no Daily Collection or Daily Newsletter run is in progress (`gh run list --workflow daily-collect.yml --limit 3` and `gh run list --workflow daily-newsletter.yml --limit 3`). Squash-merge the PR with an explicit subject and body; this deploys the Vercel production site. Until step 3 finishes, the site's one-click route answers 502 and its contact form shows an error, so start step 3 immediately.
3. **Backend deploy (founder approval), right after the merge:** from `main` at the squash commit, `cd <repo-root>/ai-hub-backend && railway up -d -s api`. Poll `https://api-production-3ee5.up.railway.app/openapi.json` until it lists `/api/newsletter/unsubscribe`, `/api/contact` and `/api/admin/newsletter/test-send` and no `/api/stripe/` path. Run no step 4 check before that.
4. **Verify, recording each result in the ledger:**
   1. `POST /api/admin/newsletter/diagnose` with JSON body `{"test_email": "<founder inbox>"}` (pre-approved test email): `env_check.variables.SIGNING_SECRET` and `CONTACT_INBOX` are `true` (`SIGNING_SECRET` reads `true` only for a usable secret of at least 32 characters); `beehiiv_subscribers` holds counts only.
   2. `POST /api/admin/newsletter/test-send?period_id=<latest daily period>&language=en` with JSON body `{"test_email": "<founder inbox>"}` (pre-approved): `one_click_headers` is `true`. The founder opens the message source: `List-Unsubscribe` and `List-Unsubscribe-Post` are present and the `DKIM-Signature` `h=` tag lists `list-unsubscribe` and `list-unsubscribe-post` (AD3 acceptance). If `h=` does not cover them, stop and decide before the next scheduled send. A test send to an address that is not a Beehiiv subscriber (`matched_subscriber` is `false`) signs a placeholder subscription id, so its one-click link unsubscribes nobody and proves nothing; step 4.9 is the one-click check.
   3. `curl -sS -o /dev/null -w "%{http_code}\n" -X POST -H "Content-Type: application/x-www-form-urlencoded" --data "List-Unsubscribe=One-Click" "https://www.datacubeai.space/api/newsletter/unsubscribe?t=invalid"` → `400`.
   4. `curl -sS -o /dev/null -w "%{http_code} %{redirect_url}\n" "https://www.datacubeai.space/api/newsletter/unsubscribe?t=abc"` → `303 https://www.datacubeai.space/unsubscribe?t=abc`.
   5. `curl -sS -o /dev/null -w "%{http_code}\n" -X POST https://api-production-3ee5.up.railway.app/api/stripe/cancel` → `404`.
   6. The founder sends one message through `/contact`; it arrives at `CONTACT_INBOX` with reply-to set to the entered address.
   7. The founder subscribes a founder-owned test address on the site (not an address they read the newsletter with); a Beehiiv confirmation email arrives (double opt-in), and the founder confirms it.
   8. Next morning's scheduled newsletter: workflow green, status `sent`, `held_languages` empty; a Resend dashboard sample shows both headers.
   9. **Required, after 4.7 (it need not wait for 4.8): one-click end to end against Beehiiv.** Run the step 4.2 test send to the confirmed test address from 4.7 and check that `matched_subscriber` is `true`. Trigger one-click from that message: the mail client's unsubscribe button, or `curl -sS -o /dev/null -w "%{http_code}\n" -X POST -H "Content-Type: application/x-www-form-urlencoded" --data "List-Unsubscribe=One-Click" "<List-Unsubscribe URL from the message source>"` → `200`. Beehiiv then shows that subscription as unsubscribed, with its Language field unchanged. If it is still active, stop and decide before the next scheduled send.
5. **Rollback:** Vercel instant rollback to the previous production deployment; `railway up` from the previous `main` commit. One-click links already delivered fail until the new backend is back, so prefer rolling forward with a fix.
6. **After release:** unsubscribe requests that arrive through the contact form (readers whose older email links to the token-less `/unsubscribe` page) are handled by hand in Beehiiv.

## Deferred and recorded rulings

- Ruling: the optional AD5 weekly golden-set check moves to SP4 (R3) — prompt-contract tests pin the rules now — cost if wrong: hedge drift in model output is noticed later.
- Ruling: the CI single-Alembic-head check lands with the first plan that adds a migration (SP4 or SP3a); R1 adds none — cost if wrong: none until then.
- Ruling: `alembic/env.py` gets no guard in R1 (§6.1 scopes the guard to scripts; Railway runs Alembic with an exported URL) — cost if wrong: a local `alembic upgrade head` with the production `.env` still migrates production.
- Ruling: `scripts/upload_data.py` (HTTP POSTs to the production API by default, no database session) stays out of scope; SP2's settings pass revisits it.
- Ruling: `/premium`, `components/subscription-badge.tsx` and the `subscriptions` table stay for SP3a.
- Ruling: `/unsubscribe` stays English-only as today; localization belongs to SP4 (Newsletter 2.0).
- Ruling: without `SIGNING_SECRET` the token-less page points readers to the contact form; release steps 1 and 4.1 keep that state out of production — cost if wrong: readers of a degraded send need the contact form to unsubscribe.
- Ruling: the contact route keys its per-IP limit on the first `X-Forwarded-For` hop (spoofable); the 20/day global cap is the real protection for the Resend quota. **Superseded during execution:** the code keys on the last `X-Forwarded-For` hop, which Railway's ingress appends (as `routers/deals.py` does), because a first-hop key let one caller spoof past the per-IP limit and use up the 20/day cap for everyone; the Task 12 code block above still shows the first-hop version.
- Ruling: one PR for all thirteen tasks; merging is founder-gated anyway.
- Ruling (AD3 plan review, 2026-09-14): verification needs a usable `SIGNING_SECRET`; `SIGNING_SECRET_PREVIOUS` alone never verifies (spec AD3: "fail closed without SIGNING_SECRET") — cost if wrong: during a botched rotation, delivered links fail until the current secret is restored.
- Ruling (AD3 plan review): `diagnose` and `test-send` take `test_email` in a JSON body, because uvicorn access logs record query strings — cost if wrong: none.
- Ruling (AD3 plan review): Task 9 Step 2 runs its two test files separately, because a collection error in one file stops pytest before any test runs.
