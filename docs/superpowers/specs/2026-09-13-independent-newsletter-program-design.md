# Independent AI Newsletter Relaunch — Program Design Spec (v2)

- Date: 2026-09-13
- Status: v2 — approved by the founder 2026-09-13 (adversarial review GO-WITH-FIXES applied)
- Strategy input (local only, not in git): `.ai-collab/context/independence-review-2026-09.md`
- Public repo rule: this file is committed — no employer references, no personal data beyond the founder's public byline.

## 1. Context

The product (legacy brand "Data Cube AI", `datacubeai.space`) is a fully automated, 8-language AI news pipeline: daily collection (RSS + Hacker News + YouTube) → LLM classification, EN-native summaries, translation to 7 languages → Postgres → Next.js site (Vercel) + daily newsletter (subscribers stored in Beehiiv, emails sent via Resend) + an evidence-linked AI funding & M&A ledger (`/funding`, 1,272 deals). Production runs daily. Audience and revenue are still close to zero.

Defects entering the program: translations misaligned on every day since 2026-08-01 (hotfix R0 in progress); no one-click unsubscribe (footer → a page that says "reply", but the domain has no MX); subscribe route defaults to `de`, has no rate limit and reactivates opted-out addresses; unauthenticated legacy Stripe endpoints (cancel-by-email, status-by-email) and a webhook that fails under stripe-python 15; `developer.py` links to a non-existent `/pricing`; `/for-teams` mails an undeliverable address; `/premium` is "coming soon"; brand identity hard-coded across the frontend, backend, docs and workflows; Impressum and Datenschutz are placeholders; AI-written prose is labeled only on week pages.

## 2. Goals and non-goals

**Goals**
- **G1 Brand independence:** one brand source of truth per app; renaming is a config + assets change.
- **G2 Lossless relaunch:** new name/domain without losing subscribers, inbound links, API clients or data.
- **G3 First repeatable cash flow:** a fully automated paid membership that needs no weekly human work.
- **G4 Launch-grade trust, delivery and compliance:** one-click unsubscribe, translation-complete sends, hedge-preserving summaries, AI labeling on every AI prose surface, real legal pages, a working contact path.
- **G5 Zero weekly editorial time:** automation plus guardrails replace human review.

**Non-goals**
- Human-edited flagship edition; sponsorships, display ads, affiliate links, job board (revisit at audience triggers).
- Paid data/API products (self-frozen pending legal review; `docs/data-rights.md` governs excerpt delivery and export).
- New languages, site IA redesign, Beehiiv-native sending, social-media automation.

## 3. Settled inputs and constraints

1. External approvals for the independent product: obtained (2026-09-13).
2. **Attribution:** the founder publishes under their real name as creator/operator ("Made by <founder>"). Content is AI-generated and labeled; the product never claims human editing ("Edited by …" forbidden). EU AI Act Art. 50(4) applies since 2026-08-02 (no human-review exception) — labeling is an obligation (confirm with counsel).
3. **Human editorial time ≈ 0/week.**
4. **Brand name:** founder decision 2026-09-13 — keep the legacy name for now. SP2 still builds the brand SSOT with legacy values; R4 waits until the founder picks a name from the researched shortlist (Ibid, Sourcebrief, Sursa), runs the formal trademark search and buys the domain.
5. **Infrastructure:** Vercel Pro; Railway, Beehiiv Launch (free, API without Send API), Resend Free (100 emails/day, 3,000/month — Pro $20/month expected around R+30); existing Stripe account.
6. **Authorization:** pre-approved — test emails to the founder's inbox; creating Stripe products/prices (test mode first); pushing feature branches and opening PRs. Explicit approval each time — production deploys (merging to `main` deploys Vercel; `railway up` deploys the backend), repository creation/visibility, emails to subscribers, DNS/registrar changes (founder-only).
7. **Test safety:** tests and scripts must never touch the production database; local `next build` fetches the production API.
8. **Data rights:** paid tiers never gate facts, receipts (evidence links/excerpts) or CSV export.

## 4. Program decomposition and release trains

| Release | Sub-project | Scope | Entry criteria |
|---|---|---|---|
| **R0** (in progress) | Translation alignment hotfix | identity mapping, `_src` integrity marker, stage 3.5 retry, backfill repair, newsletter send gate, test-DB guard, M&A-only save — see `docs/superpowers/specs/2026-09-13-translation-alignment-hotfix-design.md` | founder deploy approval |
| **R1** | SP1 Delivery & safety hygiene | one-click unsubscribe; subscribe hardening; legacy Stripe endpoint removal; diagnose/log privacy; scripts DB guard; faithfulness prompt rules; contact form; small fixes | R0 live; founder deploy approval |
| **R2** | SP2 Brand SSOT + AI labeling | brand config modules; replace hard-coded identity; generated brand files; guard; AI label on every AI prose surface in 8 languages; person-like bylines removed | R1 live |
| **R3a** | SP3a Membership core | Stripe product/prices, Payment Link or minimal checkout, webhook rewrite, member flag, `/membership` with Managed Payments disclosures | Managed Payments active in live mode (ToS accepted); Impressum + Datenschutz filled (founder values); R2 live |
| **R3** | SP4 Newsletter 2.0 | edition dimension, automated weekly edition, cadence, subject lines, plain text, bounce/complaint loop, volume guard, test-send | R1 live |
| **R3b** | SP3b Watchlist alerts | watchlists, token pages, matching job, alert edition | ≥ 3 paying members or R+60 |
| **R4** | SP5 Rebrand migration | apply name/domain; single-hop redirects; `kw`→`w`; sender domain; assets; runbook | name + trademark search + domain; legal pages; founder approval |
| **Launch** | SP6 Launch kit | Show HN (tracker/API), LinkedIn/Reddit/PH copy, Recommendations experiment | R4 live |

Each sub-project gets its own plan in `docs/superpowers/plans/`, its own branch and PR. Alembic revision ids and `down_revision` order are assigned up front across SP3a/SP3b/SP4; CI fails on more than one Alembic head.

## 5. Architecture decisions

**AD1 — Brand SSOT (per app, env-overridable, legacy defaults).** Frontend `ai-information-hub/lib/brand.ts` exports a typed `BRAND` object; backend `Settings` fields carry the same identity. Defaults equal today's values (SP2 is behavior-neutral, proven by before/after output comparison). Frozen identifiers never change on rename: Atom `<id>` tag authority/year, `dcai-takeaways`. Brand-bearing static files become generated routes. A guard script fails CI when legacy brand strings appear outside the SSOT/allowlist; its scope and allowlist are defined per file class (code, docs, workflows, promo assets).

**AD2 — Sending stays on Resend; Beehiiv stays list of record.** All editions go through Resend with the idempotent send lock. Beehiiv custom fields `Cadence` (text) and `Member` (boolean) are created by the founder before R3/R3a; a startup check logs if absent. A bounce/complaint loop (Resend webhooks) unsubscribes dead addresses in Beehiiv. The volume guard counts today's sent emails across all editions plus planned recipients.

**AD3 — RFC 8058 one-click unsubscribe with opaque tokens.**
- Headers: `List-Unsubscribe: <https://www.<site>/api/newsletter/unsubscribe?t=<token>>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, on the canonical `www` host (the apex → www redirect would break the POST).
- The Next.js route handler answers the POST directly (server-side call to the backend, never a redirect), accepts form bodies, and does not use `enforceProtectedApiRequest` (mail receivers send no cookies/Origin).
- Token: `v1.` key id + HMAC-SHA256 over the Beehiiv subscription id (`hmac.compare_digest`; fail closed without `SIGNING_SECRET`; two keys verify during rotation). No email addresses in URLs.
- Backend calls Beehiiv's update-subscription-by-id endpoint with `unsubscribe: true` (method per current docs — PUT page documented; confirm at implementation). `GET` never unsubscribes.
- Acceptance: on a test send, the `DKIM-Signature` `h=` tag covers `list-unsubscribe` and `list-unsubscribe-post`.

**AD4 — Translation completeness (R0).** Integrity marker `_src` per language entry (German marker at `translations["de"]["_src"]`); status `ok|missing|stale|untranslated` on prose fields only. Newsletter send gate: a language is **held** when any item is `stale` or at least half of its items are not ready; otherwise it is sent with English fallback for the few non-ready items and the counts reported as warnings. Held languages turn the workflow red (HTTP 502).

**AD5 — Faithfulness by prompt contract.** Tech/investment/M&A/editorial prompts gain epistemic-status rules (preserve hedges, attribute claims, include a counterparty response only when the source contains one, never upgrade a claim to a fact); the translation prompt preserves hedging and attribution. Prompt-contract tests; optional weekly golden-set check (5–10 hedged snippets, assertions on hedge retention).

**AD6 — Membership on Stripe Managed Payments.** Subscription-mode Checkout Session with `managed_payments[enabled]=true` or a Payment Link with Managed Payments; API version ≥ `2025-03-31.basil` (period fields on subscription items; invoice parent); eligible tax code `txcd_10503005`; `tax_behavior=inclusive`; unsupported Checkout parameters omitted. `STRIPE_MANAGED_PAYMENTS=false` is for development only — no public sale without a merchant of record in this program. Webhook dedupe table, upsert by subscription id, out-of-order handling, livemode check.

**AD7 — Honest attribution and AI labeling.** Schema.org: articles authored and published by the Organization; founder as `Organization.founder` (Person). Footer "Made by <founder>". Every surface that renders AI-written prose carries a label near the top in the page language: week/day pages, article pages, topic pages, emails (all editions), `/feed.xml`, `/newsletter.xml`, `/api/content-summary`, `llms.txt`, OG text. Person-like bylines ("Data Cube AI Editorial / Redaktion / 编辑部") are replaced.

## 6. Sub-project designs

### 6.1 SP1 — Delivery & safety hygiene (R1)
- **One-click unsubscribe:** AD3. Sender keeps the Beehiiv subscription `id`; per-recipient headers and footer URL (placeholder replaced per recipient in the batch loop); `/unsubscribe?t=` confirm page POSTs; page copy stops mentioning replies.
- **Subscribe hardening** (`app/api/subscribe/route.ts`): server-side email validation; per-IP rate limit (not the cookie/origin guard); default language `en`; `double_opt_override: "on"` with `reactivate_existing: true` (forced DOI protects consent and lets a real reader re-subscribe); `utm_source`/`referring_site`.
- **Legacy Stripe removal:** `POST /stripe/cancel`, `GET /stripe/subscription/{email}`, `POST /stripe/create-checkout`, the legacy webhook and the unused frontend `/api/checkout` proxy are removed (SP3a re-introduces payments).
- **Privacy:** diagnose returns counts only and requires an explicit `test_email`; subscriber emails masked in all newsletter/membership/webhook logs.
- **Scripts DB guard:** scripts refuse a non-local database when `DATABASE_URL` is not set in the process environment (i.e. inherited from `.env`); Railway sets it explicitly, so production runs are unaffected.
- **Faithfulness:** AD5.
- **Contact:** `/for-teams` and `/contact` forms → `POST /api/contact` (rate-limited, honeypot) → Resend email to `CONTACT_INBOX` with `reply_to` = visitor email.
- **Small fixes:** `developer.py:224` link → `/en/tools/ai-news-api`.

### 6.2 SP2 — Brand SSOT + AI labeling (R2)
- Coupling (tracked files): "Data Cube AI" ~270 lines/51 files, "DataCube AI" ~188/13, `datacubeai.space` ~199/55, `dcai` 6/3, including docs, translated READMEs, LICENSE, CONTRIBUTING, promo assets and workflows.
- Per-page `t(map, lang)` helpers (tool pages, story page, topic page) switch brand literals to `fillBrand`; the generic lookup lives in `lib/settings-context.tsx`; unused `dataCube`/`team` keys are deleted.
- Double-branded titles fixed; `robots.txt` → `app/robots.ts`; `llms.txt` → route; host redirect moves to `next.config.mjs` `redirects()`; workflows read `vars.SITE_URL`.
- Backend `Settings`: `brand_name`, `brand_short_name`, `site_url`, `founder_name`, `newsletter_from_name`, `api_key_prefix` (≤ 8 chars), `rss_user_agent`, `github_issues_url`, `api_title`; `cors_origins` derived from `site_url`.
- AI labels (AD7) with render tests per surface and language.
- Next.js 16 renamed `middleware` to `proxy`: SP2 runs the codemod so later URL work lands in `proxy.ts`.

### 6.3 SP3a — Membership core (R3a)
- **Offer:** Founding Member €50/year or €6/month incl. VAT, converted to the buyer's currency at checkout; no trial (confirmed by the founder 2026-09-13).
- **Checkout:** Payment Link (preferred for speed) or `POST /api/membership/checkout`; success → `/membership/welcome`.
- **Webhook:** `POST /api/stripe/webhook` — signature verification, `stripe_events` dedupe, events `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.paid|payment_failed`; emails lowercased; basil payload shapes; out-of-order safe (fetch the subscription when needed); livemode check.
- **Member record:** `subscriptions` table; states active/trialing/past_due → member.
- **Beehiiv:** set `Member=true|false`; if no Beehiiv record exists, create it with `Member=true` and **no edition cadence** (members are not auto-enrolled into marketing editions; opt-in offered on the welcome page).
- **`/membership` page (EN/DE/ZH):** honest benefits (what exists at launch); required FAQ — seller of record is Stripe/Link ("Sold through Link"), statement text `LINK.COM* …`, receipts from Link, manage/cancel at link.com, refunds via Link support, price incl. VAT with currency conversion, buyers in mainland China cannot purchase (ZH copy); a "cancel contracts here" link to Link's management page.
- **Founder prerequisites:** Managed Payments enabled + ToS accepted; statement descriptor, business name, support email in Stripe business details; keys in Railway; legal pages filled.
- `/premium` → 308 → `/membership`; `/for-teams` reduced to one paragraph + contact form.

### 6.4 SP4 — Newsletter 2.0 (R3)
- **Edition dimension:** `newsletter_sends` gains `edition` (`daily` | `weekly` | `alerts`) in the primary key; change sites include `on_conflict_do_nothing(index_elements=…)` and `_mark_send_*` filters.
- **Weekly edition:** rolls up the week's days (top 7 tech by impact then momentum, top 8 deals with evidence links, top 3 tips, rising topics) + "The week in 3 bullets" (one LLM call from the week's daily briefs, translated, cached in `weeks.weekly_brief`); workflow `weekly-newsletter.yml` with keepalive; behind `WEEKLY_EDITION_ENABLED`.
- **Cadence:** Beehiiv `Cadence` ∈ {`daily`, `weekly`, `both`}; missing = `daily` for existing subscribers; the signup default is `weekly` only while `WEEKLY_EDITION_ENABLED` is on (otherwise `daily`).
- **Subjects/preheaders** with hooks and localized dates; AI label in every edition; plain-text part.
- **Bounce/complaint loop:** `POST /api/webhooks/resend` (signature-verified) → `email_events` → Beehiiv unsubscribe on hard bounce/complaint; unsubscribe and complaint metrics computed from `email_events` + `newsletter_sends`.
- **Volume guard:** today's sent count across all editions + planned recipients vs `EMAIL_DAILY_LIMIT`; warning at ≥ 80 %.
- Newsletter admin endpoints become sync `def`; `POST /api/admin/newsletter/test-send`.

### 6.5 SP3b — Watchlist alerts (R3b)
- `member_watchlists(email, keywords ≤ 10, lang)`; matching on tech `content`/`category`/`tags` and deal company/acquirer/investor fields, reading deals through the same field policy as `GET /api/deals` (never `evidence`).
- Watchlist tokens expire after 30 days and are re-minted in each alert email; watchlists deleted 30 days after membership ends; documented erasure path (contact inbox) covering `subscriptions`, `member_watchlists`, Beehiiv, Resend.
- Alert edition sent per member via the edition lock.

### 6.6 SP5 — Rebrand migration (R4)
- Apply SSOT values; new wordmark/favicons/OG; README/LICENSE/CONTRIBUTING; new API key prefix for new keys.
- **Single-hop redirects:** old host rules in `next.config.mjs` `redirects()` rewrite `kw` → `w` in the same 308; exit criterion "20 sampled old URLs resolve to 200 in exactly one 308".
- Public period ids: `toPublicPeriodId`/`toDbPeriodId`; `w` never enters the DB or `newsletter_sends.period_id`; alias handling in `proxy.ts`.
- Sender identity from settings with "(formerly Data Cube AI)" for 4 weeks; `reply_to` once inbound mail works.
- **Runbook (founder):** Beehiiv list export before any change; removal of work-domain and dead addresses; DNS (Vercel, Resend DKIM/SPF, DMARC `none` → `quarantine`, inbound MX); Resend domain verification; Beehiiv rename + welcome email; Stripe business name/descriptor/support email; GSC Change of Address; Bing Webmaster; repo variable `SITE_URL`; GitHub description/homepage; public-apis PR; repository strategy decision; one-time announcement email after a test send.

### 6.7 SP6 — Launch kit
- Show HN for the tracker + free API; LinkedIn launch + 4 follow-ups under the founder's name; Reddit posts per community rules; Product Hunt copy; optional Beehiiv-hosted subscribe page experiment.
- Metrics (hypotheses at R+30/60/90): subscribers 60/150/300; members 1/3/8; unsubscribe < 1 %/edition; complaints < 0.1 % (from `email_events`). Missing R+90 by more than half → maintenance mode.

## 7. Testing strategy

- **Backend:** pytest; conftest DB guard (R0); `integration` marker; CI runs all unit tests and all integration tests (Postgres 16 service); CI fails on multiple Alembic heads.
- **Frontend:** Vitest for pure modules; `tsc --noEmit`; `next build` in CI only.
- **Email:** render tests per edition (structure, AI label, unsubscribe URL); header tests (List-Unsubscribe pair, token round-trip); DKIM `h=` check on a founder test send.
- **Stripe:** parameter-construction tests (Managed Payments), webhook tests with locally signed basil-shaped payloads (incl. out-of-order), end-to-end in test mode with card 4242.
- **Guards:** brand-string guard with file-class allowlist; AI-label render tests per surface and language; prompt-contract tests; translation gate tests.
- **Definition of done per release:** local suites green, CI green on the PR, smoke checklist executed, founder deploy approval, post-deploy verification recorded.

## 8. Rollout, feature flags, rollback

- One branch + PR per sub-project; no merges to `main` without deploy approval.
- Flags: `WEEKLY_EDITION_ENABLED`, `STRIPE_MANAGED_PAYMENTS` (dev only when false), signup cadence default tied to the weekly flag.
- Additive migrations with downgrades; Vercel instant rollback; Railway redeploy of the previous commit.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Tests or scripts inherit `.env` and hit production | conftest guard (R0) + scripts guard (SP1) |
| Template change breaks the next scheduled send | render tests + founder test send + flags; idempotent sends |
| Resend free tier exceeded | volume guard across editions; Pro budgeted ~R+30 |
| Managed Payments not approved | no public sale until approved (R3a entry criterion) |
| Legal exposure (Impressum, privacy, AI labeling) | R3a/R4 entry criteria; AD7 on every surface |
| Brand refactor changes rendered output | before/after output comparison |
| Domain migration loses links | single-hop 308 ≥ 12 months, GSC change of address, IndexNow, public-apis PR |
| Paid tier drifts into gating receipts/data | spec rule + review checklist; alerts never render `evidence` |
| Parallel Alembic heads at merge | revision order assigned up front; CI head check |
