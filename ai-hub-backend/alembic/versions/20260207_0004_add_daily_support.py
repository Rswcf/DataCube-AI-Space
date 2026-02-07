"""Add daily support fields to weeks table

Revision ID: 0004
Revises: 0003
Create Date: 2026-02-07

"""
from datetime import datetime, timedelta
from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) Add period_type for week/day records.
    op.add_column(
        "weeks",
        sa.Column(
            "period_type",
            sa.String(10),
            nullable=False,
            server_default=sa.text("'week'"),
        ),
    )

    # 2) Add sort_date for chronological ordering.
    op.add_column(
        "weeks",
        sa.Column(
            "sort_date",
            sa.Date(),
            nullable=False,
            server_default=sa.text("'2020-01-01'"),
        ),
    )

    # 3) Add parent reference for day -> week hierarchy.
    op.add_column(
        "weeks",
        sa.Column(
            "parent_week_id",
            sa.String(10),
            sa.ForeignKey("weeks.id"),
            nullable=True,
        ),
    )

    # 4) Allow week_num to be NULL for day records.
    op.alter_column("weeks", "week_num", existing_type=sa.Integer(), nullable=True)

    # 5) Backfill existing week rows.
    if not context.is_offline_mode():
        conn = op.get_bind()
        weeks = conn.execute(sa.text("SELECT id, year, week_num FROM weeks")).fetchall()
        for week in weeks:
            week_id = week._mapping["id"]
            year = week._mapping["year"]
            week_num = week._mapping["week_num"]
            jan4 = datetime(year, 1, 4)
            monday = jan4 + timedelta(weeks=week_num - 1, days=-jan4.weekday())
            conn.execute(
                sa.text(
                    "UPDATE weeks SET period_type = 'week', sort_date = :sort_date WHERE id = :id"
                ),
                {"sort_date": monday.date(), "id": week_id},
            )

    # 6) Index for sort order.
    op.create_index("ix_weeks_sort_date", "weeks", ["sort_date"], unique=False)

    # 7) Index for child lookups.
    op.create_index("ix_weeks_parent_week_id", "weeks", ["parent_week_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_weeks_parent_week_id", table_name="weeks")
    op.drop_index("ix_weeks_sort_date", table_name="weeks")
    op.drop_column("weeks", "parent_week_id")
    op.drop_column("weeks", "sort_date")
    op.drop_column("weeks", "period_type")
    op.alter_column("weeks", "week_num", existing_type=sa.Integer(), nullable=False)
