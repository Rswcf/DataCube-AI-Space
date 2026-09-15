"""Golden-file assertions: compare output with a committed file, or rewrite it with UPDATE_GOLDENS=1."""

import os
from pathlib import Path

GOLDEN_DIR = Path(__file__).resolve().parent / "goldens"


def assert_golden(name: str, text: str) -> None:
    """Fail when `text` differs from tests/goldens/<name>.

    UPDATE_GOLDENS=1 rewrites the file instead. Use it only for an intended change named in the
    plan, then review the golden diff.
    """
    path = GOLDEN_DIR / name
    if os.environ.get("UPDATE_GOLDENS") == "1":
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return
    assert path.exists(), f"missing golden {name}: run once with UPDATE_GOLDENS=1 and review the file"
    assert text == path.read_text(encoding="utf-8"), f"output differs from golden {name}"
