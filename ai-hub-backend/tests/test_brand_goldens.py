"""Characterization goldens for brand-bearing backend output (spec AD1: the brand refactor changes no output)."""

import pytest
from fastapi.testclient import TestClient

import app.services.newsletter_sender as sender
from app.main import app
from app.routers.deals import DISCLOSURE
from golden import assert_golden
from newsletter_fixtures import LANGS, period_data


@pytest.mark.parametrize("lang", LANGS)
def test_email_html(lang):
    assert_golden(f"email_{lang}.html", sender._build_email_html(period_data(), lang))


def test_api_identity():
    root = TestClient(app).get("/").json()
    assert_golden("api_identity.txt", f"title={app.title}\nroot_name={root['name']}\n")


def test_deals_disclosure():
    assert_golden("deals_disclosure.txt", DISCLOSURE + "\n")
