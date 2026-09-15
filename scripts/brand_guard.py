#!/usr/bin/env python3
"""Fail when a legacy brand string appears outside the brand configuration (spec AD1).

Where brand identity lives:
- ai-information-hub/lib/brand-defaults.json
- ai-information-hub/lib/brand.ts
- ai-hub-backend/app/config.py

Exempt until the rebrand (R4) rewrites them: documentation, tests, promo assets and image files.
Workflows may name the legacy site only as the vars.SITE_URL fallback.

Usage:
    python3 scripts/brand_guard.py            # every tracked file
    python3 scripts/brand_guard.py PATH ...   # only these repository-relative files
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path
from typing import NamedTuple

LEGACY_BRAND = re.compile(r"data[\s_-]?cube|(?<![a-z0-9])dcai[_-]", re.IGNORECASE)
WORKFLOW_SITE_FALLBACK = re.compile(r"\$\{\{ vars\.SITE_URL \|\| 'https://www\.datacubeai\.space' \}\}")

BRAND_SOURCES = frozenset({
    "ai-information-hub/lib/brand-defaults.json",
    "ai-information-hub/lib/brand.ts",
    "ai-hub-backend/app/config.py",
})
GUARD_FILES = frozenset({"scripts/brand_guard.py", "scripts/test_brand_guard.py"})
EXEMPT_PREFIXES = ("docs/", "promo-video/", ".ai-collab/", "ai-information-hub/test/", "ai-hub-backend/tests/")
EXEMPT_SUFFIXES = (".md", ".test.ts", ".test.tsx", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp")
EXEMPT_NAMES = frozenset({"LICENSE"})


class Violation(NamedTuple):
    path: str
    line: int
    text: str


def classify(path: str) -> str:
    """The file class that decides how the guard treats a repository-relative path."""
    if path in BRAND_SOURCES:
        return "brand-source"
    if path in GUARD_FILES:
        return "guard"
    name = path.rsplit("/", 1)[-1]
    if path.startswith(EXEMPT_PREFIXES) or path.endswith(EXEMPT_SUFFIXES) or name in EXEMPT_NAMES:
        return "exempt"
    if path.startswith(".github/workflows/"):
        return "workflow"
    return "code"


def scan_text(path: str, text: str) -> list[Violation]:
    """Legacy brand occurrences in one file that its class does not allow."""
    file_class = classify(path)
    if file_class in ("brand-source", "guard", "exempt"):
        return []
    violations = []
    for number, line in enumerate(text.splitlines(), start=1):
        checked = WORKFLOW_SITE_FALLBACK.sub("", line) if file_class == "workflow" else line
        if LEGACY_BRAND.search(checked):
            violations.append(Violation(path, number, line.strip()[:160]))
    return violations


def tracked_files() -> list[str]:
    output = subprocess.run(["git", "ls-files"], capture_output=True, text=True, check=True).stdout
    return [line for line in output.splitlines() if line]


def read_text(path: str) -> str | None:
    """File content, or None for missing, binary or non-UTF-8 files."""
    try:
        data = Path(path).read_bytes()
    except (FileNotFoundError, IsADirectoryError):
        return None
    if b"\0" in data:
        return None
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return None


def main(argv: list[str] | None = None) -> int:
    paths = argv if argv is not None else sys.argv[1:]
    paths = [path[2:] if path.startswith("./") else path for path in (paths or tracked_files())]
    violations = []
    for path in paths:
        text = read_text(path)
        if text is not None:
            violations.extend(scan_text(path, text))
    for violation in violations:
        print(f"{violation.path}:{violation.line}: {violation.text}")
    if violations:
        files = len({violation.path for violation in violations})
        print(f"brand guard: {len(violations)} legacy brand string(s) in {files} file(s) outside the brand config")
        return 1
    print("brand guard: clean")
    return 0


if __name__ == "__main__":
    sys.exit(main())
