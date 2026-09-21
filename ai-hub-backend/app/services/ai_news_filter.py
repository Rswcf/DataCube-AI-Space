"""AI-news filter: asks TypeSafe Jev whether an article is about AI.

Background (2026-09-21 pipeline review): tech- and investment-hinted feeds carry
articles that are not about AI (event promotions, telecom rules, battery news).
The classifier still files each one under a section and stage 3 writes it up.
Stage 2 now drops an article when Jev's probability that it is AI news falls
below `ai_news_filter_threshold` (collector._drop_articles_not_about_ai).

The threshold was measured on this exact question, state shape and model version:
two days of production data, 135 articles labelled by hand, with every off-topic
article at or below 0.30 and all but 3 borderline AI articles above 0.40. Change
any of the three only after re-checking the threshold.

The filter never blocks the pipeline. An article it cannot score comes back as
None and the caller keeps it; a bad key or a rejected request stops the filter
at once; and a time budget bounds the whole run.
"""

import logging
import threading
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, wait

import httpx

logger = logging.getLogger(__name__)

API_URL = "https://api.typesafe.ai/v1/systemone"
# Pinned rather than "jev-latest": that alias moves when TypeSafe ships a release,
# and the threshold was measured on this version.
MODEL = "jev-1.13.0"
QUESTIONS = {
    "is_ai_news": {
        "type": "noul",
        "instructions": ("Is this article substantially about artificial intelligence "
                         "(AI models, AI products, AI research, AI companies or AI policy)?"),
    },
}
SUMMARY_CHARS = 300

MAX_WORKERS = 8
REQUEST_TIMEOUT_SECONDS = 15.0
BUDGET_SECONDS = 60.0  # a normal day (80-140 articles) takes about 5 seconds
RETRY_DELAY_SECONDS = 1.0
MAX_RETRY_AFTER_SECONDS = 10.0
# 401 is a bad key and 422 a rejected request body: every other request would fail the same way.
FATAL_STATUSES = {401, 422}


class AiNewsFilter:
    def __init__(self, api_key: str, *, transport: httpx.BaseTransport | None = None,
                 budget_seconds: float = BUDGET_SECONDS):
        self.api_key = api_key
        self.transport = transport
        self.budget_seconds = budget_seconds
        self._warned_model = False

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def score_all(self, articles: list[dict]) -> list[float | None]:
        """Probability that each article is AI news, in input order; None where Jev gave no answer.

        Each article is a dict with source, original_section, title and summary.
        """
        if not articles:
            return []
        deadline = time.monotonic() + self.budget_seconds
        stop = threading.Event()
        failures: list[str] = []
        client = httpx.Client(transport=self.transport, timeout=REQUEST_TIMEOUT_SECONDS,
                              headers={"Authorization": f"Bearer {self.api_key}"})
        pool = ThreadPoolExecutor(max_workers=MAX_WORKERS)
        try:
            futures = [pool.submit(self._score, client, article, deadline, stop, failures)
                       for article in articles]
            done, _ = wait(futures, timeout=self.budget_seconds)
            if len(done) < len(futures):
                stop.set()
                failures.append(f"time budget of {self.budget_seconds:g}s used up")
            scores = [f.result() if f in done else None for f in futures]
        finally:
            # Requests still in flight past the budget fail on the closed client and are discarded.
            pool.shutdown(wait=False, cancel_futures=True)
            client.close()

        unscored = scores.count(None)
        if unscored:
            reasons = ", ".join(f"{reason} x{n}" for reason, n in Counter(failures).most_common(3))
            logger.warning(f"AI-news filter: {unscored} of {len(articles)} articles unscored ({reasons})")
        return scores

    def _score(self, client: httpx.Client, article: dict, deadline: float,
               stop: threading.Event, failures: list[str]) -> float | None:
        body = {"state": _state(article), "model": MODEL, "questions": QUESTIONS}
        reason, delay = "no answer", 0.0
        for attempt in range(2):  # one retry for rate limits, overload, server and network errors
            if attempt:
                if time.monotonic() + delay >= deadline:
                    break
                time.sleep(delay)
            if stop.is_set() or time.monotonic() >= deadline:
                return None
            try:
                response = client.post(API_URL, json=body)
            except Exception as exc:  # timeouts, connection errors, a client closed by the budget
                reason, delay = type(exc).__name__, RETRY_DELAY_SECONDS
                continue
            status = response.status_code
            if status == 200:
                return self._probability(response, failures)
            reason = f"HTTP {status}"
            if status in FATAL_STATUSES:
                stop.set()
                failures.append(f"{reason} {response.text[:200]}")
                return None
            if status != 429 and status < 500:
                break
            delay = _retry_after(response)
        failures.append(reason)
        return None

    def _probability(self, response: httpx.Response, failures: list[str]) -> float | None:
        try:
            payload = response.json()
            p = float(payload["answers"]["is_ai_news"]["noul"])
        except (ValueError, KeyError, TypeError) as exc:
            failures.append(f"unreadable answer ({type(exc).__name__})")
            return None
        if not 0.0 <= p <= 1.0:
            failures.append("probability out of range")
            return None
        if payload.get("model") != MODEL and not self._warned_model:
            self._warned_model = True
            logger.warning(f"AI-news filter: answered by {payload.get('model')}, "
                           f"but the threshold was measured on {MODEL}")
        return p


def _state(article: dict) -> dict:
    return {
        "source": article.get("source") or "",
        "source_hint": article.get("original_section") or "",
        "title": article.get("title") or "",
        "summary": (article.get("summary") or "")[:SUMMARY_CHARS],
    }


def _retry_after(response: httpx.Response) -> float:
    try:
        seconds = float(response.headers.get("retry-after", ""))
    except ValueError:
        return RETRY_DELAY_SECONDS
    return min(max(seconds, 0.0), MAX_RETRY_AFTER_SECONDS)
