"""
Internationalization utilities for 8-language support.

Since 2026-08 (generalization to a global audience): EN is the only
natively generated language. All other 7 languages — including DE —
are translated from the EN base content in Stage 3.5. DE translations
are mirrored into the native `_de` columns (see collector
`_mirror_de_from_translations`), the other 6 live in the JSONB column.
"""

from typing import Any

# All supported language codes
SUPPORTED_LANGUAGES = ["de", "en", "zh", "fr", "es", "pt", "ja", "ko"]

# Languages that require translation from EN base content.
# "de" is first so German translations land early in the Stage 3.5 run.
TRANSLATION_LANGUAGES = ["de", "zh", "fr", "es", "pt", "ja", "ko"]

# Human-readable names for translation prompts
LANGUAGE_NAMES = {
    "de": "German",
    "zh": "Simplified Chinese",
    "fr": "French",
    "es": "Spanish",
    "pt": "Brazilian Portuguese",
    "ja": "Japanese",
    "ko": "Korean",
}

# Fields to translate per model type
TRANSLATABLE_FIELDS = {
    "tech": ["content", "category", "tags"],
    "primary_market": ["content", "amount", "valuation"],
    "secondary_market": ["content", "market_cap"],
    "ma": ["content", "deal_value", "deal_type"],
    "tip": ["content", "tip", "category", "difficulty"],
    "video": ["title", "summary"],
    "trend": ["category", "title"],
}


def get_field(post: Any, field: str, lang: str) -> Any:
    """Get a field value for the given language.

    Lookup order:
    1. Native column: post.{field}_{lang} (for DE/EN)
    2. Translations JSONB: post.translations[lang][field]
    3. Fallback to EN column: post.{field}_en
    """
    # Try native column first (works for de/en, and any future native columns)
    col_name = f"{field}_{lang}"
    native = getattr(post, col_name, None)
    if native is not None:
        return native

    # Try translations JSONB
    translations = getattr(post, "translations", None)
    if translations and isinstance(translations, dict):
        lang_data = translations.get(lang)
        if lang_data and isinstance(lang_data, dict):
            val = lang_data.get(field)
            if val is not None:
                return val

    # Fallback to English
    en_val = getattr(post, f"{field}_en", None)
    return en_val
