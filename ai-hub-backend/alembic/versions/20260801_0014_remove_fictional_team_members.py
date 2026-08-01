"""Delete the fictional default team member roster

The team_members table was seeded with four invented people (an artifact of
the site's internal-tool origins). Fabricated bylines are an E-E-A-T and
trust liability on a public site, so all rows are removed. The table itself
stays for now — collector.py still references the model; full removal happens
once that code path is retired.

Revision ID: 0014
Revises: 0013
Create Date: 2026-08-01
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0014"
down_revision: Union[str, None] = "0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DELETE FROM team_members")


def downgrade() -> None:
    # The removed rows were fabricated data; there is nothing to restore.
    pass
