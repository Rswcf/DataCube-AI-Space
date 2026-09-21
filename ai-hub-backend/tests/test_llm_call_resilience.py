"""Both LLM call paths reject empty, blank and truncated output and cap every call.

Background (2026-09-21 pipeline review): DeepSeek V4 Flash reasons at effort
"high" by default. In one month 55 calls reasoned until the provider's
131,072-token output limit (about 35 minutes each) and returned no visible
content. The classifier/translator path counted that empty string as success, so
on 2026-09-19 the whole day's classification silently fell back to source hints.
Classification and translation gain nothing from reasoning, so that chain now
turns it off; every call also carries an output cap and treats
finish_reason "length" as a failure.
"""

from types import SimpleNamespace

from app.services import llm_processor as lp
from app.services.llm_processor import LLMProcessor

CAP = 32768


def _response(content, finish_reason="stop"):
    message = SimpleNamespace(content=content)
    return SimpleNamespace(choices=[SimpleNamespace(message=message, finish_reason=finish_reason)])


def _no_choices():
    return SimpleNamespace(choices=[])


class _FakeCompletions:
    def __init__(self, script):
        self.script = list(script)
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return self.script.pop(0)


def _processor(monkeypatch, script):
    monkeypatch.setattr(lp.time, "sleep", lambda seconds: None)
    processor = LLMProcessor.__new__(LLMProcessor)  # skip __init__: no API key, no network
    completions = _FakeCompletions(script)
    processor.client = SimpleNamespace(chat=SimpleNamespace(completions=completions))
    return processor, completions


def _models(completions):
    return [call["model"] for call in completions.calls]


# Classifier / translator chain (_call_with_fallback)

def test_fallback_chain_tries_next_model_when_content_is_blank(monkeypatch):
    processor, completions = _processor(monkeypatch, [_response(""), _response("[1]")])
    out = processor._call_with_fallback("p", 0.1, 60, expect_json=True, models=["a", "b"])
    assert out == "[1]"
    assert _models(completions) == ["a", "b"]


def test_fallback_chain_tries_next_model_when_there_are_no_choices(monkeypatch):
    processor, completions = _processor(monkeypatch, [_no_choices(), _response("[1]")])
    out = processor._call_with_fallback("p", 0.1, 60, expect_json=True, models=["a", "b"])
    assert out == "[1]"
    assert _models(completions) == ["a", "b"]


def test_fallback_chain_tries_next_model_when_output_is_truncated(monkeypatch):
    # Truncated output is incomplete even when it parses; retrying the same model
    # would spend another capped attempt, so go straight to the next one.
    processor, completions = _processor(monkeypatch, [_response("[]", "length"), _response("[1]")])
    out = processor._call_with_fallback("p", 0.1, 60, expect_json=True, models=["a", "b"])
    assert out == "[1]"
    assert _models(completions) == ["a", "b"]


def test_fallback_chain_turns_reasoning_off_and_caps_output(monkeypatch):
    processor, completions = _processor(monkeypatch, [_response("[1]")])
    processor._call_with_fallback("p", 0.1, 60, expect_json=True, models=["a"])
    call = completions.calls[0]
    assert call["extra_body"] == {"reasoning": {"enabled": False}}
    assert call["max_tokens"] == CAP


def test_classification_runs_with_reasoning_off(monkeypatch):
    processor, completions = _processor(
        monkeypatch, [_response('[{"index": 0, "section": "tech", "relevance": 0.9, "duplicate_of": null}]')]
    )
    article = {"source": "S", "title": "T", "summary": "x", "link": "https://e.x/1",
               "published": "2026-09-20", "original_section": "tech"}
    classified = processor.classify_articles([article])
    assert classified[0]["section"] == "tech"
    assert completions.calls[0]["extra_body"] == {"reasoning": {"enabled": False}}


def test_translation_runs_with_reasoning_off(monkeypatch):
    processor, completions = _processor(monkeypatch, [_response('[{"_idx": 0, "content": "内容"}]')])
    translated = processor.translate_batch([{"content": "text"}], "zh", ["content"])
    assert translated[0]["content"] == "内容"
    assert completions.calls[0]["extra_body"] == {"reasoning": {"enabled": False}}


# Processor chain (_call_llm): reasoning stays at the provider default, output is capped

def test_processor_tries_next_model_when_output_is_truncated(monkeypatch):
    monkeypatch.setattr(LLMProcessor, "PROCESSOR_MODELS", ["a", "b"])
    processor, completions = _processor(
        monkeypatch, [_response('{"en": []}', "length"), _response('{"en": [1]}')]
    )
    assert processor._call_llm("p") == '{"en": [1]}'
    assert _models(completions) == ["a", "b"]


def test_processor_caps_output_and_keeps_reasoning(monkeypatch):
    monkeypatch.setattr(LLMProcessor, "PROCESSOR_MODELS", ["a"])
    processor, completions = _processor(monkeypatch, [_response('{"en": []}')])
    processor._call_llm("p")
    call = completions.calls[0]
    assert call["max_tokens"] == CAP
    assert "reasoning" not in (call.get("extra_body") or {})
