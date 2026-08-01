"""Add unique deal fingerprint (stable event identity)

Codex R2: application-level dedupe alone cannot survive concurrent writers
or drifting name/date variants. Every deal gets a deterministic fingerprint
(deal_type | company | round/ma_type | announce-month | amount | currency),
existing collisions are collapsed (manual statuses win, then oldest row),
and a unique index turns future duplicates into no-ops via ON CONFLICT.

Revision ID: 0021
Revises: 0020
Create Date: 2026-08-01
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.services.deal_utils import deal_fingerprint

revision: str = "0021"
down_revision: Union[str, None] = "0020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_STATUS_RANK = {"corrected": 0, "verified": 1, "legacy_unverified": 2, "ai_extracted": 3}


def upgrade() -> None:
    op.add_column("deals", sa.Column("fingerprint", sa.String(32), nullable=True))
    conn = op.get_bind()

    rows = conn.execute(sa.text("""
        SELECT id, deal_type, company, round_category, ma_type, announced_date,
               amount_value, currency, status
        FROM deals
    """)).mappings().all()

    best_by_fp: dict = {}
    for r in rows:
        fp = deal_fingerprint(
            r["deal_type"], r["company"],
            r["round_category"] if r["deal_type"] == "funding" else r["ma_type"],
            r["announced_date"], r["amount_value"], r["currency"],
        )
        current = best_by_fp.get(fp)
        rank = (_STATUS_RANK.get(r["status"], 9), r["id"])
        if current is None or rank < current[0]:
            best_by_fp[fp] = (rank, r["id"])

    keep_ids = {v[1] for v in best_by_fp.values()}
    removed = 0
    for r in rows:
        if r["id"] not in keep_ids:
            conn.execute(sa.text("DELETE FROM deals WHERE id = :id"), {"id": r["id"]})
            removed += 1
    for fp, (_, keep_id) in best_by_fp.items():
        conn.execute(sa.text("UPDATE deals SET fingerprint = :fp WHERE id = :id"),
                     {"fp": fp, "id": keep_id})

    op.create_index("ux_deals_fingerprint", "deals", ["fingerprint"], unique=True)
    print(f"fingerprints assigned to {len(keep_ids)} deals, {removed} duplicates collapsed")


def downgrade() -> None:
    op.drop_index("ux_deals_fingerprint", table_name="deals")
    op.drop_column("deals", "fingerprint")
