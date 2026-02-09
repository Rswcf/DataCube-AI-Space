"""Widen MA deal value columns to text

Revision ID: 0005
Revises: 0004
Create Date: 2026-02-09

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "ma_posts",
        "deal_value_de",
        existing_type=sa.String(length=50),
        type_=sa.Text(),
        existing_nullable=True,
    )
    op.alter_column(
        "ma_posts",
        "deal_value_en",
        existing_type=sa.String(length=50),
        type_=sa.Text(),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "ma_posts",
        "deal_value_en",
        existing_type=sa.Text(),
        type_=sa.String(length=50),
        existing_nullable=True,
    )
    op.alter_column(
        "ma_posts",
        "deal_value_de",
        existing_type=sa.Text(),
        type_=sa.String(length=50),
        existing_nullable=True,
    )
