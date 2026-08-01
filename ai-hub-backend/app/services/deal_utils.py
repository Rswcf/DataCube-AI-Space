"""
Deterministic normalization helpers for the deals layer.

Design rule (Codex challenge C2/C3): we normalize what can be normalized
mechanically and keep the raw string alongside. We do NOT convert between
currencies with made-up FX rates — `amount_value` is the numeric value in
its own `currency`, and consumers sort on it knowing most AI deals are USD.
Unparseable amounts stay None (never guessed).
"""

import re
from datetime import date, datetime
from typing import Optional

# Currency detection, longest indicators first.
_CURRENCY_PATTERNS = [
    (r"US\$|USD|\$", "USD"),
    (r"€|EUR", "EUR"),
    (r"£|GBP", "GBP"),
    (r"¥|RMB|CNY|元", "CNY"),
    (r"₹|INR", "INR"),
    (r"CHF", "CHF"),
]

# Multiplier tokens (EN + DE + ZH), longest first to avoid prefix clashes.
_MULTIPLIERS = [
    (r"billions?|bn\.?|mrd\.?|milliarden?|십억", 1_000_000_000),
    (r"millions?|mio\.?|mn\.?|millionen?|백만", 1_000_000),
    (r"thousands?|tsd\.?|k\b", 1_000),
    (r"亿", 100_000_000),
    (r"万", 10_000),
    (r"b\b", 1_000_000_000),
    (r"m\b", 1_000_000),
]


def parse_amount(raw: Optional[str]) -> tuple[Optional[int], Optional[str]]:
    """Parse a free-form amount string into (numeric value, currency code).

    Examples: "$50M" -> (50_000_000, "USD"); "€1.2 billion" -> (1_200_000_000,
    "EUR"); "$50 Mio." -> (50_000_000, "USD"); "undisclosed" -> (None, None).
    Returns (None, None) whenever parsing is not unambiguous.
    """
    if not raw or not isinstance(raw, str):
        return None, None
    text = raw.strip()
    if not text or text.lower() in {"n/a", "na", "undisclosed", "unknown", "-", "none", "null"}:
        return None, None

    currency = None
    for pattern, code in _CURRENCY_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            currency = code
            break

    # Number: supports "1.2", "1,2" (German decimal), "1,200" (thousands sep).
    num_match = re.search(r"(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)", text)
    if not num_match:
        return None, currency
    num_str = num_match.group(1)

    # Disambiguate separators: "1,200" -> 1200; "1,2" -> 1.2; "2.75" -> 2.75.
    if re.fullmatch(r"\d{1,3}(?:[.,]\d{3})+", num_str):
        number = float(num_str.replace(",", "").replace(".", ""))
    else:
        number = float(num_str.replace(",", "."))

    multiplier = 1
    tail = text[num_match.end():]
    # Anchor the multiplier token at the START of the tail — otherwise the
    # trailing 'B' of a currency code like "RMB" matches the billion token
    # ("351M RMB" must be 351e6, not 351e9).
    for pattern, value in _MULTIPLIERS:
        if re.match(rf"\s*(?:{pattern})", tail, re.IGNORECASE):
            multiplier = value
            break

    value = int(round(number * multiplier))
    # Bare small numbers without a multiplier are almost never real deal
    # sizes ("raised 3" is noise, "$3" is noise) — refuse to guess.
    if multiplier == 1 and value < 10_000:
        return None, currency
    # Plausibility cap: no single AI deal is anywhere near $500B — values
    # that large are macro-report numbers misread as deals. Refuse.
    if value > 500_000_000_000:
        return None, currency
    return value, currency


def parse_announced_date(raw: Optional[str]) -> Optional[date]:
    """Parse an item timestamp ('YYYY-MM-DD' or ISO datetime) into a date."""
    if not raw or not isinstance(raw, str):
        return None
    text = raw.strip()[:10]
    try:
        return datetime.strptime(text, "%Y-%m-%d").date()
    except ValueError:
        return None


# Placeholder "company names" the old pipeline emitted when sources didn't
# name a party. These must never become Deal rows (Codex C2/C3 discipline).
_PLACEHOLDER_NAMES = {
    "undisclosed", "unknown", "unbekannt", "nicht bekannt", "n/a", "na",
    "none", "null", "various", "multiple", "tbd", "not disclosed",
    "未披露", "不明", "keine angabe", "unnamed", "-", "—",
}


def normalize_company(name: Optional[str]) -> Optional[str]:
    """Canonicalize for dedupe: trim, collapse whitespace, reject placeholders."""
    if not name or not isinstance(name, str):
        return None
    cleaned = " ".join(name.split()).strip()
    if len(cleaned) < 2 or cleaned.lower() in _PLACEHOLDER_NAMES:
        return None
    return cleaned or None
