"""POST /api/newsletter/unsubscribe verifies the token and unsubscribes by subscription id only."""

from types import SimpleNamespace

from fastapi.testclient import TestClient

import app.routers.newsletter as newsletter
from app.main import app
from app.services.beehiiv import BeehiivError
from app.services.unsubscribe_tokens import mint_token

SECRET = "s" * 40


def _settings(signing_secret=SECRET):
    return SimpleNamespace(
        signing_secret=signing_secret, signing_secret_previous="",
        beehiiv_api_key="bh_key", beehiiv_publication_id="pub_1",
    )


def _client(monkeypatch, settings, calls, outcome="unsubscribed"):
    monkeypatch.setattr(newsletter, "get_settings", lambda: settings)

    def fake_unsubscribe(api_key, publication_id, subscription_id):
        calls.append(subscription_id)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    monkeypatch.setattr(newsletter, "unsubscribe_subscription", fake_unsubscribe)
    return TestClient(app)


def test_valid_token_unsubscribes_that_subscription(monkeypatch):
    calls = []
    response = _client(monkeypatch, _settings(), calls).post(
        "/api/newsletter/unsubscribe", json={"token": mint_token("sub_abc", SECRET)}
    )
    assert response.status_code == 200
    assert response.json() == {"status": "unsubscribed"}
    assert calls == ["sub_abc"]


def test_unknown_subscription_still_reports_unsubscribed(monkeypatch):
    calls = []
    response = _client(monkeypatch, _settings(), calls, outcome="not_found").post(
        "/api/newsletter/unsubscribe", json={"token": mint_token("sub_gone", SECRET)}
    )
    assert response.status_code == 200


def test_forged_token_is_rejected_without_calling_beehiiv(monkeypatch):
    calls = []
    response = _client(monkeypatch, _settings(), calls).post(
        "/api/newsletter/unsubscribe", json={"token": mint_token("sub_abc", "x" * 40)}
    )
    assert response.status_code == 400
    assert calls == []


def test_missing_signing_secret_fails_closed(monkeypatch):
    calls = []
    response = _client(monkeypatch, _settings(signing_secret=""), calls).post(
        "/api/newsletter/unsubscribe", json={"token": mint_token("sub_abc", SECRET)}
    )
    assert response.status_code == 503
    assert calls == []


def test_previous_secret_alone_does_not_verify(monkeypatch):
    calls = []
    settings = _settings(signing_secret="")
    settings.signing_secret_previous = SECRET
    response = _client(monkeypatch, settings, calls).post(
        "/api/newsletter/unsubscribe", json={"token": mint_token("sub_abc", SECRET)}
    )
    assert response.status_code == 503
    assert calls == []


def test_beehiiv_failure_returns_502(monkeypatch):
    calls = []
    failure = BeehiivError("Beehiiv unsubscribe returned HTTP 500")
    response = _client(monkeypatch, _settings(), calls, outcome=failure).post(
        "/api/newsletter/unsubscribe", json={"token": mint_token("sub_abc", SECRET)}
    )
    assert response.status_code == 502


def test_get_never_unsubscribes(monkeypatch):
    calls = []
    token = mint_token("sub_abc", SECRET)
    response = _client(monkeypatch, _settings(), calls).get(f"/api/newsletter/unsubscribe?t={token}")
    assert response.status_code == 405
    assert calls == []
