"""Stage 2 drops articles Jev judges not to be about AI before classification.

A dropped article stays in raw_articles with section "offtopic" (stage 3 reads
only tech, investment and tips) and keeps Jev's probability in `relevance`, so
the threshold can be re-checked later. Tips sources are never scored. Articles
Jev could not score are kept: the filter fails open.
"""

import pytest

import app.services.collector as collector
from app.models import RawArticle

PERIOD = "2026-09-20"


def _row(title, hint="tech"):
    return RawArticle(week_id=PERIOD, source="Feed", title=title, link=f"https://example.com/{title}",
                      summary=f"About {title}", published=PERIOD, original_section=hint, raw_data={})


class _Session:
    def __init__(self, rows):
        self.rows = rows

    def query(self, model):
        return self

    def filter(self, *conditions):
        return self

    def all(self):
        return self.rows

    def commit(self):
        pass


class _Classifier:
    def __init__(self, fail=False):
        self.fail = fail
        self.seen = None

    def classify_articles(self, articles):
        self.seen = [a["title"] for a in articles]
        if self.fail:
            raise RuntimeError("classifier unavailable")
        return [{"title": a["title"], "section": "investment", "relevance": 0.9} for a in articles]


def _jev(scores, enabled):
    """Stand-in for AiNewsFilter that answers from a title -> probability map."""

    class FakeFilter:
        scored = []

        def __init__(self, api_key):
            self.enabled = enabled

        def score_all(self, articles):
            FakeFilter.scored.extend(a["title"] for a in articles)
            return [scores.get(a["title"]) for a in articles]

    return FakeFilter


def _run(monkeypatch, rows, scores, enabled=True, fail=False):
    fake = _jev(scores, enabled)
    monkeypatch.setattr(collector, "AiNewsFilter", fake)
    classifier = _Classifier(fail)
    collector.stage2_classify_articles(_Session(rows), PERIOD, classifier)
    return {r.title: r for r in rows}, classifier, fake


def test_articles_below_the_threshold_are_dropped_before_classification(monkeypatch):
    rows = [_row("promo"), _row("edge"), _row("model")]
    by_title, classifier, _ = _run(monkeypatch, rows, {"promo": 0.1, "edge": 0.35, "model": 0.9})
    assert classifier.seen == ["edge", "model"]
    assert by_title["promo"].section == "offtopic"
    assert by_title["promo"].relevance == 0.1
    assert by_title["edge"].section == "investment"  # 0.35 itself is not below the threshold
    assert by_title["model"].section == "investment"


def test_tips_sources_are_never_scored(monkeypatch):
    rows = [_row("prompting guide", hint="tips"), _row("model")]
    by_title, _, fake = _run(monkeypatch, rows, {"model": 0.9})
    assert fake.scored == ["model"]
    assert by_title["prompting guide"].section == "tips"


def test_unscored_articles_are_kept(monkeypatch):
    rows = [_row("a"), _row("b")]
    _, classifier, _ = _run(monkeypatch, rows, {"a": None, "b": 0.9})
    assert classifier.seen == ["a", "b"]


def test_everything_is_classified_when_the_filter_is_off(monkeypatch):
    rows = [_row("promo"), _row("model")]
    _, classifier, fake = _run(monkeypatch, rows, {"promo": 0.1}, enabled=False)
    assert classifier.seen == ["promo", "model"]
    assert fake.scored == []


@pytest.mark.parametrize("crash_in", ["init", "score_all"])
def test_a_crashing_filter_still_classifies_every_article(monkeypatch, crash_in):
    # Whatever goes wrong inside the filter (a key httpx cannot encode, a future
    # edit), the day is classified exactly as it was before the filter existed.
    class CrashingFilter:
        def __init__(self, api_key):
            if crash_in == "init":
                raise UnicodeEncodeError("ascii", "é", 0, 1, "ordinal not in range(128)")
            self.enabled = True

        def score_all(self, articles):
            raise RuntimeError("unexpected")

    monkeypatch.setattr(collector, "AiNewsFilter", CrashingFilter)
    rows = [_row("promo"), _row("model")]
    classifier = _Classifier()
    collector.stage2_classify_articles(_Session(rows), PERIOD, classifier)
    assert classifier.seen == ["promo", "model"]
    assert [r.section for r in rows] == ["investment", "investment"]


def test_classifier_failure_keeps_the_offtopic_marks(monkeypatch):
    # The fallback files every classified article under its source hint; it must
    # not bring back an article the filter already dropped.
    rows = [_row("promo", hint="investment"), _row("model", hint="investment")]
    by_title, _, _ = _run(monkeypatch, rows, {"promo": 0.1, "model": 0.9}, fail=True)
    assert by_title["promo"].section == "offtopic"
    assert by_title["model"].section == "investment"
    assert by_title["model"].relevance == 0.5
