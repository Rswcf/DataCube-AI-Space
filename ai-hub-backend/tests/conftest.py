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
