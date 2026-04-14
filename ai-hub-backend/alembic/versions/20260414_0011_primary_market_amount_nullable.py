"""Make primary_market_posts.amount_de/amount_en nullable

LLM may return null when a funding round amount is undisclosed
(e.g. SEC EDGAR 8-K unregistered equity sales, stealth rounds).
Mirrors MAPost.deal_value_de/en which became nullable in 0005.
API layer still normalizes NULL back to "N/A" for UI legibility
(app/routers/investment.py:44), so the frontend contract is unchanged.

Revision ID: 0011
Revises: 0010
Create Date: 2026-04-14
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "primary_market_posts",
        "amount_de",
        existing_type=sa.String(length=50),
        nullable=True,
    )
    op.alter_column(
        "primary_market_posts",
        "amount_en",
        existing_type=sa.String(length=50),
        nullable=True,
    )


def downgrade() -> None:
    op.execute(
        "UPDATE primary_market_posts SET amount_de = 'N/A' WHERE amount_de IS NULL"
    )
    op.execute(
        "UPDATE primary_market_posts SET amount_en = 'N/A' WHERE amount_en IS NULL"
    )
    op.alter_column(
        "primary_market_posts",
        "amount_de",
        existing_type=sa.String(length=50),
        nullable=False,
    )
    op.alter_column(
        "primary_market_posts",
        "amount_en",
        existing_type=sa.String(length=50),
        nullable=False,
    )
