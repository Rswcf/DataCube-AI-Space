"""Each newsletter recipient gets a personal one-click unsubscribe link and headers."""

import logging
from urllib.parse import parse_qs, urlparse

import pytest
import requests
import resend

import app.services.newsletter_sender as sender
from app.services.unsubscribe_tokens import verify_token

SECRET = "s" * 40
HTML = f'<p>news</p><a href="{sender.UNSUBSCRIBE_URL_PLACEHOLDER}">Unsubscribe</a>'
RECIPIENTS = [
    {"id": "sub_one", "email": "one@example.com"},
    {"id": "sub_two", "email": "two@example.com"},
]


def _token_from(url):
    return parse_qs(urlparse(url).query)["t"][0]


def test_messages_carry_the_rfc8058_header_pair_with_a_valid_token():
    messages = sender._recipient_messages("News <news@example.com>", "Subject", HTML, RECIPIENTS, SECRET)

    assert [m["to"] for m in messages] == [["one@example.com"], ["two@example.com"]]
    for message, recipient in zip(messages, RECIPIENTS):
        headers = message["headers"]
        assert headers["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"
        link = headers["List-Unsubscribe"]
        assert link.startswith("<https://www.datacubeai.space/api/newsletter/unsubscribe?t=")
        assert link.endswith(">")
        assert verify_token(_token_from(link[1:-1]), [SECRET]) == recipient["id"]
        assert recipient["email"] not in link


def test_footer_link_is_personal_and_points_at_the_confirm_page():
    messages = sender._recipient_messages("News <news@example.com>", "Subject", HTML, RECIPIENTS, SECRET)

    first, second = (m["html"] for m in messages)
    assert sender.UNSUBSCRIBE_URL_PLACEHOLDER not in first
    assert 'href="https://www.datacubeai.space/unsubscribe?t=v1.' in first
    assert first != second
    assert "one@example.com" not in first


def test_without_a_usable_secret_messages_degrade_but_still_send():
    messages = sender._recipient_messages("News <news@example.com>", "Subject", HTML, RECIPIENTS, "")

    assert all("headers" not in m for m in messages)
    assert all('href="https://www.datacubeai.space/unsubscribe"' in m["html"] for m in messages)


def test_recipient_without_subscription_id_gets_no_one_click_headers():
    messages = sender._recipient_messages(
        "News <news@example.com>", "Subject", HTML, [{"id": None, "email": "x@example.com"}], SECRET
    )
    assert "headers" not in messages[0]


def test_non_string_subscription_id_degrades_instead_of_raising():
    messages = sender._recipient_messages(
        "News <news@example.com>", "Subject", HTML, [{"id": 123, "email": "x@example.com"}], SECRET
    )
    assert "headers" not in messages[0]
    assert 'href="https://www.datacubeai.space/unsubscribe"' in messages[0]["html"]


def test_email_template_contains_exactly_one_unsubscribe_placeholder():
    data = {"period_id": "2026-09-12", "tech": [], "videos": [], "funding": [], "ma": [], "tips": []}
    html = sender._build_email_html(data, "en")
    assert html.count(sender.UNSUBSCRIBE_URL_PLACEHOLDER) == 1


def test_resend_receives_the_prepared_messages_in_batches(monkeypatch):
    batches = []
    monkeypatch.setattr(
        resend.Batch, "send",
        lambda params: batches.append(params) or {"data": [{"id": str(i)} for i in range(len(params))]},
    )
    messages = [
        {"from": "f", "to": [f"r{i}@example.com"], "subject": "s", "html": "h",
         "headers": {"List-Unsubscribe-Post": "List-Unsubscribe=One-Click"}}
        for i in range(150)
    ]

    assert sender._send_via_resend(messages) == (150, 0)
    assert [len(batch) for batch in batches] == [100, 50]
    assert batches[0][0]["headers"] == {"List-Unsubscribe-Post": "List-Unsubscribe=One-Click"}


def test_resend_errors_are_logged_without_addresses(monkeypatch, caplog):
    def reject(params):
        raise ValueError("Invalid `to` field: r0@example.com")

    monkeypatch.setattr(resend.Batch, "send", reject)
    caplog.set_level(logging.WARNING)

    assert sender._send_via_resend([{"from": "f", "to": ["r0@example.com"], "subject": "s", "html": "h"}]) == (0, 1)
    assert "r0@example.com" not in caplog.text


class _BeehiivPage:
    ok = True
    status_code = 200

    def json(self):
        return {
            "data": [{"id": "sub_1", "email": "reader@example.com",
                      "custom_fields": [{"name": "Language", "value": "xx"}]}],
            "total_pages": 1,
        }


def test_subscriber_fetch_keeps_the_subscription_id_and_logs_no_address(monkeypatch, caplog):
    monkeypatch.setattr(requests, "get", lambda *args, **kwargs: _BeehiivPage())
    caplog.set_level(logging.WARNING)

    assert sender._fetch_beehiiv_subscribers("bh_key", "pub_1") == [
        {"id": "sub_1", "email": "reader@example.com", "language": "en"}
    ]
    assert "reader@example.com" not in caplog.text


class _BeehiivRejection:
    ok = False
    status_code = 401
    text = "Unauthorized: API key revoked by admin@example.com"


def test_subscriber_fetch_error_keeps_the_status_but_redacts_addresses(monkeypatch):
    monkeypatch.setattr(requests, "get", lambda *args, **kwargs: _BeehiivRejection())

    with pytest.raises(RuntimeError) as raised:
        sender._fetch_beehiiv_subscribers("bh_key", "pub_1")

    message = str(raised.value)
    assert "Beehiiv API error 401" in message
    assert "admin@example.com" not in message
    assert "<email>" in message
