"""Diagnose reports counts only and mails nobody but the explicit test address."""

from types import SimpleNamespace

import pytest
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


def _post(monkeypatch, url, body=None, signing_secret=""):
    sent = []
    monkeypatch.setattr(admin, "get_settings", lambda: SimpleNamespace(
        resend_api_key="re_test", beehiiv_api_key="bh_test", beehiiv_publication_id="pub_test",
        newsletter_from_email="News <news@example.com>", signing_secret=signing_secret, contact_inbox="",
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


@pytest.mark.parametrize(("secret", "usable"), [("s" * 31, False), ("s" * 32, True)])
def test_diagnose_reports_whether_the_signing_secret_is_usable(monkeypatch, secret, usable):
    response, _ = _post(
        monkeypatch,
        "/api/admin/newsletter/diagnose?period_id=2026-09-12",
        body={"test_email": "founder@example.com"},
        signing_secret=secret,
    )

    assert response.status_code == 200
    assert response.json()["env_check"]["variables"]["SIGNING_SECRET"] is usable
