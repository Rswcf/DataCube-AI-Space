"""The newsletter holds any language whose translations are not usable."""

from types import SimpleNamespace

from fastapi.testclient import TestClient

import app.services.newsletter_sender as sender
from app.main import app
from app.routers.admin import verify_api_key
from app.services.translation_integrity import SRC_KEY, record_source_hash


def _ready_row():
    row = SimpleNamespace(
        content_en="OpenAI released a model.", content_de="OpenAI hat ein Modell veröffentlicht.",
        category_en="AI", category_de="KI", tags_en=[], tags_de=[], translations=None,
        impact="high", source="Example", source_url="https://example.com", display_order=0,
    )
    src = record_source_hash(row, "tech")
    row.translations = {"de": {SRC_KEY: src}, "zh": {"content": "OpenAI 发布了模型。", SRC_KEY: src}}
    return row


def _patch_sender(monkeypatch, rows):
    sent = []
    monkeypatch.setattr(sender, "get_settings", lambda: SimpleNamespace(
        resend_api_key="re_test", beehiiv_api_key="bh_test", beehiiv_publication_id="pub_test",
        newsletter_from_email="News <news@example.com>", app_timezone="Europe/Berlin",
        signing_secret="s" * 40,
    ))
    monkeypatch.setattr(sender, "_fetch_period_content", lambda db, period_id: {
        "period_id": period_id, "tech": rows, "videos": [], "funding": [], "ma": [], "tips": [],
    })
    monkeypatch.setattr(sender, "_fetch_beehiiv_subscribers", lambda api_key, publication_id: [
        {"id": "sub_en", "email": "en@example.com", "language": "en"},
        {"id": "sub_de", "email": "de@example.com", "language": "de"},
        {"id": "sub_zh", "email": "zh@example.com", "language": "zh"},
    ])
    monkeypatch.setattr(sender, "_acquire_send_lock", lambda db, period_id, lang: True)
    monkeypatch.setattr(sender, "_mark_send_sent", lambda db, period_id, lang, count: None)
    monkeypatch.setattr(sender, "_mark_send_failed", lambda db, period_id, lang, error: None)
    monkeypatch.setattr(sender, "_build_email_html", lambda data, lang: "<html></html>")

    def fake_send(messages):
        sent.append(tuple(message["to"][0] for message in messages))
        return len(messages), 0

    monkeypatch.setattr(sender, "_send_via_resend", fake_send)
    return sent


def test_ready_translations_are_sent(monkeypatch):
    sent = _patch_sender(monkeypatch, [_ready_row()])

    result = sender.send_newsletter(None, "2026-09-12")

    assert result["held_languages"] == {}
    assert result["status"] == "sent"
    assert len(sent) == 3


def test_misaligned_language_is_held(monkeypatch):
    row = _ready_row()
    row.translations["zh"] = {"content": "Sam Altman 确认不上市。"}  # legacy entry, no marker
    sent = _patch_sender(monkeypatch, [row])

    result = sender.send_newsletter(None, "2026-09-12")

    assert result["held_languages"] == {"zh": {"total": 1, "missing": 1, "stale": 0, "untranslated": 0}}
    assert ("zh@example.com",) not in sent
    assert ("en@example.com",) in sent
    assert ("de@example.com",) in sent
    assert result["status"] == "partial"


def test_few_unready_rows_send_with_english_fallback(monkeypatch):
    legacy = _ready_row()
    legacy.translations["zh"] = {"content": "旧译文。"}  # legacy entry, no marker
    sent = _patch_sender(monkeypatch, [_ready_row(), _ready_row(), legacy])

    result = sender.send_newsletter(None, "2026-09-12")

    assert result["held_languages"] == {}
    assert result["translation_warnings"] == {
        "zh": {"total": 3, "missing": 1, "stale": 0, "untranslated": 0},
    }
    assert ("zh@example.com",) in sent
    assert result["status"] == "sent"


def test_admin_returns_502_when_a_language_is_held(monkeypatch):
    monkeypatch.setattr(sender, "send_newsletter", lambda db, period_id: {
        "period_id": "2026-09-12", "status": "held", "total_sent": 0, "total_failed": 0,
        "lang_breakdown": {}, "skipped_already_sent": 0,
        "held_languages": {"de": {"missing": 2, "stale": 0, "untranslated": 0}},
    })
    app.dependency_overrides[verify_api_key] = lambda: True
    try:
        response = TestClient(app).post("/api/admin/newsletter?period_id=2026-09-12&wait=true")
    finally:
        app.dependency_overrides.pop(verify_api_key, None)

    assert response.status_code == 502
    assert response.json()["detail"]["held_languages"]["de"]["missing"] == 2


def test_held_language_after_earlier_cron_reports_held_and_takes_no_lock(monkeypatch):
    row = _ready_row()
    row.translations["zh"] = {"content": "Sam Altman 确认不上市。"}  # legacy entry, no marker
    sent = _patch_sender(monkeypatch, [row])
    lock_calls = []

    def already_sent(db, period_id, lang):
        lock_calls.append(lang)
        return False  # EN and DE went out in the earlier cron slot

    monkeypatch.setattr(sender, "_acquire_send_lock", already_sent)

    result = sender.send_newsletter(None, "2026-09-12")

    assert result["status"] == "held"
    assert "zh" in result["held_languages"]
    assert "zh" not in lock_calls
    assert sent == []
