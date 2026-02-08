#!/usr/bin/env python3
"""
Data collection script (weekly mode).

Legacy script for collecting a full week of data at once.
For daily collection (used by Railway cron), see daily_collect.py.

Usage:
    python -m scripts.weekly_collect
    python -m scripts.weekly_collect --week 2025-kw05
"""

import argparse
import logging
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.services.collector import run_collection

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Data collection (weekly mode)")
    parser.add_argument(
        "--week",
        type=str,
        default=None,
        help="Week ID (e.g., 2025-kw05). Default: current week",
    )
    args = parser.parse_args()

    logger.info("Starting collection (weekly mode)...")

    db = SessionLocal()
    try:
        run_collection(db, args.week)
        logger.info("Collection completed successfully!")
    except Exception as e:
        logger.error(f"Collection failed: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
