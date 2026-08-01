"""Add editorial JSONB to weeks

The AI editorial brief is the first information-gain layer of the
generalization plan: 3-5 "why it matters" bullets per period that cite
our own data (trend momentum, cross-story connections). Stored per
language: {"en": [...], "de": [...], "zh": [...]}.

Revision ID: 0015
Revises: 0014
Create Date: 2026-08-01
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0015"
down_revision: Union[str, None] = "0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "weeks",
        sa.Column("editorial", postgresql.JSONB(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("weeks", "editorial")
