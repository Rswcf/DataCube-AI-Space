"""Add job_listings table for AI job board

Revision ID: 0008
Revises: 0007
Create Date: 2026-02-25

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "job_listings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("company", sa.String(200), nullable=False),
        sa.Column("location", sa.String(200), nullable=False),
        sa.Column("job_type", sa.String(50), nullable=False),
        sa.Column("level", sa.String(50), nullable=False),
        sa.Column("salary_min", sa.Integer(), nullable=True),
        sa.Column("salary_max", sa.Integer(), nullable=True),
        sa.Column("salary_currency", sa.String(10), server_default="EUR", nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("requirements", sa.Text(), nullable=True),
        sa.Column("tags", sa.ARRAY(sa.String()), nullable=True),
        sa.Column("apply_url", sa.Text(), nullable=False),
        sa.Column("company_url", sa.Text(), nullable=True),
        sa.Column("listing_type", sa.String(20), server_default="standard", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("posted_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("contact_email", sa.String(200), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_job_listings_is_active", "job_listings", ["is_active"])
    op.create_index("ix_job_listings_listing_type", "job_listings", ["listing_type"])


def downgrade() -> None:
    op.drop_index("ix_job_listings_listing_type", table_name="job_listings")
    op.drop_index("ix_job_listings_is_active", table_name="job_listings")
    op.drop_table("job_listings")
