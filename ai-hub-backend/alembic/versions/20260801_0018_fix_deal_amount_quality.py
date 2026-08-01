"""Re-parse backfilled amounts with the fixed parser + junk-name cleanup

Two issues surfaced when sorting the backfill by amount: (1) the multiplier
regex matched the trailing 'B' of currency codes ("351M RMB" became 351e9 —
fixed in deal_utils by anchoring the token at the tail start, plus a $500B
plausibility cap), and (2) macro-report figures had been extracted as deals
by the old pipeline ("$448B" rows, companies like "- (Makrobericht)").
This migration re-parses every amount with the fixed parser and removes
rows whose company starts with dash/paren junk.

Revision ID: 0018
Revises: 0017
Create Date: 2026-08-01
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.services.deal_utils import parse_amount

revision: str = "0018"
down_revision: Union[str, None] = "0017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    junk = conn.execute(sa.text(
        r"DELETE FROM deals WHERE company ~ '^[\-–—(]'"
    )).rowcount

    rows = conn.execute(sa.text(
        "SELECT id, amount_raw, amount_value, currency FROM deals WHERE amount_raw IS NOT NULL"
    )).fetchall()
    fixed = 0
    for row in rows:
        value, currency = parse_amount(row.amount_raw)
        if value != row.amount_value or currency != row.currency:
            conn.execute(
                sa.text("UPDATE deals SET amount_value = :v, currency = :c WHERE id = :id"),
                {"v": value, "c": currency, "id": row.id},
            )
            fixed += 1
    print(f"deals amount fix: removed {junk} junk-name rows, re-parsed {fixed} amounts")


def downgrade() -> None:
    pass
