#!/usr/bin/env python3
"""
Daily data collection script.

Called by Railway cron to collect daily AI news data.

Usage:
    python -m scripts.daily_collect
    python -m scripts.daily_collect --date 2026-02-07
    python -m scripts.daily_collect --week 2026-kw06  # backward compat
"""

import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Daily data collection")
    parser.add_argument(
        "--date",
        type=str,
        default=None,
        help="Date ID (YYYY-MM-DD). Default: today",
    )
    parser.add_argument(
        "--week",
        type=str,
        default=None,
        help="Week ID (YYYY-kwWW) for backward compatibility",
    )
    args = parser.parse_args()

    period_id = args.date or args.week  # --date takes precedence

    logger.info("Starting daily collection...")

    try:
        from app.database import SessionLocal
    except ImportError:
        from app.database import get_session_local

        SessionLocal = get_session_local()
    from app.services.collector import run_collection

    db = SessionLocal()
    try:
        run_collection(db, period_id)  # defaults to current_day_id() if None
        logger.info("Collection completed successfully!")
    except Exception as e:
        logger.error(f"Collection failed: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
