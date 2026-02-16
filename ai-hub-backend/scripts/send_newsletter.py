#!/usr/bin/env python3
"""
Newsletter sender script.

Sends daily AI news digest to all Beehiiv subscribers via Resend.
Meant to be triggered by Railway cron at 07:00 UTC (08:00 CET).

Usage:
    python -m scripts.send_newsletter
    python -m scripts.send_newsletter --date 2026-02-07
    python -m scripts.send_newsletter --week 2026-kw06
"""

import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Send daily newsletter")
    parser.add_argument(
        "--date",
        type=str,
        default=None,
        help="Date ID (YYYY-MM-DD). Default: yesterday",
    )
    parser.add_argument(
        "--week",
        type=str,
        default=None,
        help="Week ID (YYYY-kwWW)",
    )
    args = parser.parse_args()

    period_id = args.date or args.week

    logger.info("Starting newsletter sending...")

    try:
        from app.database import SessionLocal
    except ImportError:
        from app.database import get_session_local

        SessionLocal = get_session_local()
    from app.services.newsletter_sender import send_newsletter

    db = SessionLocal()
    try:
        send_newsletter(db, period_id)
        logger.info("Newsletter sent successfully!")
    except Exception as e:
        logger.error(f"Newsletter failed: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
