#!/usr/bin/env python3
"""Cross-app parity: brand defaults and AI-label copy stay in step (final review M-4).

Two facts are each defined once per app, and only a comment ties the two copies together:
- Brand identity: ai-information-hub/lib/brand-defaults.json vs the `Settings` field
  defaults in ai-hub-backend/app/config.py.
- AI label copy (spec AD7): ai-information-hub/lib/ai-label.ts's `AI_LABEL_COPY` vs
  ai-hub-backend/app/services/newsletter_sender.py's `EMAIL_STRINGS`.

Neither app is imported: both Python sources are parsed structurally with `ast` (so this
needs no environment variables or installed dependencies), and the one TypeScript object
literal is read with a small regex scoped to its own block.

Usage:
    python3 -m unittest scripts/test_brand_parity.py
"""

from __future__ import annotations

import ast
import json
import re
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BRAND_DEFAULTS_PATH = REPO_ROOT / "ai-information-hub/lib/brand-defaults.json"
CONFIG_PATH = REPO_ROOT / "ai-hub-backend/app/config.py"
AI_LABEL_TS_PATH = REPO_ROOT / "ai-information-hub/lib/ai-label.ts"
NEWSLETTER_SENDER_PATH = REPO_ROOT / "ai-hub-backend/app/services/newsletter_sender.py"

LANGS = ["de", "en", "zh", "fr", "es", "pt", "ja", "ko"]

# frontend brand-defaults.json key -> backend Settings field name
BRAND_FIELD_PAIRS = [
    ("name", "brand_name"),
    ("shortName", "brand_short_name"),
    ("siteUrl", "site_url"),
    ("founderName", "founder_name"),
    ("githubIssuesUrl", "github_issues_url"),
]

# lib/ai-label.ts LabelCopy field -> EMAIL_STRINGS key
LABEL_FIELD_PAIRS = [
    ("label", "ai_label"),
    ("short", "ai_label_short"),
    ("link", "ai_label_link"),
]


def _settings_field_defaults(source: str) -> dict[str, object]:
    """Literal default values of the `Settings` class fields, keyed by field name.

    A field whose default isn't a literal (e.g. `api_key_prefix: str = Field(default="...", max_length=8)`)
    is skipped — this only needs the five plain-literal fields in BRAND_FIELD_PAIRS.
    """
    tree = ast.parse(source)
    for node in tree.body:
        if isinstance(node, ast.ClassDef) and node.name == "Settings":
            defaults: dict[str, object] = {}
            for item in node.body:
                is_field = isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name) and item.value is not None
                if not is_field:
                    continue
                try:
                    defaults[item.target.id] = ast.literal_eval(item.value)
                except (ValueError, TypeError):
                    continue
            return defaults
    raise AssertionError(f"no `Settings` class found in {CONFIG_PATH}")


def _module_dict_literal(source: str, name: str) -> dict[str, object]:
    """The literal dict assigned to the module-level variable `name` (plain or annotated assignment)."""
    tree = ast.parse(source)
    for node in tree.body:
        if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name) and node.target.id == name and node.value is not None:
            return ast.literal_eval(node.value)
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == name:
                    return ast.literal_eval(node.value)
    raise AssertionError(f"no module-level `{name} = ...` assignment found")


def _quoted(field: str, line: str) -> str | None:
    """The text inside a `{field}: '...'` or `{field}: "..."` pair on one line, or None if absent."""
    match = re.search(field + r":\s*'([^']*)'", line)
    if match:
        return match.group(1)
    match = re.search(field + r':\s*"([^"]*)"', line)
    return match.group(1) if match else None


def _ai_label_copy(source: str) -> dict[str, dict[str, str]]:
    """Parse `AI_LABEL_COPY`: one `{lang}: { label: ..., short: ..., link: ... }` line per language.

    Most values are single-quoted; a `link` value that itself contains an apostrophe (French:
    "Notre usage de l'IA") is written double-quoted instead — `_quoted` tries single, then double.
    """
    start = source.index("AI_LABEL_COPY")
    end = source.index("\n}", start)
    block = source[start:end]
    copy: dict[str, dict[str, str]] = {}
    for line in block.splitlines():
        stripped = line.strip()
        head = re.match(r"^(\w{2}):\s*\{", stripped)
        if not head or head.group(1) not in LANGS:
            continue
        lang = head.group(1)
        fields: dict[str, str] = {}
        for field in ("label", "short", "link"):
            value = _quoted(field, stripped)
            if value is None:
                raise AssertionError(f"could not find field {field!r} for language {lang!r} in: {stripped!r}")
            fields[field] = value
        copy[lang] = fields
    missing = [lang for lang in LANGS if lang not in copy]
    if missing:
        raise AssertionError(f"AI_LABEL_COPY is missing language(s): {missing}")
    return copy


class BrandDefaultsParityTest(unittest.TestCase):
    """Spec AD1: a rename changes the brand config, never scattered literals — both apps' configs must agree."""

    def test_frontend_and_backend_brand_defaults_agree(self):
        frontend = json.loads(BRAND_DEFAULTS_PATH.read_text(encoding="utf-8"))
        backend = _settings_field_defaults(CONFIG_PATH.read_text(encoding="utf-8"))
        for frontend_key, backend_key in BRAND_FIELD_PAIRS:
            self.assertIn(frontend_key, frontend, f"brand-defaults.json is missing {frontend_key!r}")
            self.assertIn(backend_key, backend, f"config.py Settings is missing {backend_key!r}")
            self.assertEqual(
                frontend[frontend_key],
                backend[backend_key],
                f"{frontend_key} (brand-defaults.json) != {backend_key} (config.py Settings): "
                f"{frontend[frontend_key]!r} != {backend[backend_key]!r}",
            )


class AiLabelCopyParityTest(unittest.TestCase):
    """Spec AD7: the site's label copy (lib/ai-label.ts) and the email copy (EMAIL_STRINGS) must read as one voice."""

    def test_frontend_and_backend_label_copy_agree_in_every_language(self):
        frontend = _ai_label_copy(AI_LABEL_TS_PATH.read_text(encoding="utf-8"))
        backend = _module_dict_literal(NEWSLETTER_SENDER_PATH.read_text(encoding="utf-8"), "EMAIL_STRINGS")
        for lang in LANGS:
            self.assertIn(lang, backend, f"EMAIL_STRINGS is missing language {lang!r}")
            for ts_field, email_key in LABEL_FIELD_PAIRS:
                self.assertIn(email_key, backend[lang], f"EMAIL_STRINGS[{lang!r}] is missing {email_key!r}")
                self.assertEqual(
                    frontend[lang][ts_field],
                    backend[lang][email_key],
                    f"{lang}.{ts_field} (ai-label.ts) != {lang}.{email_key} (EMAIL_STRINGS): "
                    f"{frontend[lang][ts_field]!r} != {backend[lang][email_key]!r}",
                )


if __name__ == "__main__":
    unittest.main()
