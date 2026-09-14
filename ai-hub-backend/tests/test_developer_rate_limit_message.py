"""The developer API 429 message links to a page that exists."""

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

import app.routers.developer as developer


class _Query:
    def __init__(self, record):
        self.record = record

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self.record


def test_rate_limit_message_links_to_the_api_tool_page(monkeypatch):
    record = SimpleNamespace(
        is_active=True, tier="free", calls_today=100,
        calls_today_date=datetime.now(timezone.utc).date(), calls_total=100,
    )
    db = SimpleNamespace(query=lambda model: _Query(record))
    request = SimpleNamespace(headers={"X-API-Key": "dcai_test"})
    monkeypatch.setattr("app.config.get_settings", lambda: SimpleNamespace(admin_api_key="admin-key"))

    with pytest.raises(HTTPException) as excinfo:
        developer.check_developer_rate_limit(request, db)

    assert excinfo.value.status_code == 429
    assert "https://www.datacubeai.space/en/tools/ai-news-api" in excinfo.value.detail
    assert "/pricing" not in excinfo.value.detail
