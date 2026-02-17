"""Add translations JSONB column for multilingual support

Revision ID: 0006
Revises: 0005
Create Date: 2026-02-17

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# All tables that get the translations column
TABLES = [
    "tech_posts",
    "primary_market_posts",
    "secondary_market_posts",
    "ma_posts",
    "tip_posts",
    "videos",
    "trends",
]


def upgrade() -> None:
    for table in TABLES:
        op.add_column(table, sa.Column("translations", JSONB, nullable=True))


def downgrade() -> None:
    for table in TABLES:
        op.drop_column(table, "translations")
