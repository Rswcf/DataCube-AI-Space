"""Add developer API keys table

Revision ID: 0007
Revises: 0006
Create Date: 2026-02-25

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "api_keys",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("api_key", sa.String(40), nullable=False),
        sa.Column("tier", sa.String(20), server_default="free", nullable=False),
        sa.Column("calls_today", sa.Integer(), server_default="0", nullable=False),
        sa.Column("calls_total", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_api_keys_api_key", "api_keys", ["api_key"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_api_keys_api_key", table_name="api_keys")
    op.drop_table("api_keys")
