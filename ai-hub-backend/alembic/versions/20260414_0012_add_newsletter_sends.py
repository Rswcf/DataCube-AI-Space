"""Add newsletter_sends table for idempotent sends

One row per (period_id, language). Used to prevent duplicate newsletter
emails when workflow cron fires twice, operators re-trigger manually,
or a retry fires while the first run is still in progress.

Revision ID: 0012
Revises: 0011
Create Date: 2026-04-14
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "newsletter_sends",
        sa.Column("period_id", sa.String(20), nullable=False),
        sa.Column("language", sa.String(10), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("sent_count", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("error", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("period_id", "language"),
    )
    op.create_index(
        "ix_newsletter_sends_period",
        "newsletter_sends",
        ["period_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_newsletter_sends_period", table_name="newsletter_sends")
    op.drop_table("newsletter_sends")
