"""Add round_category to primary_market_posts and industry to ma_posts for filtering

Revision ID: 0003
Revises: 0002
Create Date: 2025-02-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add round_category to primary_market_posts
    # Values: Early, Series A, Series B, Series C+, Late/PE, Unknown
    op.add_column(
        'primary_market_posts',
        sa.Column('round_category', sa.String(20), nullable=True)
    )

    # Add industry to ma_posts
    # Values: Healthcare, FinTech, Enterprise, Consumer, Other
    op.add_column(
        'ma_posts',
        sa.Column('industry', sa.String(20), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('ma_posts', 'industry')
    op.drop_column('primary_market_posts', 'round_category')
