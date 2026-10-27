"""Run the daily workflows, checking business results rather than HTTP 200.

Standard library only: GitHub runners need no backend dependencies or database.
Never retry a newsletter POST: a lost response may still have sent messages.
The backend's per-language send ledger handles later scheduled invocations.
"""

import argparse
import json
import os
import re
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


class AutomationError(RuntimeError):
    pass


class DailyAutomation:
    def __init__(self, base_url, api_key, *, poll_seconds=60, timeout_seconds=3600):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.poll_seconds = poll_seconds
        self.timeout_seconds = timeout_seconds

    def request(self, method, path, **params):
        url = f"{self.base_url}/{path}?{urlencode(params)}"
        headers = {"X-API-Key": self.api_key} if path.startswith("admin/") else {}
        request = Request(url, method=method, headers=headers)
        try:
            with urlopen(request, timeout=300 if path == "admin/newsletter" else 60) as response:
                result = json.load(response)
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:2000]
            raise AutomationError(f"{method} {path}: HTTP {exc.code}: {detail}") from exc
        except (URLError, TimeoutError, ValueError) as exc:
            raise AutomationError(f"{method} {path}: {exc}") from exc
        if not isinstance(result, dict):
            raise AutomationError(f"{method} {path}: expected a JSON object")
        return result

    def status(self, period):
        result = self.request("GET", "admin/collect/status", period_id=period)
        if result.get("status") not in {"unknown", "running", "completed", "failed", "empty"}:
            raise AutomationError(f"Invalid collection status: {result}")
        return result

    def content_counts(self, period):
        counts = {}
        for section in ("tech", "tips", "investment"):
            result = self.request("GET", f"{section}/{period}")
            groups = (result,) if section != "investment" else tuple(
                result.get(name) for name in ("primaryMarket", "secondaryMarket", "ma")
            )
            if any(not isinstance(group, dict) or not isinstance(group.get("en"), list) for group in groups):
                raise AutomationError(f"Invalid content response for {section}/{period}")
            counts[section] = sum(len(group["en"]) for group in groups)
        print(f"Published English items for {period}: {json.dumps(counts)}", flush=True)
        if sum(counts.values()) == 0:
            raise AutomationError(f"No published content for {period}; publication is not successful")
        return counts

    def wait_for_collection(self, period):
        deadline = time.monotonic() + self.timeout_seconds
        while True:
            result = self.status(period)
            # Preserve raw counts and the underlying error in Actions logs.
            print(json.dumps(result, ensure_ascii=False), flush=True)
            if result["status"] in {"completed", "failed", "empty"}:
                return result
            if time.monotonic() >= deadline:
                raise AutomationError(
                    f"Collection for {period} has not completed after {self.timeout_seconds}s; "
                    "not starting a concurrent retry"
                )
            time.sleep(self.poll_seconds)

    def collect(self, period):
        result = self.status(period)
        if result["status"] == "completed":
            counts = self.content_counts(period)
            return f"Already collected {period}; verified {sum(counts.values())} published items. No new collection."

        for attempt in range(2):
            if result["status"] != "running":
                # failed/empty are retryable, never evidence of publication.
                print(f"Starting collection {period}, attempt {attempt + 1}", flush=True)
                triggered = self.request("POST", "admin/collect", week_id=period)
                if triggered.get("status") != "started":
                    raise AutomationError(f"Unexpected collection trigger response: {triggered}")
            result = self.wait_for_collection(period)
            if result["status"] == "completed":
                counts = self.content_counts(period)
                return f"Collected {period}; verified {sum(counts.values())} published items."

        raise AutomationError(f"Collection did not publish {period} after two attempts: {json.dumps(result)}")

    def newsletter(self, period):
        result = self.status(period)
        if result["status"] != "completed":
            raise AutomationError(f"Newsletter blocked: collection is not completed: {json.dumps(result)}")
        self.content_counts(period)
        result = self.request("POST", "admin/newsletter", period_id=period, wait="true")
        print(json.dumps(result, ensure_ascii=False), flush=True)
        if result.get("period_id") != period:
            raise AutomationError("Newsletter response does not match the requested period")
        sent = result.get("total_sent")
        failed = result.get("total_failed")
        skipped = result.get("skipped_already_sent")
        if any(type(value) is not int or value < 0 for value in (sent, failed, skipped)):
            raise AutomationError("Newsletter response has invalid or missing send counts")
        if failed or result.get("held_languages"):
            raise AutomationError(f"Newsletter incomplete for {period}: {json.dumps(result)}")
        if result.get("status") == "sent" and sent > 0:
            return f"Newsletter {period}: sending service accepted {sent} messages; {failed} failed."
        if result.get("status") == "skipped" and sent == 0 and skipped > 0:
            return f"Newsletter {period}: {skipped} language cohorts already sent. No new messages."
        raise AutomationError(f"Newsletter did not send {period}: {json.dumps(result)}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=("collect", "newsletter"))
    parser.add_argument("--period", required=True)
    args = parser.parse_args()
    if not re.fullmatch(r"\d{4}-(?:\d{2}-\d{2}|kw\d{2})", args.period):
        parser.error("period must be YYYY-MM-DD or YYYY-kwNN")
    base_url = os.environ.get("API_BASE_URL", "")
    api_key = os.environ.get("ADMIN_API_KEY", "")
    if not base_url or not api_key:
        parser.error("API_BASE_URL and ADMIN_API_KEY are required")
    automation = DailyAutomation(base_url, api_key)
    failed = False
    try:
        summary = getattr(automation, args.operation)(args.period)
    except AutomationError as exc:
        failed = True
        summary = str(exc)
    summary = summary.replace(api_key, "[redacted]")
    summary = re.sub(r"sk-or-v1-[A-Za-z0-9]+", "[redacted]", summary)
    print(("ERROR: " if failed else "") + summary, flush=True)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with Path(os.environ["GITHUB_STEP_SUMMARY"]).open("a") as stream:
            stream.write(f"### {args.operation}: {'FAILED' if failed else 'verified'}\n\n{summary}\n")
    if not failed and args.operation == "collect" and os.environ.get("GITHUB_OUTPUT"):
        with Path(os.environ["GITHUB_OUTPUT"]).open("a") as stream:
            stream.write("RESULT=completed\n")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
