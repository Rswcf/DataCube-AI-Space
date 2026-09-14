"""Every prompt that writes or translates news prose carries the AD5 faithfulness rules."""

from app.services.llm_processor import EPISTEMIC_RULES, TRANSLATION_FAITHFULNESS_RULES, LLMProcessor

ARTICLE = {
    "source": "Example News",
    "title": "Startup reportedly in talks to raise $50M",
    "link": "https://example.com/story",
    "summary": "The startup is reportedly in talks to raise $50M, according to people familiar with the matter.",
    "published": "2026-09-12",
}


def _processor(monkeypatch, response):
    processor = LLMProcessor.__new__(LLMProcessor)  # skip __init__: no API key, no client
    prompts = []

    def fake_call_llm(prompt, temperature=0.3, **kwargs):
        prompts.append(prompt)
        return response

    def fake_call_with_fallback(prompt, temperature, timeout, **kwargs):
        prompts.append(prompt)
        return response

    monkeypatch.setattr(processor, "_call_llm", fake_call_llm)
    monkeypatch.setattr(processor, "_call_with_fallback", fake_call_with_fallback)
    return processor, prompts


def test_rules_cover_every_ad5_obligation():
    rules = EPISTEMIC_RULES.lower()
    assert "hedge" in rules
    assert "attribute" in rules
    assert "declined to comment" in rules
    assert "never upgrade" in rules
    assert "hedges" in TRANSLATION_FAITHFULNESS_RULES
    assert "attribution" in TRANSLATION_FAITHFULNESS_RULES


def test_tech_prompt_carries_the_rules(monkeypatch):
    processor, prompts = _processor(monkeypatch, '{"en": []}')
    processor.process_tech_articles([ARTICLE], count=5)
    assert len(prompts) == 1
    assert EPISTEMIC_RULES in prompts[0]


def test_investment_prompt_carries_the_rules(monkeypatch):
    processor, prompts = _processor(
        monkeypatch, '{"primaryMarket": {"en": []}, "secondaryMarket": {"en": []}, "ma": {"en": []}}'
    )
    processor.process_investment_articles([ARTICLE], count=5)
    assert EPISTEMIC_RULES in prompts[0]


def test_ma_prompt_carries_the_rules(monkeypatch):
    processor, prompts = _processor(monkeypatch, '{"ma": {"en": []}}')
    processor.process_ma_articles([ARTICLE], count=5)
    assert EPISTEMIC_RULES in prompts[0]


def test_editorial_prompt_carries_the_rules(monkeypatch):
    processor, prompts = _processor(monkeypatch, '{"bullets": []}')
    processor.generate_editorial({"en": [{"impact": "high", "content": ARTICLE["summary"]}]}, {}, {})
    assert EPISTEMIC_RULES in prompts[0]


def test_translation_prompt_carries_the_rules(monkeypatch):
    processor, prompts = _processor(monkeypatch, '[{"_idx": 0, "content": "Das Startup verhandelt angeblich."}]')
    processor._try_translate_batch([{"content": ARTICLE["summary"]}], "de", ["content"], "German")
    assert TRANSLATION_FAITHFULNESS_RULES in prompts[0]
