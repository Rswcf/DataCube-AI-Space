"""The API must not report an empty, partial or pending send as completed."""

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.routers.admin import verify_api_key
from app.services import newsletter_sender as sender


@pytest.mark.parametrize("result, status", [
    (None, 502),
    ({"status": "no_content", "total_sent": 0, "total_failed": 0}, 409),
    ({"status": "no_period", "total_sent": 0, "total_failed": 0}, 409),
    ({"status": "partial", "total_sent": 5, "total_failed": 1}, 502),
    ({"status": "sent", "total_sent": 11, "total_failed": 0}, 200),
    ({"status": "skipped", "total_sent": 0, "total_failed": 0, "skipped_already_sent": 4}, 200),
])
def test_admin_http_status_matches_send_outcome(monkeypatch, result, status):
    monkeypatch.setattr(sender, "send_newsletter", lambda *a: result)
    app.dependency_overrides[verify_api_key] = lambda: True
    app.dependency_overrides[get_db] = lambda: None
    try:
        response = TestClient(app).post("/api/admin/newsletter?period_id=2026-10-26&wait=true")
    finally:
        app.dependency_overrides.pop(verify_api_key)
        app.dependency_overrides.pop(get_db)
    assert response.status_code == status


def test_fresh_send_lock_is_not_proof_of_delivery():
    db = MagicMock()
    db.execute.return_value.first.return_value = None
    row = SimpleNamespace(status="in_progress", started_at=datetime.utcnow())
    db.query.return_value.filter.return_value.with_for_update.return_value.one.return_value = row
    with pytest.raises(RuntimeError, match="still in progress"):
        sender._acquire_send_lock(db, "2026-10-26", "en")
    assert row.status == "in_progress"


def test_confirmed_sent_lock_still_prevents_duplicate_messages():
    db = MagicMock()
    db.execute.return_value.first.return_value = None
    row = SimpleNamespace(status="sent")
    db.query.return_value.filter.return_value.with_for_update.return_value.one.return_value = row
    assert sender._acquire_send_lock(db, "2026-10-26", "en") is False
