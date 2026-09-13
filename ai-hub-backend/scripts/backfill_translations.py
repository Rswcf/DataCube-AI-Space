#!/usr/bin/env python3
"""
Repair translations for existing content.

CLI wrapper around app.services.translation_backfill (same logic as
POST /api/admin/backfill-translations). Export a DATABASE_URL first.

Usage:
    python -m scripts.backfill_translations                          # all periods
    python -m scripts.backfill_translations --period 2026-09-12      # one period
    python -m scripts.backfill_translations --since 2026-08-01       # daily periods from a date
    python -m scripts.backfill_translations --since 2026-08-01 --cheap       # repair with the cheap chain
    python -m scripts.backfill_translations --since 2026-08-01 --dry-run
"""

import argparse
import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


def main():
    parser = argparse.ArgumentParser(description="Repair translations for existing content")
    parser.add_argument("--period", default=None, help="Single period id, e.g. 2026-09-12")
    parser.add_argument("--since", default=None, help="All daily periods on/after YYYY-MM-DD")
    parser.add_argument(
        "--force", action="store_true",
        help="Also re-translate rows that are already ok (not needed for repairs)",
    )
    parser.add_argument("--cheap", action="store_true", help="Use the cheapest translator chain")
    parser.add_argument("--dry-run", action="store_true", help="Only print what would be translated")
    args = parser.parse_args()

    from app.database import get_session_local
    from app.services.translation_backfill import backfill_periods, resolve_periods, summarize_periods

    db = get_session_local()()
    try:
        period_ids = resolve_periods(db, args.period, args.since)
        if args.dry_run:
            print(json.dumps(summarize_periods(db, period_ids, args.force), indent=2))
            return
        report = backfill_periods(db, period_ids, force=args.force, cheap=args.cheap)
        print(json.dumps(report, indent=2))
    finally:
        db.close()


if __name__ == "__main__":
    main()
