"""Spec AD7: endpoints serving AI-written content disclose it in a header.

The wiring is asserted by introspecting the app rather than by calling the
endpoints, because every content endpoint needs a seeded period to answer 200
and a 404 raised as an exception carries no dependency-set headers. One
integration test below does exercise a real response.
"""

import pytest
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

from app.main import app
from app.services.ai_disclosure import (
    AI_DISCLOSURE_HEADER,
    add_ai_disclosure,
    ai_disclosure_value,
)
from app.services.newsletter_sender import EMAIL_STRINGS

AI_CONTENT_PREFIXES = (
    "/api/tech",
    "/api/investment",
    "/api/tips",
    "/api/trends",
    "/api/videos",
    "/api/deals",
)

# These serve period indexes, market data, job listings or operations — no AI text.
NON_AI_CONTENT_PREFIXES = (
    "/api/weeks",
    "/api/stock",
    "/api/jobs",
    "/api/developer",
    "/api/admin",
    "/api/newsletter",
    "/api/contact",
)


def _routes_under(prefix: str):
    return [r for r in app.routes if getattr(r, "path", "").startswith(prefix)]


def _discloses(route) -> bool:
    return any(d.call is add_ai_disclosure for d in route.dependant.dependencies)


@pytest.mark.parametrize("prefix", AI_CONTENT_PREFIXES)
def test_ai_content_routes_carry_the_disclosure(prefix):
    routes = _routes_under(prefix)
    assert routes, f"no routes registered under {prefix}"
    assert [r.path for r in routes if not _discloses(r)] == []


@pytest.mark.parametrize("prefix", NON_AI_CONTENT_PREFIXES)
def test_other_routes_do_not(prefix):
    assert [r.path for r in _routes_under(prefix) if _discloses(r)] == []


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


@pytest.mark.integration
def test_a_real_content_response_carries_the_header():
    """Needs a database: the handler answers 404 for an unknown period, and a
    404 is raised as an exception, so this asserts on a period that exists."""
    from datetime import date

    from app.database import get_session_local
    from app.models import Week

    week_id = "2026-08-02"
    session = get_session_local()()
    try:
        if not session.query(Week).filter(Week.id == week_id).first():
            session.add(
                Week(
                    id=week_id, label="Aug 2", year=2026, week_num=None,
                    date_range="02.08.", is_current=False, period_type="day",
                    sort_date=date(2026, 8, 2),
                )
            )
            session.commit()
    finally:
        session.close()

    with TestClient(app) as client:
        response = client.get(f"/api/trends/{week_id}")

    assert response.status_code == 200
    assert response.headers[AI_DISCLOSURE_HEADER] == ai_disclosure_value()
