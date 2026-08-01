"""Clean placeholder companies and near-duplicate deals from the backfill

The 0016 backfill imported historical rows verbatim; ~3-4% carried
placeholder company names from the old pipeline era ("Undisclosed",
"Unbekannt", ...) and some deals were detected in multiple periods.
normalize_company() now rejects placeholders at insert time; this migration
removes the historical ones and collapses same-company duplicates within a
30-day window (keeping the earliest row).

Revision ID: 0017
Revises: 0016
Create Date: 2026-08-01
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0017"
down_revision: Union[str, None] = "0016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_PLACEHOLDERS = (
    "undisclosed", "unknown", "unbekannt", "nicht bekannt", "n/a", "na",
    "none", "null", "various", "multiple", "tbd", "not disclosed",
    "未披露", "不明", "keine angabe", "unnamed", "-", "—",
)


def upgrade() -> None:
    conn = op.get_bind()
    removed = conn.execute(sa.text(
        "DELETE FROM deals WHERE lower(company) = ANY(:names) OR length(company) < 2"
    ), {"names": list(_PLACEHOLDERS)}).rowcount
    deduped = conn.execute(sa.text("""
        DELETE FROM deals a USING deals b
        WHERE a.id > b.id
          AND a.deal_type = b.deal_type
          AND lower(a.company) = lower(b.company)
          AND a.announced_date IS NOT NULL AND b.announced_date IS NOT NULL
          AND abs(a.announced_date - b.announced_date) <= 30
    """)).rowcount
    print(f"deals cleanup: removed {removed} placeholder rows, {deduped} duplicates")


def downgrade() -> None:
    # Data cleanup — nothing meaningful to restore.
    pass
