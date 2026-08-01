# Data Rights Register — AI Funding & M&A Tracker

**Maintained**: 2026-08-02 · **Scope**: the deals layer served at
`/funding` and `GET /api/deals*` · **Contact for corrections/takedown**:
https://github.com/Rswcf/DataCube-AI-Space/issues

This register documents, per active funding/M&A source feed, the terms we
operate under and the use discipline the pipeline enforces. It is the
version-controlled companion to the enforcement code in
`ai-hub-backend/app/services/deal_utils.py` (evidence gate) and
`ai-hub-backend/app/routers/deals.py` (field-level delivery policy).

## Layered use model

| Layer | What | Policy |
|---|---|---|
| Facts | company, amounts, round, dates, investors | Extracted facts are not copyrightable; freely reusable downstream **with attribution and a link** to https://www.datacubeai.space/funding |
| Expression | 1–2 sentence verbatim evidence excerpts | Third-party quotations, displayed under quotation right with attribution and a prominent source link. Served **only** per record (`GET /api/deals/{id}`, rate-limited); never in the paginated collection endpoint, never in CSV export. Not licensed for redistribution. |
| Acquisition | RSS fetching + LLM extraction | Public RSS feeds only, robots.txt respected, no paywall circumvention, no full-text storage, no use of any publisher's structured-data products |

## Per-source register (active funding/M&A feeds)

Feed list source of truth: `collector.load_sources()`. Access dates are when
the terms were last reviewed.

| Source | Type | Terms reference | Reviewed | Basis / notes |
|---|---|---|---|---|
| TechCrunch (Fundraising, M&A) | funding + M&A | https://techcrunch.com/terms-of-service/ | 2026-08-01 | RSS ToU permits reader-style use; attribution + link |
| Tech Funding News | funding | https://techfundingnews.com/terms-of-use/ | 2026-08-02 | Standard publisher ToU; facts + short attributed excerpt + link |
| Crunchbase News | funding | https://about.crunchbase.com/terms-of-service/ | 2026-08-02 | Editorial site only; we do not access the Crunchbase database product |
| Techmeme | funding | https://www.techmeme.com/about | 2026-08-02 | No formal ToS published; headline aggregator — we prefer following through to the original source for evidence |
| Sifted | funding | https://sifted.eu/terms-of-use | 2026-08-01 | Facts + short excerpt + link; we do not access the Sifted Deals Tracker product |
| Tech.eu | funding | https://tech.eu/terms-conditions/ | 2026-08-02 | Standard T&C; we do not access the Funding Explorer product |
| TechNode | funding | none published (verified 2026-08-02; about: https://technode.com/about/) | 2026-08-02 | Strictest-publisher default: facts + ≤2-sentence attributed excerpt + prominent link; no TN Data access |
| Pandaily | funding | none published (verified 2026-08-02; about: https://pandaily.com/about/) | 2026-08-02 | Strictest-publisher default (as above) |
| 36Kr | funding | https://36kr.com/policy | 2026-08-02 | Facts are unprotected; short attributed quotation with link |
| GlobeNewswire | M&A | https://notified.com/terms-of-use | 2026-08-01 | Press releases are distribution-intended; preferred evidence source |
| PR Newswire | M&A | https://www.prnewswire.com/terms-of-use.html | 2026-08-01 | Preferred evidence source |
| Reddit (tips only) | n/a | https://www.redditinc.com/policies/user-agreement | 2026-08-01 | Tips section only; short excerpt + link; not part of the deals product |

Market data note: live stock display is paused (backend endpoints return
HTTP 410) pending market-data licensing review; see `/[lang]/tools/ai-stock-tracker`.

## Pipeline discipline (enforced in code)

1. Evidence excerpts are ≤1–2 sentences, verbatim, attributed, with a
   prominent link to the original article; full text is never stored in deals.
2. Figures (amount/valuation) persist only when the excerpt itself supports
   them — same value **and compatible currency** — and the excerpt is verified
   to come from the linked article (`validate_deal_figures`).
3. Press-release sources are preferred for evidence.
4. No publisher's structured-data product is accessed.
5. Every row keeps provenance: `source_url`, `source_name`, `evidence`,
   `status` (`ai_extracted` / `legacy_unverified` / `verified` / `corrected`).

## Field-level export policy

- CSV / bulk export contains: fact fields + our own AI-written summary
  (`content`) + `source_url` — never `evidence`.
- The paginated collection endpoint (`GET /api/deals`) never returns
  `evidence` (only a `hasEvidence` flag); excerpts are delivered one record
  at a time via `GET /api/deals/{id}` (rate-limited).
- Takedown propagation: period deletion removes all Deal rows of that period,
  including manually verified/corrected ones.
