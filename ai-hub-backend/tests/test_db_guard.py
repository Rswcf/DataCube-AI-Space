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
