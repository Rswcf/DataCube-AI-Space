"""Add raw_articles and raw_videos tables for two-stage processing

Revision ID: 0002
Revises: 0001
Create Date: 2025-02-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create raw_articles table
    op.create_table(
        'raw_articles',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('week_id', sa.String(10), sa.ForeignKey('weeks.id'), nullable=False, index=True),
        sa.Column('source', sa.String(200), nullable=False),
        sa.Column('title', sa.Text, nullable=False),
        sa.Column('link', sa.Text, nullable=False),
        sa.Column('summary', sa.Text, nullable=False),
        sa.Column('published', sa.String(30), nullable=False),
        sa.Column('original_section', sa.String(20), nullable=False),
        sa.Column('section', sa.String(20), nullable=True),
        sa.Column('relevance', sa.Float, nullable=True),
        sa.Column('raw_data', postgresql.JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
    )

    # Create raw_videos table
    op.create_table(
        'raw_videos',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('week_id', sa.String(10), sa.ForeignKey('weeks.id'), nullable=False, index=True),
        sa.Column('video_id', sa.String(20), nullable=False, index=True),
        sa.Column('title', sa.Text, nullable=False),
        sa.Column('channel_name', sa.String(200), nullable=False),
        sa.Column('channel_id', sa.String(50), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('transcript', sa.Text, nullable=True),
        sa.Column('thumbnail_url', sa.Text, nullable=True),
        sa.Column('published_at', sa.String(30), nullable=True),
        sa.Column('duration_seconds', sa.Integer, nullable=True),
        sa.Column('duration_formatted', sa.String(20), nullable=True),
        sa.Column('view_count', sa.Integer, nullable=True),
        sa.Column('like_count', sa.Integer, nullable=True),
        sa.Column('raw_data', postgresql.JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('raw_videos')
    op.drop_table('raw_articles')
