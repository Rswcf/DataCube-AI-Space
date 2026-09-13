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
