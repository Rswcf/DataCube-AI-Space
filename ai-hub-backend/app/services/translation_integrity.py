"""Translation integrity helpers (stdlib only).

Every stored translation entry carries ``_src``: a 16-hex-char hash of the
English source text it was translated from. ``get_field`` reads only named
fields, so keys starting with ``_`` are invisible to API readers.

German text lives in the native ``<field>_de`` columns; its marker is kept at
``translations["de"]["_src"]``. The other languages live entirely in the
``translations`` JSONB column.
"""

import hashlib
import json

SRC_KEY = "_src"

# English fields whose text identifies a row and is hashed into ``_src``, per
# section kind. Each is saved verbatim from the English item (``_nn(v, "")``),
# so the hash computed from the item at translation time equals the hash
# computed later from the saved row. Status checks (``entry_is_usable``,
# ``translation_status``) look only at the first non-empty source field — a
# deliberate simplification (tips: ``content``; videos: ``title``).
SOURCE_FIELDS: dict[str, list[str]] = {
    "tech": ["content"],
    "video": ["title", "summary"],
    "tip": ["content", "tip"],
    "primary_market": ["content"],
    "secondary_market": ["content"],
    "ma": ["content"],
    "trend": ["title"],
}


def normalize_text(value) -> str:
    """None -> "", everything else -> stripped string."""
    if value is None:
        return ""
    return str(value).strip()


def identity_key(values: list) -> tuple:
    """Hashable identity used to match saved rows to the items they came from."""
    return tuple(normalize_text(v) for v in values)


def source_hash(values: list) -> str:
    """First 16 hex chars of SHA-256 over the normalized values (order matters)."""
    payload = json.dumps(list(identity_key(values)), ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def item_source_hash(item: dict, kind: str) -> str:
    """``_src`` for an English Stage-3 item of the given section kind."""
    return source_hash([item.get(field) for field in SOURCE_FIELDS[kind]])


def record_source_hash(record, kind: str) -> str:
    """``_src`` for a saved row, computed from its ``<field>_en`` columns."""
    return source_hash([getattr(record, f"{field}_en", None) for field in SOURCE_FIELDS[kind]])


def entry_is_usable(item: dict, entry, kind: str) -> bool:
    """True when ``entry`` holds real translated text for the English ``item``.

    The first non-empty source field decides: its translation must exist and
    differ from the English text.
    """
    if not isinstance(entry, dict):
        return False
    for field in SOURCE_FIELDS[kind]:
        english = normalize_text(item.get(field))
        if not english:
            continue
        localized = normalize_text(entry.get(field))
        return bool(localized) and localized != english
    return True


def is_blank(value) -> bool:
    """None, an empty or whitespace-only string, or an empty list."""
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    if isinstance(value, list):
        return len(value) == 0
    return False


def entry_is_complete(item: dict, entry, kind: str) -> bool:
    """True when ``entry`` translates the primary source text (see
    ``entry_is_usable``) and has a non-blank value for every field that is
    non-blank in the English ``item``. Incomplete entries must never be
    written over existing translations: they would drop translated fields."""
    if not entry_is_usable(item, entry, kind):
        return False
    return all(not is_blank(entry.get(field)) for field, value in item.items() if not is_blank(value))


def translation_status(record, kind: str, lang: str) -> str:
    """Classify one saved row's translation: "ok", "missing", "stale" or "untranslated".

    - missing: no entry, no ``_src`` marker, or no translated text
    - stale: ``_src`` does not match the row's current English text
    - untranslated: the translated text is identical to the English text
    """
    if lang == "en":
        return "ok"
    translations = getattr(record, "translations", None)
    entry = translations.get(lang) if isinstance(translations, dict) else None
    if not isinstance(entry, dict) or not entry.get(SRC_KEY):
        return "missing"
    if entry[SRC_KEY] != record_source_hash(record, kind):
        return "stale"
    for field in SOURCE_FIELDS[kind]:
        english = normalize_text(getattr(record, f"{field}_en", None))
        if not english:
            continue
        if lang == "de":
            localized = normalize_text(getattr(record, f"{field}_de", None))
        else:
            localized = normalize_text(entry.get(field))
        if not localized:
            return "missing"
        if localized == english:
            return "untranslated"
        return "ok"
    return "ok"


def send_gate_counts(sections: dict, lang: str) -> dict:
    """Count one language's rows by translation readiness.

    ``sections`` maps a section kind to its rows, e.g.
    ``{"tech": [...], "primary_market": [...], "ma": [...], "tip": [...]}``.
    Returns ``{"total": n, "missing": n, "stale": n, "untranslated": n}``.
    English is always ready (all zeros).
    """
    counts = {"total": 0, "missing": 0, "stale": 0, "untranslated": 0}
    if lang == "en":
        return counts
    for kind, rows in sections.items():
        for row in rows:
            counts["total"] += 1
            status = translation_status(row, kind, lang)
            if status != "ok":
                counts[status] += 1
    return counts


def gate_holds_language(counts: dict) -> bool:
    """Hold a language when any row is stale (another text's translation) or
    at least half of its rows are not ready; otherwise it is sent with English
    fallback for the few rows that are not ready."""
    not_ready = counts["missing"] + counts["untranslated"]
    return counts["stale"] > 0 or (not_ready > 0 and not_ready * 2 >= counts["total"])
