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

# Per-currency plausibility ceilings for a SINGLE deal (F5: a flat USD cap
# applied to CNY/INR magnitudes is meaningless). Largest AI round ever is
# ~$40B; largest tech M&A ~$100B — anything far beyond is a misextraction.
_FUNDING_CAPS = {"USD": 60e9, "EUR": 60e9, "GBP": 50e9, "CHF": 60e9,
                 "CNY": 430e9, "INR": 5000e9, None: 60e9}
_MA_CAPS = {"USD": 120e9, "EUR": 120e9, "GBP": 100e9, "CHF": 120e9,
            "CNY": 860e9, "INR": 10000e9, None: 120e9}


def plausible_amount(value: Optional[int], currency: Optional[str], deal_type: str) -> bool:
    """False when a parsed amount exceeds the per-currency single-deal ceiling."""
    if value is None:
        return True
    caps = _MA_CAPS if deal_type == "ma" else _FUNDING_CAPS
    return value <= caps.get(currency, caps[None])


_NORMALIZE_RE = re.compile(r"[^a-z0-9\u4e00-\u9fff]+")


def normalize_text(text: Optional[str]) -> str:
    """Lowercase alphanumeric normalization for evidence-substring checks."""
    if not text:
        return ""
    return _NORMALIZE_RE.sub("", text.lower())


def evidence_supported(evidence: Optional[str], corpus_normalized: str) -> bool:
    """True when the evidence excerpt appears (normalized) in the raw corpus.

    Enforces the verbatim-evidence contract server-side (Codex F1): the LLM
    claims the sentence came from the articles we fed it — verify that.
    Requires a minimum of 20 normalized characters to avoid trivial matches.
    """
    norm = normalize_text(evidence)
    if len(norm) < 20:
        return False
    return norm in corpus_normalized


# Cells beginning with these characters are interpreted as formulas by
# Excel/Sheets — a classic CSV-injection vector for attacker-influenced
# strings (Codex F6).
_CSV_DANGEROUS_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def csv_safe(value) -> str:
    """Neutralize spreadsheet formula injection for one CSV cell."""
    text = "" if value is None else str(value)
    stripped = text.lstrip(" \t\r\n")
    if stripped.startswith(_CSV_DANGEROUS_PREFIXES):
        return "'" + text
    return text

