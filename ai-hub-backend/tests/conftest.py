"""Ensure the backend package root is importable when pytest collects tests."""

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
