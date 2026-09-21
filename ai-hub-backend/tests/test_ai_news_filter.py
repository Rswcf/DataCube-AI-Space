"""The AI-news filter asks TypeSafe Jev whether each article is about AI.

Background (2026-09-21 pipeline review): tech- and investment-hinted feeds carry
articles that are not about AI (event promotions, telecom rules, battery news).
The classifier still files each one under a section and stage 3 writes it up.
On two days of production data (135 articles, labelled by hand before any output
was read), Jev put all 21 off-topic articles at or below 0.30 and all but 3
borderline AI articles above 0.40.

That threshold holds only for the question, state shape and model version it was
measured on, so these tests pin all three. The filter must never stall or break
the pipeline: any failure leaves the article unscored, and the caller keeps it.
"""

import json
import logging
import threading
import time

import httpx
import pytest

from app.services import ai_news_filter as anf
from app.services.ai_news_filter import AiNewsFilter

QUESTION = ("Is this article substantially about artificial intelligence "
            "(AI models, AI products, AI research, AI companies or AI policy)?")


def _article(title="Title", summary="Summary", source="TechCrunch AI", hint="tech"):
    return {"source": source, "original_section": hint, "title": title, "summary": summary}


def _answer(p, model="jev-1.13.0"):
    return httpx.Response(200, json={
        "model": model,
        "answers": {"is_ai_news": {"type": "noul", "noul": p}},
        "usage": {"input_tokens": 300, "output_tokens": 20},
    })


class _Api:
    """Fake TypeSafe endpoint: records every request and answers from the request body."""

    def __init__(self, respond):
        self.respond = respond
        self.requests = []
        self.lock = threading.Lock()

    def __call__(self, request):
        body = json.loads(request.content)
        with self.lock:
            self.requests.append((request, body))
        return self.respond(body)


def _filter(respond, **kwargs):
    api = _Api(respond)
    return AiNewsFilter("ts-key", transport=httpx.MockTransport(api), **kwargs), api


@pytest.fixture(autouse=True)
def _no_backoff(monkeypatch):
    monkeypatch.setattr(anf.time, "sleep", lambda seconds: None)


def test_filter_is_off_without_a_key():
    assert AiNewsFilter("").enabled is False
    assert AiNewsFilter("ts-key").enabled is True


def test_whitespace_around_the_key_is_ignored():
    # A key pasted with a trailing newline would otherwise fail every request.
    assert AiNewsFilter(" \n").enabled is False
    api = _Api(lambda body: _answer(0.9))
    AiNewsFilter(" ts-key\n", transport=httpx.MockTransport(api)).score_all([_article()])
    assert api.requests[0][0].headers["authorization"] == "Bearer ts-key"


def test_request_pins_the_calibrated_model_question_and_state():
    ai_filter, api = _filter(lambda body: _answer(0.9))
    ai_filter.score_all([_article(title="T", summary="x" * 500, source="QbitAI", hint="investment")])
    request, body = api.requests[0]
    assert str(request.url) == "https://api.typesafe.ai/v1/systemone"
    assert request.headers["authorization"] == "Bearer ts-key"
    assert body["model"] == "jev-1.13.0"
    assert body["questions"] == {"is_ai_news": {"type": "noul", "instructions": QUESTION}}
    assert body["state"] == {"source": "QbitAI", "source_hint": "investment", "title": "T", "summary": "x" * 300}


def test_missing_summary_is_sent_as_empty_text():
    ai_filter, api = _filter(lambda body: _answer(0.9))
    ai_filter.score_all([_article(summary=None)])
    assert api.requests[0][1]["state"]["summary"] == ""


def test_scores_come_back_in_article_order():
    scores = {"a": 0.1, "b": 0.9, "c": 0.5}
    ai_filter, _ = _filter(lambda body: _answer(scores[body["state"]["title"]]))
    assert ai_filter.score_all([_article(t) for t in "abc"]) == [0.1, 0.9, 0.5]


@pytest.mark.parametrize("status", [429, 529, 500, 503])
def test_transient_error_is_retried_once(status):
    replies = {}

    def respond(body):
        title = body["state"]["title"]
        replies[title] = replies.get(title, 0) + 1
        return httpx.Response(status) if replies[title] == 1 else _answer(0.8)

    ai_filter, api = _filter(respond)
    assert ai_filter.score_all([_article("a")]) == [0.8]
    assert len(api.requests) == 2


def test_article_stays_unscored_when_the_retry_fails_too():
    ai_filter, api = _filter(lambda body: httpx.Response(529))
    assert ai_filter.score_all([_article("a")]) == [None]
    assert len(api.requests) == 2


def test_network_error_leaves_the_article_unscored():
    def respond(body):
        raise httpx.ConnectTimeout("no route to host")

    ai_filter, api = _filter(respond)
    assert ai_filter.score_all([_article("a")]) == [None]
    assert len(api.requests) == 2


def test_one_failure_does_not_affect_other_articles():
    def respond(body):
        return httpx.Response(400) if body["state"]["title"] == "b" else _answer(0.7)

    ai_filter, _ = _filter(respond)
    assert ai_filter.score_all([_article(t) for t in "abc"]) == [0.7, None, 0.7]


@pytest.mark.parametrize("payload", [
    {},
    {"answers": {}},
    {"answers": {"is_ai_news": {"type": "noul"}}},
    {"answers": {"is_ai_news": {"type": "noul", "noul": "high"}}},
    {"answers": {"is_ai_news": {"type": "noul", "noul": 1.7}}},
])
def test_malformed_answer_leaves_the_article_unscored(payload):
    ai_filter, _ = _filter(lambda body: httpx.Response(200, json=payload))
    assert ai_filter.score_all([_article("a")]) == [None]


@pytest.mark.parametrize("status", [401, 422])
def test_bad_key_or_bad_request_stops_the_filter(status):
    # Every further request would fail the same way: stop instead of sending the rest.
    ai_filter, api = _filter(lambda body: httpx.Response(status))
    assert ai_filter.score_all([_article(str(i)) for i in range(40)]) == [None] * 40
    assert len(api.requests) <= anf.MAX_WORKERS


def test_time_budget_bounds_the_whole_filter():
    # A hanging API must not stall the collection: past the budget, every article
    # not yet scored comes back unscored and no further requests go out.
    def respond(body):
        threading.Event().wait(0.5)
        return _answer(0.9)

    ai_filter, api = _filter(respond, budget_seconds=0.2)
    started = time.monotonic()
    scores = ai_filter.score_all([_article(str(i)) for i in range(40)])
    assert time.monotonic() - started < 0.45
    assert scores == [None] * 40
    sent = len(api.requests)
    threading.Event().wait(0.7)
    assert len(api.requests) == sent


def test_an_unexpected_model_version_is_logged(caplog):
    ai_filter, _ = _filter(lambda body: _answer(0.9, model="jev-1.14.0"))
    with caplog.at_level(logging.WARNING, logger=anf.__name__):
        assert ai_filter.score_all([_article("a")]) == [0.9]
    assert "jev-1.14.0" in caplog.text
