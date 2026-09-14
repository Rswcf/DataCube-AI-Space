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
