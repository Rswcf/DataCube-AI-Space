"""Final backfill quality pass: SEC noise, macro pseudo-deals, amount caps

Third and final mechanical cleanup of the 0016 backfill (after this,
quality issues are handled by the public corrections process):

1. Remove rows sourced from SEC EDGAR 8-K bulk filings — the source was
   dropped from the pipeline for near-zero AI relevance; its historical
   rows are generic capital-raise notices polluting the newest view.
2. Remove aggregate-report pseudo-companies ("Global Venture Funding
   (Q1 2026)" is not a company).
3. Null out implausible amounts instead of showcasing them: the largest
   AI funding round ever is ~$40B, the largest tech M&A ~$100B. Funding
   amounts > $60B and M&A > $120B are misextractions (kept as raw
   strings, removed from numeric sort).

Revision ID: 0019
Revises: 0018
Create Date: 2026-08-01
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0019"
down_revision: Union[str, None] = "0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    sec = conn.execute(sa.text("""
        DELETE FROM deals
        WHERE source_url LIKE '%sec.gov%' OR source_name ILIKE '%sec edgar%' OR source_name = 'sec.gov'
    """)).rowcount

    pseudo = conn.execute(sa.text("""
        DELETE FROM deals
        WHERE lower(company) LIKE '%venture funding%'
           OR lower(company) LIKE '%startup ecosystem%'
           OR lower(company) LIKE '%(q1 2%' OR lower(company) LIKE '%(q2 2%'
           OR lower(company) LIKE '%(q3 2%' OR lower(company) LIKE '%(q4 2%'
           OR lower(company) LIKE '%makrobericht%'
           OR lower(company) LIKE '%führende ki%'
    """)).rowcount

    capped_funding = conn.execute(sa.text("""
        UPDATE deals SET amount_value = NULL, currency = NULL
        WHERE deal_type = 'funding' AND amount_value > 60000000000
    """)).rowcount
    capped_ma = conn.execute(sa.text("""
        UPDATE deals SET amount_value = NULL, currency = NULL
        WHERE deal_type = 'ma' AND amount_value > 120000000000
    """)).rowcount

    print(f"final pass: -{sec} SEC rows, -{pseudo} pseudo-companies, "
          f"amounts nulled: {capped_funding} funding + {capped_ma} ma")


def downgrade() -> None:
    pass
