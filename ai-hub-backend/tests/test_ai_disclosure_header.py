"""Spec AD7: endpoints serving AI-written content disclose it in a header.

These tests assert behaviour — an actual response carries (or does not carry)
the header — rather than introspecting `app.routes`. An earlier version walked
the route table and passed locally while failing in CI: `requirements.txt` pins
only `fastapi>=0.109.0`, CI resolved fastapi 0.141 / starlette 1.6, and there
`include_router` appends one opaque `_IncludedRouter` per call instead of
flattening endpoints into `app.routes`. Requests route correctly on both, so
testing the response is both version-proof and closer to what we promise.

The database is stubbed: the endpoints only need to get far enough to answer
200, and a 404 raised as an exception would carry no dependency-set header.
"""

from types import SimpleNamespace

import pytest
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.services.ai_disclosure import (
    AI_DISCLOSURE_HEADER,
    add_ai_disclosure,
    ai_disclosure_value,
)
from app.services.newsletter_sender import EMAIL_STRINGS

AI_CONTENT_PATHS = ("/api/tech", "/api/investment", "/api/tips", "/api/trends", "/api/videos", "/api/deals")


class _StubQuery:
    """Enough of a SQLAlchemy query for a handler to reach its return."""

    def __init__(self, first=None):
        self._first = first

    def filter(self, *_args, **_kwargs):
        return self

    def order_by(self, *_args, **_kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    def offset(self, *_args, **_kwargs):
        return self

    def all(self):
        return []

    def count(self):
        return 0

    def first(self):
        return self._first


class _StubSession:
    """`Week` lookups find a period; everything else is empty."""

    def query(self, model, *_others):
        # `editorial` is the only column the trends handler reads off the period.
        is_week = getattr(model, "__name__", "") == "Week"
        found = SimpleNamespace(id="stub", editorial=None) if is_week else None
        return _StubQuery(first=found)


@pytest.fixture
def client():
    app.dependency_overrides[get_db] = lambda: _StubSession()
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_every_ai_content_path_is_registered():
    """Guard the premise: assertions about routes are vacuous without routes."""
    paths = list(app.openapi()["paths"])
    for prefix in AI_CONTENT_PATHS:
        assert any(p.startswith(prefix) for p in paths), f"{prefix} is not registered; got {paths[:20]}"


def test_an_ai_content_response_carries_the_disclosure(client):
    response = client.get("/api/trends/2026-09-17")

    assert response.status_code == 200
    assert response.headers[AI_DISCLOSURE_HEADER] == ai_disclosure_value()


def test_a_non_ai_response_does_not(client):
    # /api/weeks lists periods; it serves no AI-written text.
    response = client.get("/api/weeks")

    assert response.status_code == 200
    assert AI_DISCLOSURE_HEADER not in response.headers


def test_value_reuses_the_english_label_and_links_the_disclosure_page():
    value = ai_disclosure_value()
    assert value.startswith(EMAIL_STRINGS["en"]["ai_label"])
    assert value.endswith("/ai-disclosure")


def test_value_stays_latin_1():
    # Header values are latin-1 on the wire: a non-ASCII edit to the label
    # would turn every content response into a 500, so fail here instead.
    ai_disclosure_value().encode("latin-1")


def test_cors_exposes_the_header_to_browsers():
    # Without expose_headers the site's own JS cannot read it cross-origin.
    cors = [m for m in app.user_middleware if m.cls is CORSMiddleware]
    assert cors, "CORS middleware is not installed"
    assert AI_DISCLOSURE_HEADER in cors[0].kwargs.get("expose_headers", [])


def test_the_dependency_sets_exactly_that_header():
    class _Response:
        headers: dict[str, str] = {}

    response = _Response()
    response.headers = {}
    add_ai_disclosure(response)

    assert response.headers == {AI_DISCLOSURE_HEADER: ai_disclosure_value()}
