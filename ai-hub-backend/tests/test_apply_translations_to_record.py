"""Writing translations onto a saved row never blanks its German columns."""

from types import SimpleNamespace

from app.services.collector import _apply_translations_to_record


def test_blank_german_values_keep_existing_columns():
    row = SimpleNamespace(
        content_de="Deutscher Text.", category_de="KI", tags_de=["KI"], translations=None,
    )

    _apply_translations_to_record(row, {
        "de": {"content": "", "category": "Forschung", "tags": [], "_src": "abc"},
        "zh": {"content": "中文。", "_src": "def"},
    })

    assert row.content_de == "Deutscher Text."
    assert row.tags_de == ["KI"]
    assert row.category_de == "Forschung"
    assert row.translations == {"de": {"_src": "abc"}, "zh": {"content": "中文。", "_src": "def"}}
