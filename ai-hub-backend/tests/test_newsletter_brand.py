"""The newsletter email takes its identity from the brand settings (spec AD1)."""

import app.services.newsletter_sender as sender
from app.config import Settings
from newsletter_fixtures import period_data

ACME = Settings(_env_file=None, brand_name="Acme News", site_url="https://www.acme.example")


def test_email_uses_the_brand_settings(monkeypatch):
    monkeypatch.setattr(sender, "get_settings", lambda: ACME)

    html = sender._build_email_html(period_data(), "en")

    assert "Acme News" in html
    assert 'href="https://www.acme.example/en/week/2026-09-13"' in html
    assert ">acme.example</a>" in html
    assert "You received this email because you subscribed to the Acme News newsletter." in html
    assert "Data Cube" not in html
    assert "datacubeai" not in html


def test_recipient_links_use_the_site_url_argument():
    html = f'<a href="{sender.UNSUBSCRIBE_URL_PLACEHOLDER}">u</a>'
    recipients = [{"id": "sub_1", "email": "reader@example.com"}]

    messages = sender._recipient_messages("News <n@example.com>", "S", html, recipients, "s" * 40, "https://www.acme.example")

    assert messages[0]["headers"]["List-Unsubscribe"].startswith("<https://www.acme.example/api/newsletter/unsubscribe?t=")
    assert 'href="https://www.acme.example/unsubscribe?t=' in messages[0]["html"]
