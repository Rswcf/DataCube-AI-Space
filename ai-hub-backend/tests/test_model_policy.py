from types import SimpleNamespace

import pytest

from app.services.model_policy import DEEPSEEK, OLD_DEEPSEEK, QWEN, model_chains, request_options
from app.services.llm_processor import LLMProcessor


def test_balanced_routes_cheap_tasks_and_keeps_independent_fallbacks():
    chains = model_chains("balanced")
    assert chains["processor"][:2] == [DEEPSEEK, QWEN]
    assert chains["classifier"][:2] == [DEEPSEEK, QWEN]
    assert chains["translator"][:2] == [QWEN, DEEPSEEK]
    assert chains["processor"][2:] == ["nvidia/nemotron-3.5-super-vl:free", "google/gemma-4-31b-it:free"]
    chains["classifier"].clear()
    assert chains["translator"]  # mutating one task must not erase another


def test_legacy_restores_paid_order_without_dead_endpoints():
    assert model_chains("legacy")["translator"][:2] == [OLD_DEEPSEEK, QWEN]
    with pytest.raises(ValueError):
        model_chains("typo")


def test_instance_respects_rollback_profile(monkeypatch):
    from app.services import llm_processor as lp
    monkeypatch.setattr(lp, "get_settings", lambda: SimpleNamespace(
        openrouter_api_key="test-key", llm_model_profile="legacy"))
    processor = LLMProcessor()
    assert processor.PROCESSOR_MODELS[0] == OLD_DEEPSEEK
    assert processor.TRANSLATOR_MODELS[0] == OLD_DEEPSEEK
    assert processor.client.max_retries == 0


def test_deepseek_prefers_standard_endpoint_with_bounded_provider_fallback():
    options = request_options(DEEPSEEK)
    assert options["reasoning"] == {"enabled": False}
    assert options["provider"]["order"] == ["deepinfra/fp8"]
    assert options["provider"]["allow_fallbacks"] is True
    assert options["provider"]["max_price"] == {"prompt": .15, "completion": .60}


def test_korean_uses_quality_chain_while_other_languages_stay_cheap(monkeypatch):
    processor = LLMProcessor.__new__(LLMProcessor)
    calls = []

    def complete(*args, **kwargs):
        calls.append(kwargs["models"])
        return '[{"_idx": 0, "content": "translated"}]'

    monkeypatch.setattr(processor, "_call_with_fallback", complete)
    processor.translate_batch([{"content": "private valuation"}], "ko", ["content"])
    processor.translate_batch([{"content": "private valuation"}], "fr", ["content"])
    assert calls[0] == processor.PROCESSOR_MODELS
    assert calls[1] == processor.TRANSLATOR_MODELS
