"""Unit tests for translation integrity helpers (stdlib only)."""

import importlib.util
import pathlib
from types import SimpleNamespace

_spec = importlib.util.spec_from_file_location(
    "translation_integrity",
    pathlib.Path(__file__).parent.parent / "app/services/translation_integrity.py",
)
ti = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ti)


def _tech_row(content_en="OpenAI released a model.",
              content_de="OpenAI hat ein Modell veröffentlicht.", translations=None):
    return SimpleNamespace(content_en=content_en, content_de=content_de, translations=translations)


def _stamped(row, kind="tech", **langs):
    src = ti.record_source_hash(row, kind)
    row.translations = {lang: {**fields, ti.SRC_KEY: src} for lang, fields in langs.items()}
    return row


def test_source_hash_is_stable_and_normalized():
    assert ti.source_hash(["  Hello  "]) == ti.source_hash(["Hello"])
    assert ti.source_hash([None]) == ti.source_hash([""])
    assert len(ti.source_hash(["Hello"])) == 16
    assert ti.source_hash(["a", "b"]) != ti.source_hash(["b", "a"])


def test_item_and_record_hash_agree():
    item = {"content": "Tip body.", "tip": "Use X."}
    row = SimpleNamespace(content_en="Tip body.", tip_en="Use X.")
    assert ti.item_source_hash(item, "tip") == ti.record_source_hash(row, "tip")


def test_identity_key_normalizes():
    assert ti.identity_key([" a ", None]) == ("a", "")


def test_entry_is_usable():
    item = {"content": "OpenAI released a model."}
    assert ti.entry_is_usable(item, {"content": "OpenAI 发布了模型。"}, "tech")
    assert not ti.entry_is_usable(item, {"content": "OpenAI released a model."}, "tech")
    assert not ti.entry_is_usable(item, {}, "tech")
    assert not ti.entry_is_usable(item, None, "tech")


def test_status_en_is_always_ok():
    assert ti.translation_status(_tech_row(), "tech", "en") == "ok"


def test_status_ok_for_de_and_zh():
    row = _stamped(_tech_row(), de={}, zh={"content": "OpenAI 发布了模型。"})
    assert ti.translation_status(row, "tech", "de") == "ok"
    assert ti.translation_status(row, "tech", "zh") == "ok"


def test_status_missing_without_entry_or_marker():
    row = _tech_row(translations={"zh": {"content": "OpenAI 发布了模型。"}})
    assert ti.translation_status(row, "tech", "zh") == "missing"
    assert ti.translation_status(row, "tech", "fr") == "missing"


def test_status_stale_when_english_changed():
    row = _stamped(_tech_row(), zh={"content": "OpenAI 发布了模型。"})
    row.content_en = "A different story entirely."
    assert ti.translation_status(row, "tech", "zh") == "stale"


def test_status_untranslated_when_identical_to_english():
    row = _stamped(_tech_row(content_de="OpenAI released a model."),
                   de={}, zh={"content": "OpenAI released a model."})
    assert ti.translation_status(row, "tech", "de") == "untranslated"
    assert ti.translation_status(row, "tech", "zh") == "untranslated"


def test_send_gate_counts():
    good = _stamped(_tech_row(), zh={"content": "OpenAI 发布了模型。"})
    legacy = _tech_row(translations={"zh": {"content": "旧译文"}})
    assert ti.send_gate_counts({"tech": [good, legacy]}, "zh") == {
        "total": 2, "missing": 1, "stale": 0, "untranslated": 0,
    }
    assert ti.send_gate_counts({"tech": [legacy]}, "en") == {
        "total": 0, "missing": 0, "stale": 0, "untranslated": 0,
    }


def test_gate_holds_language():
    assert ti.gate_holds_language({"total": 10, "missing": 0, "stale": 1, "untranslated": 0})
    assert ti.gate_holds_language({"total": 4, "missing": 1, "stale": 0, "untranslated": 1})
    assert ti.gate_holds_language({"total": 1, "missing": 1, "stale": 0, "untranslated": 0})
    assert not ti.gate_holds_language({"total": 10, "missing": 1, "stale": 0, "untranslated": 1})
    assert not ti.gate_holds_language({"total": 0, "missing": 0, "stale": 0, "untranslated": 0})


def test_entry_is_complete():
    item = {"content": "Acme raised $20M.", "category": "Funding", "tags": ["AI"], "amount": None}
    good = {"content": "Acme hat 20 Mio. $ eingesammelt.", "category": "Finanzierung", "tags": ["KI"]}
    assert ti.entry_is_complete(item, good, "tech")
    assert not ti.entry_is_complete(item, {**good, "category": ""}, "tech")
    assert not ti.entry_is_complete(item, {"content": good["content"], "tags": ["KI"]}, "tech")
    assert not ti.entry_is_complete(item, {**good, "tags": []}, "tech")
    assert not ti.entry_is_complete(item, {**good, "content": item["content"]}, "tech")
    assert not ti.entry_is_complete(item, None, "tech")
