"""Mark pre-evidence backfill rows as legacy_unverified

Codex review F2: backfilled rows (no evidence contract) carried the same
'ai_extracted' status as new evidence-gated rows, making them
indistinguishable in the UI and API. All rows without evidence become
'legacy_unverified'; the UI labels them and the API exposes a status filter.

Revision ID: 0020
Revises: 0019
Create Date: 2026-08-01
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0020"
down_revision: Union[str, None] = "0019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    n = op.get_bind().execute(sa.text("""
        UPDATE deals SET status = 'legacy_unverified'
        WHERE status = 'ai_extracted' AND evidence IS NULL
    """)).rowcount
    print(f"marked {n} rows legacy_unverified")


def downgrade() -> None:
    op.get_bind().execute(sa.text("""
        UPDATE deals SET status = 'ai_extracted'
        WHERE status = 'legacy_unverified'
    """))
