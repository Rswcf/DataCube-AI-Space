"""Do not convert provider authentication/generation failures to empty days."""

from types import SimpleNamespace
from unittest.mock import MagicMock

import httpx
import pytest
from openai import AuthenticationError

from app.services import collector


def auth_error():
    response = httpx.Response(401, request=httpx.Request("POST", "https://example.test"))
    return AuthenticationError("User not found", response=response, body={})


def test_classification_does_not_swallow_invalid_credentials(monkeypatch):
    db = MagicMock()
    db.query.return_value.filter.return_value.all.return_value = [SimpleNamespace(
        original_section="tech", source="test", title="AI news", summary="text",
        link="https://example.test", published="2026-10-26",
    )]
    monkeypatch.setattr(collector, "_drop_articles_not_about_ai", lambda items: items)
    processor = MagicMock()
    processor.classify_articles.side_effect = auth_error()
    with pytest.raises(AuthenticationError):
        collector.stage2_classify_articles(db, "2026-10-26", processor)
    db.commit.assert_not_called()


def test_failed_content_generation_keeps_original_error_and_skips_trends(monkeypatch):
    db = MagicMock()
    db.query.return_value.filter.return_value.all.side_effect = [[], []]
    processor = MagicMock()
    for name in ("process_tech_articles", "process_investment_articles", "process_tips_articles", "process_youtube_videos"):
        getattr(processor, name).side_effect = RuntimeError("provider unavailable")
    monkeypatch.setattr(collector, "LLMProcessor", lambda: processor)
    with pytest.raises(RuntimeError, match="Content generation failed.*provider unavailable"):
        collector.stage3_parallel_processing(db, "2026-10-26", processor)
    processor.generate_trends.assert_not_called()


def test_orchestrator_records_authentication_failure_instead_of_empty(monkeypatch):
    statuses = []
    save = MagicMock()
    monkeypatch.setattr(collector, "_is_collection_running", lambda period: False)
    monkeypatch.setattr(collector, "set_collection_status", lambda *a, **kw: statuses.append((a, kw)))
    monkeypatch.setattr(collector, "stage1_fetch_and_store", lambda *a: {"articles": 45, "videos": 2})
    monkeypatch.setattr(collector, "LLMProcessor", MagicMock)

    def classify(*args):
        raise auth_error()

    monkeypatch.setattr(collector, "stage2_classify_articles", classify)
    monkeypatch.setattr(collector, "stage4_save_to_database", save)
    with pytest.raises(AuthenticationError):
        collector.run_collection(MagicMock(), "2026-10-26")
    assert statuses[-1][0] == ("2026-10-26", "failed")
    assert "User not found" in statuses[-1][1]["error"]
    save.assert_not_called()


def test_historical_reprocessing_preserves_raw_rows_and_completes_status(monkeypatch):
    db = MagicMock()
    db.query.return_value.filter.return_value.count.return_value = 1
    statuses = []
    fetch = MagicMock(side_effect=AssertionError("historical raw rows must not be cleared/refetched"))
    results = {"tech": {"en": [{"content": "Restored news"}]}}
    monkeypatch.setattr(collector, "_is_collection_running", lambda period: False)
    monkeypatch.setattr(collector, "set_collection_status", lambda *a, **kw: statuses.append((a, kw)))
    monkeypatch.setattr(collector, "stage1_fetch_and_store", fetch)
    monkeypatch.setattr(collector, "LLMProcessor", MagicMock)
    monkeypatch.setattr(collector, "stage2_classify_articles", MagicMock())
    monkeypatch.setattr(collector, "stage3_parallel_processing", lambda *a: results)
    save = MagicMock()
    monkeypatch.setattr(collector, "stage4_save_to_database", save)
    monkeypatch.setattr(collector, "stage3_5_translate_content", MagicMock())
    backfill = MagicMock()
    monkeypatch.setattr(collector, "_backfill_translations_to_db", backfill)

    outcome = collector.run_process_only(db, "2026-10-22")

    fetch.assert_not_called()
    save.assert_called_once()
    backfill.assert_called_once()
    assert statuses[-1][0] == ("2026-10-22", "completed")
    assert statuses[-1][1]["counts"]["tech"] == 1
    assert outcome["week_id"] == "2026-10-22"


def test_historical_reprocessing_records_provider_failure(monkeypatch):
    db = MagicMock()
    db.query.return_value.filter.return_value.count.return_value = 1
    statuses = []
    monkeypatch.setattr(collector, "_is_collection_running", lambda period: False)
    monkeypatch.setattr(collector, "set_collection_status", lambda *a, **kw: statuses.append((a, kw)))
    monkeypatch.setattr(collector, "LLMProcessor", MagicMock)

    def fail(*args):
        raise auth_error()

    monkeypatch.setattr(collector, "stage2_classify_articles", fail)
    with pytest.raises(AuthenticationError):
        collector.run_process_only(db, "2026-10-22")
    assert statuses[-1][0] == ("2026-10-22", "failed")
    assert "User not found" in statuses[-1][1]["error"]
