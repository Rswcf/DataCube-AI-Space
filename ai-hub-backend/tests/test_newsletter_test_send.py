"""The admin test-send mails one real render, with one-click headers, to the test address only."""

from types import SimpleNamespace

from fastapi.testclient import TestClient

import app.services.newsletter_sender as sender
from app.database import get_db
from app.main import app
from app.routers.admin import verify_api_key
from app.services.unsubscribe_tokens import verify_token

SECRET = "s" * 40


def _patch(monkeypatch, subscription_id):
    captured = {}
    monkeypatch.setattr(sender, "get_settings", lambda: SimpleNamespace(
        resend_api_key="re_test", beehiiv_api_key="bh_key", beehiiv_publication_id="pub_1",
        newsletter_from_email="News <news@example.com>", signing_secret=SECRET,
    ))
    monkeypatch.setattr(sender, "_fetch_period_content", lambda db, period_id: {
        "period_id": period_id, "tech": [{"content_en": "x"}], "videos": [], "funding": [], "ma": [], "tips": [],
    })
    monkeypatch.setattr(
        sender, "_build_email_html", lambda data, lang: f'<a href="{sender.UNSUBSCRIBE_URL_PLACEHOLDER}">u</a>'
    )
    monkeypatch.setattr(sender, "_build_subject", lambda data, period_id, lang: "AI-News")
    monkeypatch.setattr(sender, "find_subscription_id", lambda api_key, publication_id, email: subscription_id)

    def no_lock(*args, **kwargs):
        raise AssertionError("test-send must not take the send lock")

    def fake_send(messages):
        captured["messages"] = messages
        return len(messages), 0

    monkeypatch.setattr(sender, "_acquire_send_lock", no_lock)
    monkeypatch.setattr(sender, "_send_via_resend", fake_send)
    return captured


def test_subscribed_test_address_uses_its_real_subscription_id(monkeypatch):
    captured = _patch(monkeypatch, "sub_founder")

    result = sender.send_test_newsletter(None, "2026-09-12", "founder@example.com", "en")

    message = captured["messages"][0]
    assert message["to"] == ["founder@example.com"]
    assert message["subject"] == "[TEST] AI-News"
    assert message["headers"]["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"
    token = message["headers"]["List-Unsubscribe"].split("t=", 1)[1].rstrip(">")
    assert verify_token(token, [SECRET]) == "sub_founder"
    assert result["matched_subscriber"] is True
    assert result["one_click_headers"] is True
    assert result["sent"] == 1


def test_non_subscriber_test_address_still_gets_one_click_headers(monkeypatch):
    captured = _patch(monkeypatch, None)

    result = sender.send_test_newsletter(None, "2026-09-12", "founder@example.com", "de")

    token = captured["messages"][0]["headers"]["List-Unsubscribe"].split("t=", 1)[1].rstrip(">")
    assert verify_token(token, [SECRET]) == sender.TEST_SEND_SUBSCRIPTION_ID
    assert result["matched_subscriber"] is False


def test_admin_test_send_requires_a_valid_test_email(monkeypatch):
    _patch(monkeypatch, None)
    app.dependency_overrides[verify_api_key] = lambda: True
    app.dependency_overrides[get_db] = lambda: None
    try:
        client = TestClient(app)
        url = "/api/admin/newsletter/test-send?period_id=2026-09-12"
        missing = client.post(url, json={})
        invalid = client.post(url, json={"test_email": "nope"})
        ok = client.post(url, json={"test_email": "founder@example.com"})
    finally:
        app.dependency_overrides.pop(verify_api_key, None)
        app.dependency_overrides.pop(get_db, None)

    assert missing.status_code == 422
    assert invalid.status_code == 422
    assert ok.status_code == 200
    assert ok.json()["one_click_headers"] is True
