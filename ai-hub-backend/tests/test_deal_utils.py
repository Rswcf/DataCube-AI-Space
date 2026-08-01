"""Unit tests for the deals normalization helpers.

deal_utils is deliberately stdlib-only so this suite runs anywhere:
    python3 tests/test_deal_utils.py
"""

import importlib.util
import pathlib
import sys

_spec = importlib.util.spec_from_file_location(
    "deal_utils", pathlib.Path(__file__).parent.parent / "app/services/deal_utils.py"
)
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)


def test_parse_amount():
    cases = [
        ("$50M", (50_000_000, "USD")),
        ("$2.75B", (2_750_000_000, "USD")),
        ("€1,2 Mrd.", (1_200_000_000, "EUR")),
        ("$50 Mio.", (50_000_000, "USD")),
        ("US$3.5 billion", (3_500_000_000, "USD")),
        ("351M RMB", (351_000_000, "CNY")),  # regression: currency-code 'B'
        ("500M CNY", (500_000_000, "CNY")),
        ("$400B", (400_000_000_000, "USD")),
        ("$600B", (None, "USD")),            # parser hard cap
        ("1,200 million", (1_200_000_000, None)),
        ("undisclosed", (None, None)),
        ("$3", (None, "USD")),
        ("5亿元", (500_000_000, "CNY")),
        ("£25m", (25_000_000, "GBP")),
        ("", (None, None)),
        (None, (None, None)),
    ]
    for raw, want in cases:
        assert m.parse_amount(raw) == want, f"{raw!r} -> {m.parse_amount(raw)} != {want}"


def test_plausible_amount():
    assert m.plausible_amount(40_000_000_000, "USD", "funding")
    assert not m.plausible_amount(122_000_000_000, "USD", "funding")
    assert m.plausible_amount(110_000_000_000, "USD", "ma")
    assert not m.plausible_amount(150_000_000_000, "USD", "ma")
    # CNY magnitudes get CNY ceilings, not USD ones
    assert m.plausible_amount(150_000_000_000, "CNY", "funding")
    assert not m.plausible_amount(500_000_000_000, "CNY", "funding")
    assert m.plausible_amount(None, None, "funding")


def test_evidence_supported():
    corpus = m.normalize_text(
        "Tel Aviv-based Bloom Security, which develops endpoint tools, "
        "raised $20 million in a Series A round led by Insight Partners."
    )
    assert m.evidence_supported(
        "Bloom Security, which develops endpoint tools, raised $20 million", corpus
    )
    assert not m.evidence_supported("Acme Corp raised $999 million from nobody", corpus)
    assert not m.evidence_supported("too short", corpus)
    assert not m.evidence_supported(None, corpus)


def test_csv_safe():
    assert m.csv_safe("=SUM(A1:A9)") == "'=SUM(A1:A9)"
    assert m.csv_safe("+1-555") == "'+1-555"
    assert m.csv_safe("@handle") == "'@handle"
    assert m.csv_safe("  =cmd") == "'  =cmd"
    assert m.csv_safe("-$5M round") == "'-$5M round"
    assert m.csv_safe("OpenAI") == "OpenAI"
    assert m.csv_safe(None) == ""
    assert m.csv_safe(123) == "123"


def test_normalize_company():
    assert m.normalize_company("  OpenAI  Inc ") == "OpenAI Inc"
    assert m.normalize_company("Undisclosed") is None
    assert m.normalize_company("Unbekannt") is None
    assert m.normalize_company("-") is None
    assert m.normalize_company(None) is None


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except AssertionError as e:
                failures += 1
                print(f"FAIL {name}: {e}")
    sys.exit(1 if failures else 0)
