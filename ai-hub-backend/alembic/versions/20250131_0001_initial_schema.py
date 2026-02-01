"""Initial database schema

Revision ID: 0001
Revises:
Create Date: 2025-01-31

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create weeks table
    op.create_table(
        'weeks',
        sa.Column('id', sa.String(10), primary_key=True),
        sa.Column('label', sa.String(20), nullable=False),
        sa.Column('year', sa.Integer, nullable=False),
        sa.Column('week_num', sa.Integer, nullable=False),
        sa.Column('date_range', sa.String(20), nullable=False),
        sa.Column('is_current', sa.Boolean, default=False),
    )

    # Create tech_posts table
    op.create_table(
        'tech_posts',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('week_id', sa.String(10), sa.ForeignKey('weeks.id'), nullable=False, index=True),
        sa.Column('content_de', sa.Text, nullable=False),
        sa.Column('content_en', sa.Text, nullable=False),
        sa.Column('category_de', sa.String(100), nullable=False),
        sa.Column('category_en', sa.String(100), nullable=False),
        sa.Column('author', postgresql.JSONB, nullable=False),
        sa.Column('tags_de', postgresql.ARRAY(sa.String), default=[]),
        sa.Column('tags_en', postgresql.ARRAY(sa.String), default=[]),
        sa.Column('icon_type', sa.String(20), nullable=False),
        sa.Column('impact', sa.String(20), nullable=False),
        sa.Column('timestamp', sa.String(20), nullable=False),
        sa.Column('source', sa.String(200), nullable=False),
        sa.Column('source_url', sa.Text, nullable=True),
        sa.Column('metrics', postgresql.JSONB, default={}),
        sa.Column('video_id', sa.String(20), nullable=True),
        sa.Column('video_duration', sa.String(20), nullable=True),
        sa.Column('video_view_count', sa.String(30), nullable=True),
        sa.Column('video_thumbnail_url', sa.Text, nullable=True),
        sa.Column('is_video', sa.Boolean, default=False),
        sa.Column('display_order', sa.Integer, default=0),
    )

    # Create videos table
    op.create_table(
        'videos',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('week_id', sa.String(10), sa.ForeignKey('weeks.id'), nullable=False, index=True),
        sa.Column('video_id', sa.String(20), unique=True, nullable=False, index=True),
        sa.Column('title_de', sa.Text, nullable=False),
        sa.Column('title_en', sa.Text, nullable=False),
        sa.Column('summary_de', sa.Text, nullable=False),
        sa.Column('summary_en', sa.Text, nullable=False),
        sa.Column('original_title', sa.Text, nullable=False),
        sa.Column('channel_name', sa.String(200), nullable=False),
        sa.Column('channel_id', sa.String(50), nullable=True),
        sa.Column('thumbnail_url', sa.Text, nullable=False),
        sa.Column('published_at', sa.String(30), nullable=False),
        sa.Column('duration_seconds', sa.Integer, nullable=False),
        sa.Column('duration_formatted', sa.String(20), nullable=False),
        sa.Column('view_count', sa.Integer, default=0),
        sa.Column('like_count', sa.Integer, default=0),
        sa.Column('transcript', sa.Text, nullable=True),
        sa.Column('tags', sa.Text, nullable=True),
        sa.Column('category', sa.String(100), nullable=True),
    )

    # Create primary_market_posts table
    op.create_table(
        'primary_market_posts',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('week_id', sa.String(10), sa.ForeignKey('weeks.id'), nullable=False, index=True),
        sa.Column('content_de', sa.Text, nullable=False),
        sa.Column('content_en', sa.Text, nullable=False),
        sa.Column('company', sa.String(200), nullable=False),
        sa.Column('amount_de', sa.String(50), nullable=False),
        sa.Column('amount_en', sa.String(50), nullable=False),
        sa.Column('round', sa.String(50), nullable=False),
        sa.Column('investors', postgresql.ARRAY(sa.String), default=[]),
        sa.Column('valuation_de', sa.String(50), nullable=True),
        sa.Column('valuation_en', sa.String(50), nullable=True),
        sa.Column('author', postgresql.JSONB, nullable=False),
        sa.Column('timestamp', sa.String(20), nullable=False),
        sa.Column('source_url', sa.Text, nullable=True),
        sa.Column('metrics', postgresql.JSONB, default={}),
    )

    # Create secondary_market_posts table
    op.create_table(
        'secondary_market_posts',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('week_id', sa.String(10), sa.ForeignKey('weeks.id'), nullable=False, index=True),
        sa.Column('content_de', sa.Text, nullable=False),
        sa.Column('content_en', sa.Text, nullable=False),
        sa.Column('ticker', sa.String(10), nullable=False),
        sa.Column('price', sa.String(20), nullable=False),
        sa.Column('change', sa.String(20), nullable=False),
        sa.Column('direction', sa.String(10), nullable=False),
        sa.Column('market_cap_de', sa.String(50), nullable=True),
        sa.Column('market_cap_en', sa.String(50), nullable=True),
        sa.Column('author', postgresql.JSONB, nullable=False),
        sa.Column('timestamp', sa.String(20), nullable=False),
        sa.Column('source_url', sa.Text, nullable=True),
        sa.Column('metrics', postgresql.JSONB, default={}),
    )

    # Create ma_posts table
    op.create_table(
        'ma_posts',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('week_id', sa.String(10), sa.ForeignKey('weeks.id'), nullable=False, index=True),
        sa.Column('content_de', sa.Text, nullable=False),
        sa.Column('content_en', sa.Text, nullable=False),
        sa.Column('acquirer', sa.String(200), nullable=False),
        sa.Column('target', sa.String(200), nullable=False),
        sa.Column('deal_value_de', sa.String(50), nullable=True),
        sa.Column('deal_value_en', sa.String(50), nullable=True),
        sa.Column('deal_type_de', sa.String(50), nullable=False),
        sa.Column('deal_type_en', sa.String(50), nullable=False),
        sa.Column('author', postgresql.JSONB, nullable=False),
        sa.Column('timestamp', sa.String(20), nullable=False),
        sa.Column('source_url', sa.Text, nullable=True),
        sa.Column('metrics', postgresql.JSONB, default={}),
    )

    # Create tip_posts table
    op.create_table(
        'tip_posts',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('week_id', sa.String(10), sa.ForeignKey('weeks.id'), nullable=False, index=True),
        sa.Column('content_de', sa.Text, nullable=False),
        sa.Column('content_en', sa.Text, nullable=False),
        sa.Column('tip_de', sa.Text, nullable=False),
        sa.Column('tip_en', sa.Text, nullable=False),
        sa.Column('category_de', sa.String(100), nullable=False),
        sa.Column('category_en', sa.String(100), nullable=False),
        sa.Column('platform', sa.String(20), nullable=False),
        sa.Column('difficulty_de', sa.String(30), nullable=False),
        sa.Column('difficulty_en', sa.String(30), nullable=False),
        sa.Column('author', postgresql.JSONB, nullable=False),
        sa.Column('timestamp', sa.String(20), nullable=False),
        sa.Column('source_url', sa.Text, nullable=True),
        sa.Column('metrics', postgresql.JSONB, default={}),
    )

    # Create trends table
    op.create_table(
        'trends',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('week_id', sa.String(10), sa.ForeignKey('weeks.id'), nullable=False, index=True),
        sa.Column('category_de', sa.String(50), nullable=False),
        sa.Column('category_en', sa.String(50), nullable=False),
        sa.Column('title_de', sa.String(200), nullable=False),
        sa.Column('title_en', sa.String(200), nullable=False),
        sa.Column('posts', sa.Integer, nullable=True),
    )

    # Create team_members table
    op.create_table(
        'team_members',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('role_de', sa.String(100), nullable=False),
        sa.Column('role_en', sa.String(100), nullable=False),
        sa.Column('handle', sa.String(50), nullable=False),
        sa.Column('avatar', sa.String(10), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('team_members')
    op.drop_table('trends')
    op.drop_table('tip_posts')
    op.drop_table('ma_posts')
    op.drop_table('secondary_market_posts')
    op.drop_table('primary_market_posts')
    op.drop_table('videos')
    op.drop_table('tech_posts')
    op.drop_table('weeks')
