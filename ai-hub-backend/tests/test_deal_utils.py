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
        ("$600B", (600_000_000_000, "USD")),  # R5: parser no longer caps — policy does
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



def test_amounts_in_text():
    amts = m.amounts_in_text("Acme raised $20 million at a $500 million valuation, plus €5M grant")
    values = {v for v, _ in amts}
    assert 20_000_000 in values
    assert 500_000_000 in values
    assert 5_000_000 in values
    assert m.amounts_in_text("no money here") == []
    assert m.amounts_in_text(None) == []


def test_validate_deal_figures_binding():
    article = m.normalize_text(
        "TechCrunch reports: Acme AI raised $20 million in a Series A round "
        "led by Foo Capital at a $500 million valuation."
    )
    good_ev = "Acme AI raised $20 million in a Series A round"

    # 1. Fully supported amount passes
    a_raw, a_val, cur, v_raw, ev = m.validate_deal_figures(
        "$20M", "$500M", good_ev, "funding", article)
    assert (a_raw, a_val, cur) == ("$20M", 20_000_000, "USD")
    assert v_raw is None  # valuation not in the excerpt -> withheld
    assert ev == good_ev

    # 2. Amount not mentioned in the evidence -> stripped (R1 repro case)
    a_raw, a_val, cur, v_raw, ev = m.validate_deal_figures(
        "$99M", None, good_ev, "funding", article)
    assert a_raw is None and a_val is None

    # 3. Evidence from a DIFFERENT article -> everything stripped
    a_raw, a_val, cur, v_raw, ev = m.validate_deal_figures(
        "$20M", None, "Globex bought a rocket for $20 million", "funding", article)
    assert ev is None and a_val is None

    # 4. No article resolved (bad sourceUrl) -> everything stripped
    a_raw, a_val, cur, v_raw, ev = m.validate_deal_figures(
        "$20M", None, good_ev, "funding", None)
    assert ev is None and a_val is None

    # 5. Valuation supported when the excerpt mentions it
    ev_with_val = "raised $20 million in a Series A round led by Foo Capital at a $500 million valuation"
    a_raw, a_val, cur, v_raw, ev = m.validate_deal_figures(
        "$20M", "$500M", ev_with_val, "funding", article)
    assert v_raw == "$500M"

    # 6. Implausible amount stripped even with matching evidence
    art2 = m.normalize_text("MegaFund raised $200 billion according to nobody.")
    a_raw, a_val, cur, v_raw, ev = m.validate_deal_figures(
        "$200B", None, "MegaFund raised $200 billion according to nobody", "funding", art2)
    assert a_val is None


def test_plausibility_inr():
    # R5: INR magnitudes below the INR ceiling must survive parsing
    value, cur = m.parse_amount("₹600B")
    assert (value, cur) == (600_000_000_000, "INR")
    assert m.plausible_amount(value, cur, "funding")


def test_deal_fingerprint():
    import datetime
    d1 = datetime.date(2026, 8, 1)
    d2 = datetime.date(2026, 8, 20)   # same month -> same fingerprint
    d3 = datetime.date(2026, 9, 2)
    fp = m.deal_fingerprint
    assert fp("funding", "Acme AI", "Series A", d1, 20_000_000, "USD") == \
           fp("funding", "acme ai", "series a", d2, 20_000_000, "USD")
    assert fp("funding", "Acme AI", "Series A", d1, 20_000_000, "USD") != \
           fp("funding", "Acme AI", "Series A", d3, 20_000_000, "USD")
    assert fp("funding", "Acme AI", "Series A", d1, 20_000_000, "USD") != \
           fp("funding", "Acme AI", "Series B", d1, 20_000_000, "USD")
    assert fp("funding", "Acme AI", "Series A", d1, 20_000_000, "USD") != \
           fp("ma", "Acme AI", None, d1, 20_000_000, "USD")



def test_validate_deal_figures_currency_binding():
    # Codex round-3 R1 repro: $20M must NOT be supported by "€20 million"
    article = m.normalize_text("Acme AI raised €20 million in a Series A round.")
    ev = "Acme AI raised €20 million in a Series A round"
    a_raw, a_val, cur, v_raw, _ = m.validate_deal_figures(
        "$20M", None, ev, "funding", article)
    assert a_raw is None and a_val is None and cur is None

    # Same currency passes
    a_raw, a_val, cur, _, _ = m.validate_deal_figures(
        "€20M", None, ev, "funding", article)
    assert (a_val, cur) == (20_000_000, "EUR")

    # Bare number in evidence ("20 million" without symbol) supports either
    art2 = m.normalize_text("Beta Corp secured 20 million in fresh funding.")
    ev2 = "Beta Corp secured 20 million in fresh funding"
    a_raw, a_val, cur, _, _ = m.validate_deal_figures(
        "$20M", None, ev2, "funding", art2)
    assert (a_val, cur) == (20_000_000, "USD")

    # Cross-currency valuation also fails closed
    art3 = m.normalize_text("Gamma raised $10 million at a €500 million valuation.")
    ev3 = "Gamma raised $10 million at a €500 million valuation"
    _, _, _, v_raw, _ = m.validate_deal_figures("$10M", "$500M", ev3, "funding", art3)
    assert v_raw is None
    _, _, _, v_raw, _ = m.validate_deal_figures("$10M", "€500M", ev3, "funding", art3)
    assert v_raw == "€500M"


def test_suffix_currency_binding():
    # Codex round-4 R1 repro: suffix currency codes must be captured —
    # "20 million EUR" is EUR, not a bare number, so it must NOT vouch
    # for a claimed $20M.
    assert m.amounts_in_text("Acme raised 20 million EUR in a Series A") == [
        (20_000_000, "EUR")
    ]
    art = m.normalize_text("Acme raised 20 million EUR in a Series A.")
    ev = "Acme raised 20 million EUR in a Series A"
    a_raw, a_val, cur, _, _ = m.validate_deal_figures("$20M", None, ev, "funding", art)
    assert a_raw is None and a_val is None and cur is None

    # Matching suffix code passes
    a_raw, a_val, cur, _, _ = m.validate_deal_figures("€20M", None, ev, "funding", art)
    assert (a_val, cur) == (20_000_000, "EUR")

    # GBP and USD suffix codes behave identically
    assert m.amounts_in_text("secured 20 million GBP") == [(20_000_000, "GBP")]
    assert m.amounts_in_text("secured 20 million USD") == [(20_000_000, "USD")]
    art_usd = m.normalize_text("Delta secured 20 million USD from investors.")
    ev_usd = "Delta secured 20 million USD from investors"
    _, a_val, cur, _, _ = m.validate_deal_figures("$20M", None, ev_usd, "funding", art_usd)
    assert (a_val, cur) == (20_000_000, "USD")

    # Spelled-out currency words carry their currency too
    assert m.amounts_in_text("raised 20 million euros") == [(20_000_000, "EUR")]
    assert m.amounts_in_text("raised 20 million dollars") == [(20_000_000, "USD")]
    assert m.amounts_in_text("raised 20 million pounds") == [(20_000_000, "GBP")]

    # Suffix currency on the valuation path fails closed as well
    art_v = m.normalize_text("Epsilon raised $10 million at a valuation of 500 million EUR.")
    ev_v = "Epsilon raised $10 million at a valuation of 500 million EUR"
    _, _, _, v_raw, _ = m.validate_deal_figures("$10M", "$500M", ev_v, "funding", art_v)
    assert v_raw is None
    _, _, _, v_raw, _ = m.validate_deal_figures("$10M", "€500M", ev_v, "funding", art_v)
    assert v_raw == "€500M"

    # "351M RMB" regression still holds with the suffix-aware token regex
    assert m.amounts_in_text("a 351M RMB round") == [(351_000_000, "CNY")]

    # Compact multiplier + suffix code ("20M EUR") is captured, and a bare
    # compact mention ("the 20m round") stays a bare number
    assert m.amounts_in_text("closed a 20M EUR round") == [(20_000_000, "EUR")]
    assert m.amounts_in_text("the 20m round closed") == [(20_000_000, None)]


def test_symbol_suffix_and_chf_prefix():
    # Codex round-5 R1: suffix SYMBOLS and prefix CHF must bind too.
    assert m.amounts_in_text("Acme raised 20 million € in a Series A") == [
        (20_000_000, "EUR")
    ]
    art = m.normalize_text("Acme raised 20 million € in a Series A.")
    ev = "Acme raised 20 million € in a Series A"
    a_raw, a_val, cur, _, _ = m.validate_deal_figures("$20M", None, ev, "funding", art)
    assert a_raw is None and a_val is None and cur is None
    a_raw, a_val, cur, _, _ = m.validate_deal_figures("€20M", None, ev, "funding", art)
    assert (a_val, cur) == (20_000_000, "EUR")

    # Suffix $ symbol
    assert m.amounts_in_text("secured 20 million $ from backers") == [
        (20_000_000, "USD")
    ]

    # CHF as a PREFIX indicator
    assert m.amounts_in_text("Acme raised CHF 20 million from banks") == [
        (20_000_000, "CHF")
    ]
    art_chf = m.normalize_text("Acme raised CHF 20 million from banks.")
    ev_chf = "Acme raised CHF 20 million from banks"
    a_raw, a_val, cur, _, _ = m.validate_deal_figures("$20M", None, ev_chf, "funding", art_chf)
    assert a_raw is None and a_val is None and cur is None
    a_raw, a_val, cur, _, _ = m.validate_deal_figures("CHF 20M", None, ev_chf, "funding", art_chf)
    assert (a_val, cur) == (20_000_000, "CHF")

    # CHF as a suffix code
    assert m.amounts_in_text("a round of 20 million CHF closed") == [
        (20_000_000, "CHF")
    ]


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
