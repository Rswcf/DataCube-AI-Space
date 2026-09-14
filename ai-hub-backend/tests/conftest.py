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
