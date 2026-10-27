"""Add regenerable source cache and per-source health; preserve existing content.

Revision ID: 0022
Revises: 0021
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0022"
down_revision = "0021"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("source_cache", sa.Column("key", sa.String(64), primary_key=True),
                    sa.Column("published_at", sa.DateTime(), nullable=False),
                    sa.Column("payload", postgresql.JSONB(), nullable=False))
    op.create_index("ix_source_cache_published_at", "source_cache", ["published_at"])
    op.create_table("source_health", sa.Column("name", sa.String(200), primary_key=True),
                    sa.Column("checked_at", sa.DateTime(), nullable=False),
                    sa.Column("report", postgresql.JSONB(), nullable=False))


def downgrade():
    op.drop_table("source_health")
    op.drop_index("ix_source_cache_published_at", "source_cache")
    op.drop_table("source_cache")
