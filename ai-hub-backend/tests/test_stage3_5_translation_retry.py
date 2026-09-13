"""Stage 3.5 retries item/language pairs that came back empty or untranslated."""

import app.services.collector as collector
from app.services.i18n_utils import TRANSLATION_LANGUAGES


def _results():
    return {"tech": {"en": [
        {"content": f"Story {i} about AI.", "category": "AI", "tags": ["AI"]} for i in range(4)
    ]}}


class FlakyKoreanTranslator:
    """Returns nothing for Korean on the first (batch_size=10) pass."""

    calls: list = []

    def translate_batch(self, items, target_lang, fields, batch_size=10, models=None):
        FlakyKoreanTranslator.calls.append((target_lang, len(items), batch_size))
        if target_lang == "ko" and batch_size == 10:
            return [{} for _ in items]
        return [
            {field: f"[{target_lang}] {item[field]}" for field in fields if isinstance(item.get(field), str)}
            for item in items
        ]


class NeverKoreanTranslator:
    """Korean always comes back identical to English."""

    def translate_batch(self, items, target_lang, fields, batch_size=10, models=None):
        if target_lang == "ko":
            return [{"content": item["content"]} for item in items]
        return [{"content": f"[{target_lang}] {item['content']}"} for item in items]


def test_retry_fills_a_failed_language(monkeypatch):
    FlakyKoreanTranslator.calls = []
    monkeypatch.setattr(collector, "LLMProcessor", FlakyKoreanTranslator)
    results = _results()

    collector.stage3_5_translate_content(results)

    for item in results["tech"]["en"]:
        for lang in TRANSLATION_LANGUAGES:
            assert item["_translations"][lang]["content"] == f"[{lang}] {item['content']}"
            assert len(item["_translations"][lang]["_src"]) == 16
    assert ("ko", 4, 3) in FlakyKoreanTranslator.calls
    assert results["_translation_gaps"] == 0


def test_unfixable_language_is_counted(monkeypatch):
    monkeypatch.setattr(collector, "LLMProcessor", NeverKoreanTranslator)
    results = _results()

    collector.stage3_5_translate_content(results)

    assert results["_translation_gaps"] == 4
    assert results["tech"]["de"][0]["content"] == "[de] Story 0 about AI."
