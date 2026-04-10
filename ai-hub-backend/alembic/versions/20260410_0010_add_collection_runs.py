"""Add collection_runs table for persistent collection status tracking

Revision ID: 0010
Revises: 0009
Create Date: 2026-04-10

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "collection_runs",
        sa.Column("period_id", sa.String(10), primary_key=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("stage", sa.String(20), nullable=True),
        sa.Column("started_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime, nullable=True),
        sa.Column("error", sa.String(500), nullable=True),
        sa.Column("counts", sa.JSON, nullable=True),
        sa.Column("raw_counts", sa.JSON, nullable=True),
    )


def downgrade() -> None:
    op.drop_table("collection_runs")
