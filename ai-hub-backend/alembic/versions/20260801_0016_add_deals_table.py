"""Add normalized deals table + backfill from historical investment posts

The deals layer is the compounding data asset behind the Funding Tracker
(master plan v2, Codex C2). Historical rows from primary_market_posts and
ma_posts are backfilled with status='ai_extracted' — they predate the
evidence-excerpt prompts, and the UI labels them accordingly.

Revision ID: 0016
Revises: 0015
Create Date: 2026-08-01
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from app.services.deal_utils import parse_amount, parse_announced_date, normalize_company

revision: str = "0016"
down_revision: Union[str, None] = "0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "deals",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("week_id", sa.String(10), nullable=False),
        sa.Column("deal_type", sa.String(10), nullable=False),
        sa.Column("company", sa.String(300), nullable=False),
        sa.Column("acquirer", sa.String(300), nullable=True),
        sa.Column("round", sa.String(100), nullable=True),
        sa.Column("round_category", sa.String(50), nullable=True),
        sa.Column("ma_type", sa.String(50), nullable=True),
        sa.Column("industry", sa.String(100), nullable=True),
        sa.Column("amount_raw", sa.String(100), nullable=True),
        sa.Column("amount_value", sa.BigInteger(), nullable=True),
        sa.Column("currency", sa.String(8), nullable=True),
        sa.Column("valuation_raw", sa.String(100), nullable=True),
        sa.Column("investors", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("announced_date", sa.Date(), nullable=True),
        sa.Column("content_en", sa.Text(), nullable=False, server_default=""),
        sa.Column("evidence", sa.Text(), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("source_name", sa.String(200), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="ai_extracted"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    for col in ["week_id", "deal_type", "company", "round_category", "industry",
                "amount_value", "announced_date", "status"]:
        op.create_index(f"ix_deals_{col}", "deals", [col])
    op.create_index("ix_deals_type_company_date", "deals", ["deal_type", "company", "announced_date"])

    _backfill(op.get_bind())


def _backfill(conn) -> None:
    seen: set[tuple] = set()
    inserted = 0

    def insert(row: dict) -> None:
        nonlocal inserted
        company = normalize_company(row.get("company"))
        if not company:
            return
        key = (
            row["deal_type"],
            company.lower(),
            (row.get("amount_raw") or "").lower(),
            str(row.get("announced_date") or ""),
        )
        if key in seen:
            return
        seen.add(key)
        conn.execute(
            sa.text("""
                INSERT INTO deals (week_id, deal_type, company, acquirer, round,
                    round_category, ma_type, industry, amount_raw, amount_value,
                    currency, valuation_raw, investors, announced_date,
                    content_en, evidence, source_url, source_name, status)
                VALUES (:week_id, :deal_type, :company, :acquirer, :round,
                    :round_category, :ma_type, :industry, :amount_raw, :amount_value,
                    :currency, :valuation_raw, :investors, :announced_date,
                    :content_en, NULL, :source_url, :source_name, 'ai_extracted')
            """),
            {**row, "company": company},
        )
        inserted += 1

    pm_rows = conn.execute(sa.text("""
        SELECT week_id, company, amount_en, round, round_category, investors,
               valuation_en, content_en, timestamp, source_url,
               author->>'name' AS source_name
        FROM primary_market_posts ORDER BY week_id
    """)).mappings()
    for r in pm_rows:
        amount_value, currency = parse_amount(r["amount_en"])
        insert({
            "week_id": r["week_id"], "deal_type": "funding",
            "company": r["company"], "acquirer": None,
            "round": r["round"], "round_category": r["round_category"],
            "ma_type": None, "industry": None,
            "amount_raw": r["amount_en"], "amount_value": amount_value,
            "currency": currency, "valuation_raw": r["valuation_en"],
            "investors": r["investors"] or [],
            "announced_date": parse_announced_date(r["timestamp"]),
            "content_en": r["content_en"] or "",
            "source_url": r["source_url"], "source_name": r["source_name"],
        })

    ma_rows = conn.execute(sa.text("""
        SELECT week_id, acquirer, target, deal_value_en, deal_type_en, industry,
               content_en, timestamp, source_url, author->>'name' AS source_name
        FROM ma_posts ORDER BY week_id
    """)).mappings()
    for r in ma_rows:
        amount_value, currency = parse_amount(r["deal_value_en"])
        insert({
            "week_id": r["week_id"], "deal_type": "ma",
            "company": r["target"] or r["acquirer"], "acquirer": r["acquirer"],
            "round": None, "round_category": None,
            "ma_type": r["deal_type_en"], "industry": r["industry"],
            "amount_raw": r["deal_value_en"], "amount_value": amount_value,
            "currency": currency, "valuation_raw": None,
            "investors": [],
            "announced_date": parse_announced_date(r["timestamp"]),
            "content_en": r["content_en"] or "",
            "source_url": r["source_url"], "source_name": r["source_name"],
        })

    print(f"deals backfill: inserted {inserted} rows")


def downgrade() -> None:
    op.drop_table("deals")
