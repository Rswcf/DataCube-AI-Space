#!/usr/bin/env python3
"""
Database initialization script.

Creates all tables and inserts default team members.

Usage:
    python -m scripts.init_db
    python -m scripts.init_db --migrate-all  # Also migrate all JSON data
"""

import argparse
import logging
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import engine, SessionLocal, Base
from app.models import TeamMember
from app.services.migrator import migrate_weeks_json, migrate_week_data

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)


DEFAULT_TEAM_MEMBERS = [
    {
        "name": "Anna Schmidt",
        "role_de": "KI-Technologie Lead",
        "role_en": "AI Technology Lead",
        "handle": "@anna_tech",
        "avatar": "AS",
    },
    {
        "name": "Max Weber",
        "role_de": "Investment Analyst",
        "role_en": "Investment Analyst",
        "handle": "@max_invest",
        "avatar": "MW",
    },
    {
        "name": "Lisa Müller",
        "role_de": "Data Scientist",
        "role_en": "Data Scientist",
        "handle": "@lisa_data",
        "avatar": "LM",
    },
    {
        "name": "Tom Fischer",
        "role_de": "Research Lead",
        "role_en": "Research Lead",
        "handle": "@tom_research",
        "avatar": "TF",
    },
]


def create_tables():
    """Create all database tables."""
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Tables created successfully")


def insert_team_members(db):
    """Insert default team members if not present."""
    existing = db.query(TeamMember).count()
    if existing > 0:
        logger.info(f"Team members already exist ({existing}), skipping")
        return

    logger.info("Inserting default team members...")
    for member_data in DEFAULT_TEAM_MEMBERS:
        member = TeamMember(**member_data)
        db.add(member)

    db.commit()
    logger.info(f"Inserted {len(DEFAULT_TEAM_MEMBERS)} team members")


def migrate_existing_data(db, data_path: Path):
    """Migrate all existing JSON data to database."""
    logger.info("Migrating existing JSON data...")

    # First migrate weeks.json
    weeks_count = migrate_weeks_json(db, data_path)
    logger.info(f"Migrated {weeks_count} weeks from weeks.json")

    # Find all week directories
    week_dirs = sorted(
        [d for d in data_path.iterdir() if d.is_dir() and d.name.startswith("20")],
        key=lambda d: d.name,
    )

    for week_dir in week_dirs:
        week_id = week_dir.name
        try:
            counts = migrate_week_data(db, week_id, data_path)
            logger.info(f"Migrated {week_id}: {counts}")
        except FileNotFoundError:
            logger.warning(f"Skipping {week_id}: directory not found")
        except Exception as e:
            logger.error(f"Error migrating {week_id}: {e}")


def main():
    parser = argparse.ArgumentParser(description="Initialize AI Hub database")
    parser.add_argument(
        "--migrate-all",
        action="store_true",
        help="Migrate all existing JSON data to database",
    )
    parser.add_argument(
        "--data-path",
        type=str,
        default=None,
        help="Path to JSON data directory (default: ../ai-information-hub/public/data)",
    )
    args = parser.parse_args()

    # Determine data path
    if args.data_path:
        data_path = Path(args.data_path)
    else:
        data_path = Path(__file__).parent.parent.parent / "ai-information-hub" / "public" / "data"

    # Create tables
    create_tables()

    # Insert team members
    db = SessionLocal()
    try:
        insert_team_members(db)

        # Optionally migrate all data
        if args.migrate_all:
            if data_path.exists():
                migrate_existing_data(db, data_path)
            else:
                logger.warning(f"Data path not found: {data_path}")

    finally:
        db.close()

    logger.info("Database initialization complete!")


if __name__ == "__main__":
    main()
