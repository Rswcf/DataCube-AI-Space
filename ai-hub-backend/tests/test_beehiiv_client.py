"""The Beehiiv client calls the documented endpoints and keeps response bodies out of errors."""

import pytest
import requests

from app.services import beehiiv


class _Response:
    def __init__(self, status_code, payload=None):
        self.status_code = status_code
        self.ok = 200 <= status_code < 300
        self._payload = payload or {}
        self.text = '{"email": "reader@example.com"}'

    def json(self):
        return self._payload


def test_unsubscribe_puts_unsubscribe_true_on_the_subscription(monkeypatch):
    calls = []
    monkeypatch.setattr(requests, "put", lambda url, **kwargs: calls.append((url, kwargs)) or _Response(200))

    assert beehiiv.unsubscribe_subscription("bh_key", "pub_1", "sub_abc") == "unsubscribed"

    url, kwargs = calls[0]
    assert url == "https://api.beehiiv.com/v2/publications/pub_1/subscriptions/sub_abc"
    assert kwargs["json"] == {"unsubscribe": True}
    assert kwargs["headers"] == {"Authorization": "Bearer bh_key"}


def test_unsubscribe_of_an_unknown_subscription_reports_not_found(monkeypatch):
    monkeypatch.setattr(requests, "put", lambda url, **kwargs: _Response(404))
    assert beehiiv.unsubscribe_subscription("bh_key", "pub_1", "sub_gone") == "not_found"


def test_unsubscribe_errors_do_not_include_response_bodies(monkeypatch):
    monkeypatch.setattr(requests, "put", lambda url, **kwargs: _Response(500))
    with pytest.raises(beehiiv.BeehiivError) as excinfo:
        beehiiv.unsubscribe_subscription("bh_key", "pub_1", "sub_abc")
    assert "reader@example.com" not in str(excinfo.value)


def test_find_subscription_id_url_encodes_the_address(monkeypatch):
    calls = []
    monkeypatch.setattr(
        requests, "get",
        lambda url, **kwargs: calls.append(url) or _Response(200, {"data": {"id": "sub_abc"}}),
    )

    assert beehiiv.find_subscription_id("bh_key", "pub_1", "founder+test@example.com") == "sub_abc"
    assert calls == [
        "https://api.beehiiv.com/v2/publications/pub_1/subscriptions/by_email/founder%2Btest%40example.com"
    ]


def test_find_subscription_id_returns_none_for_unknown_addresses(monkeypatch):
    monkeypatch.setattr(requests, "get", lambda url, **kwargs: _Response(404))
    assert beehiiv.find_subscription_id("bh_key", "pub_1", "nobody@example.com") is None
