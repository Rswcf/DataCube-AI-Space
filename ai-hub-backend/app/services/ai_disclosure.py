"""Spec AD7: the endpoints that serve AI-written content say so in a header.

Why a header and not a field: the content endpoints return a JSON object keyed
by language code — ``{"en": [...], "de": [...]}``, see ``TechFeedResponse`` and
its siblings, whose model fields ARE the language codes. A ``disclosure`` key
would sit among them, and any consumer iterating the keys as languages would
read the disclosure as a ninth language. A response header states the same
thing without touching the body's shape, so existing clients keep working.

The wording is not new copy. It is the English site/email label, which
``scripts/test_brand_parity.py`` already pins to ``lib/ai-label.ts``, plus a
link to the disclosure page. A third independent string would be a third thing
to drift.

``/api/deals`` keeps its own ``disclosure`` field: that one states data-use and
licensing terms, which is a different statement from "this text was written by
a machine".
"""

from fastapi import Response

from app.config import get_settings
from app.services.newsletter_sender import EMAIL_STRINGS

AI_DISCLOSURE_HEADER = "X-AI-Disclosure"


def ai_disclosure_value() -> str:
    """The header's value: the English AI label plus the disclosure page."""
    settings = get_settings()
    return f"{EMAIL_STRINGS['en']['ai_label']} See {settings.site_url}/ai-disclosure"


def add_ai_disclosure(response: Response) -> None:
    """Router-level dependency; runs before the handler and tags its response.

    Error responses raised as exceptions (a 404 for an unknown period) bypass
    this object and carry no header — they carry no AI content either.
    """
    response.headers[AI_DISCLOSURE_HEADER] = ai_disclosure_value()
