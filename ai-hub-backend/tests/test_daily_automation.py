"""Reproduce the October incident and protect publication/send acceptance."""

import io
import json
from urllib.error import HTTPError

import pytest

from scripts import daily_automation as module
from scripts.daily_automation import AutomationError, DailyAutomation

PERIOD = "2026-10-26"


def runner(monkeypatch, statuses, *, content=True, newsletter=None):
    automation = DailyAutomation("https://example.test/api", "test-admin", poll_seconds=0)
    states = iter(statuses)
    calls = []

    def request(method, path, **params):
        calls.append((method, path, params))
        if path == "admin/collect/status":
            state = next(states)
            return state if isinstance(state, dict) else {"status": state, "period_id": PERIOD}
        if path == "admin/collect":
            return {"status": "started"}
        if path == "admin/newsletter":
            return {"period_id": PERIOD, **newsletter}
        values = {"en": [{"content": "A real item"}] if content else []}
        if path.startswith("investment/"):
            return {name: values for name in ("primaryMarket", "secondaryMarket", "ma")}
        return values

    monkeypatch.setattr(automation, "request", request)
    return automation, calls


def posts(calls, path):
    return [call for call in calls if call[:2] == ("POST", path)]


def test_empty_previous_run_is_retried_instead_of_green_skip(monkeypatch):
    automation, calls = runner(monkeypatch, ["empty", "running", "completed"])
    assert "verified 5" in automation.collect(PERIOD)
    assert len(posts(calls, "admin/collect")) == 1


def test_two_empty_attempts_fail_and_include_underlying_error(monkeypatch):
    failure = {"status": "empty", "raw_counts": {"articles": 45}, "error": "OpenRouter HTTP 401"}
    automation, calls = runner(monkeypatch, ["unknown", failure, failure], content=False)
    with pytest.raises(AutomationError, match="OpenRouter HTTP 401"):
        automation.collect(PERIOD)
    assert len(posts(calls, "admin/collect")) == 2


def test_terminal_failure_can_recover_on_second_attempt(monkeypatch):
    automation, calls = runner(monkeypatch, ["unknown", "failed", "completed"])
    automation.collect(PERIOD)
    assert len(posts(calls, "admin/collect")) == 2


def test_existing_running_collection_is_waited_for_without_duplicate_trigger(monkeypatch):
    automation, calls = runner(monkeypatch, ["running", "running", "completed"])
    automation.collect(PERIOD)
    assert not posts(calls, "admin/collect")


def test_timeout_is_red_even_if_base_content_may_exist(monkeypatch):
    automation, calls = runner(monkeypatch, ["running", "running"])
    automation.timeout_seconds = 0
    with pytest.raises(AutomationError, match="not starting a concurrent retry"):
        automation.collect(PERIOD)
    assert not posts(calls, "admin/collect")


def test_completed_status_without_content_is_not_publication(monkeypatch):
    automation, calls = runner(monkeypatch, ["completed"], content=False)
    with pytest.raises(AutomationError, match="No published content"):
        automation.collect(PERIOD)
    assert not posts(calls, "admin/collect")


def test_completed_collection_is_verified_and_not_republished(monkeypatch):
    automation, calls = runner(monkeypatch, ["completed"])
    assert "Already collected" in automation.collect(PERIOD)
    assert not posts(calls, "admin/collect")


@pytest.mark.parametrize("status", ["empty", "failed", "running", "unknown"])
def test_newsletter_is_never_sent_for_incomplete_collection(monkeypatch, status):
    automation, calls = runner(monkeypatch, [status])
    with pytest.raises(AutomationError, match="not completed"):
        automation.newsletter(PERIOD)
    assert not posts(calls, "admin/newsletter")


def test_newsletter_empty_content_is_red_and_does_not_send(monkeypatch):
    automation, calls = runner(monkeypatch, ["completed"], content=False)
    with pytest.raises(AutomationError, match="No published content"):
        automation.newsletter(PERIOD)
    assert not posts(calls, "admin/newsletter")


@pytest.mark.parametrize("result", [
    {"status": "no_content", "total_sent": 0},
    {"status": "no_subscribers", "total_sent": 0},
    {"status": "skipped", "total_sent": 0},
    {"status": "sent", "total_sent": 0},
    {"status": "partial", "total_sent": 4, "total_failed": 1},
    {"status": "sent", "total_sent": 4, "held_languages": {"zh": {"missing": 4}}},
    {"status": "completed"},  # legacy HTTP 200 is not proof of delivery
])
def test_http_200_without_complete_send_evidence_is_red(monkeypatch, result):
    result = {"total_failed": 0, "skipped_already_sent": 0, **result}
    automation, calls = runner(monkeypatch, ["completed"], newsletter=result)
    with pytest.raises(AutomationError):
        automation.newsletter(PERIOD)
    assert len(posts(calls, "admin/newsletter")) == 1


def test_success_reports_actual_accepted_message_count(monkeypatch):
    automation, _ = runner(monkeypatch, ["completed"], newsletter={
        "status": "sent", "total_sent": 11, "total_failed": 0, "skipped_already_sent": 0,
    })
    assert "accepted 11 messages" in automation.newsletter(PERIOD)


def test_already_sent_reports_no_new_messages(monkeypatch):
    automation, calls = runner(monkeypatch, ["completed"], newsletter={
        "status": "skipped", "total_sent": 0, "total_failed": 0, "skipped_already_sent": 4,
    })
    assert "No new messages" in automation.newsletter(PERIOD)
    assert len(posts(calls, "admin/newsletter")) == 1


def test_http_error_retains_diagnostic_and_does_not_retry_post(monkeypatch):
    calls = []

    def urlopen(request, **kwargs):
        calls.append(request)
        raise HTTPError(request.full_url, 401, "Unauthorized", {}, io.BytesIO(b'{"detail":"Invalid API key"}'))

    monkeypatch.setattr(module, "urlopen", urlopen)
    with pytest.raises(AutomationError, match="HTTP 401.*Invalid API key"):
        DailyAutomation("https://example.test/api", "secret").request("POST", "admin/newsletter")
    assert len(calls) == 1


def test_malformed_content_response_is_not_mistaken_for_news(monkeypatch):
    automation = DailyAutomation("https://example.test/api", "secret")
    monkeypatch.setattr(automation, "request", lambda *a, **kw: {"detail": "service error"})
    with pytest.raises(AutomationError, match="Invalid content response"):
        automation.content_counts(PERIOD)


def test_workflows_use_tested_runner_and_pass_secrets_through_environment():
    from pathlib import Path
    import yaml

    workflows = Path(__file__).resolve().parents[2] / ".github" / "workflows"
    for file, operation in (("daily-collect.yml", "collect"), ("daily-newsletter.yml", "newsletter")):
        config = yaml.safe_load((workflows / file).read_text())
        steps = next(iter(config["jobs"].values()))["steps"]
        step = next(step for step in steps if "daily_automation.py" in step.get("run", ""))
        assert f"daily_automation.py {operation}" in step["run"]
        assert "${{ secrets." not in step["run"]
        assert step["env"]["ADMIN_API_KEY"] == "${{ secrets.ADMIN_API_KEY }}"
        assert config["concurrency"]["cancel-in-progress"] is False


def test_cli_failure_is_red_and_summary_does_not_expose_key(monkeypatch, tmp_path, capsys):
    import sys

    summary = tmp_path / "summary.md"
    monkeypatch.setenv("API_BASE_URL", "https://example.test/api")
    monkeypatch.setenv("ADMIN_API_KEY", "secret-admin")
    monkeypatch.setenv("GITHUB_STEP_SUMMARY", str(summary))
    monkeypatch.setattr(sys, "argv", ["daily_automation.py", "collect", "--period", PERIOD])

    def fail(*args):
        raise AutomationError('HTTP 401 secret-admin sk-or-v1-' + 'a' * 64)

    monkeypatch.setattr(DailyAutomation, "collect", fail)
    assert module.main() == 1
    output = capsys.readouterr().out + summary.read_text()
    assert "FAILED" in output
    assert "secret-admin" not in output
    assert "sk-or-v1-" not in output


def test_invalid_json_http_response_is_failure(monkeypatch):
    monkeypatch.setattr(module, "urlopen", lambda *a, **kw: io.BytesIO(b"not JSON"))
    with pytest.raises(AutomationError):
        DailyAutomation("https://example.test/api", "secret").status(PERIOD)


def test_valid_json_http_response(monkeypatch):
    monkeypatch.setattr(module, "urlopen", lambda *a, **kw: io.BytesIO(json.dumps({"status": "empty"}).encode()))
    assert DailyAutomation("https://example.test/api", "secret").status(PERIOD)["status"] == "empty"
