"""POST /api/contact delivers to the inbox with reply-to, and resists bots and floods."""

import logging
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


def test_per_ip_limit_ignores_a_spoofed_first_forwarded_hop(outbox):
    client = TestClient(app)
    statuses = [
        client.post(
            "/api/contact", json=VALID, headers={"X-Forwarded-For": f"198.51.100.{hop}, 203.0.113.7"}
        ).status_code
        for hop in range(4)
    ]
    assert statuses == [202, 202, 202, 429]
    assert len(outbox) == 3


def test_resend_failure_returns_502_and_logs_nothing_about_the_visitor(outbox, monkeypatch, caplog):
    def reject(params):
        raise RuntimeError("provider rejected ada@example.com: Hello from Ada Lovelace")

    monkeypatch.setattr(resend.Emails, "send", reject)
    caplog.set_level(logging.INFO, logger=contact.logger.name)

    response = TestClient(app).post("/api/contact", json=VALID)

    assert response.status_code == 502
    assert response.json() == {"detail": "contact_failed"}
    assert "RuntimeError" in caplog.text
    for private in ("ada@example.com", "Ada Lovelace", "Analytical Engines", "Hello"):
        assert private not in caplog.text


def test_whitespace_only_honeypot_still_sends(outbox):
    response = TestClient(app).post("/api/contact", json={**VALID, "website": "   "})

    assert response.status_code == 202
    assert len(outbox) == 1
