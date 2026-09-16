# R2 Brand SSOT + AI Labeling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship SP2:
- one brand source of truth per app, defaulting to today's values;
- no legacy brand string left in code or workflows, enforced by a CI guard;
- brand-bearing static files generated from the brand config;
- an AI label, in the reader's language, on every surface that shows AI-written prose;
- person-like bylines replaced by Organization attribution.

**Architecture:**
- **Frontend identity** comes from `lib/brand.ts`: a typed `BRAND` built from optional `NEXT_PUBLIC_*` variables over `lib/brand-defaults.json`. `next.config.mjs` reads the same JSON for the apex-host redirect.
- **Backend identity** comes from new `Settings` fields in `app/config.py`.
- **Neutrality proof.** Golden files captured before any refactor prove the brand work changes no output:
  - Vitest file snapshots of routes, metadata, JSON-LD and rendered pages;
  - pytest goldens of the email.

  A before/after snapshot of production confirms it at release.
- **Label copy** lives in one table per app (`lib/ai-label.ts`, `EMAIL_STRINGS`). It renders through an `AiLabel` component and through the feed, summary, llms.txt, OG and email builders.
- **Guard.** A standard-library Python script fails CI when a legacy brand string appears outside the brand config, tests, docs and promo assets.

**Tech Stack:**
- Next.js 16.0.10, React 19, TypeScript 5, Vitest 5.0.0
- Python 3.11 in CI (local `venv312`), FastAPI, pydantic-settings, pytest
- Standard-library Python 3.9+ for repository scripts
- GitHub Actions

**Spec:** `docs/superpowers/specs/2026-09-13-independent-newsletter-program-design.md`:
- §3 constraints
- AD1, AD7
- §6.2 scope
- §7 testing
- §8 rollout
- §9 risks

## Global Constraints

**Scope**
- Spec §6.2, AD1 and AD7 only.
- Brand values stay the legacy ones (spec §3.4).
- The following stay unchanged until R4 (spec §6.6): brand text in documentation, READMEs, translated READMEs, `LICENSE`, `CONTRIBUTING.md`, and `promo-video/`.
- The `middleware.ts` → `proxy.ts` rename is deferred (Ruling R-1; the founder confirmed the deferral on 2026-09-16).

**Output neutrality (AD1)**
- Every task keeps output byte-identical to the goldens captured in Tasks 1–2, except the changes listed under "Intended output changes".
- A task that makes an intended change:
  - regenerates only the golden files that change;
  - checks that the golden diff contains nothing else;
  - names the change IDs in its commit message.

**Frozen identifiers (AD1)**
- The Atom id prefix `tag:datacubeai.space,2026:` and the anchor id `dcai-takeaways` never derive from brand values.
- They live in `FROZEN_IDS` in `ai-information-hub/lib/brand.ts`.

**Brand sources**
- Frontend: `ai-information-hub/lib/brand-defaults.json` and `ai-information-hub/lib/brand.ts`.
- Backend: `ai-hub-backend/app/config.py`.
- After Task 17, no other tracked code or workflow file contains a legacy brand string (checked by `scripts/brand_guard.py`).

**No infrastructure changes**
- No Vercel, Railway or GitHub variable has to be set. Every brand variable defaults to the legacy value.
- Checked on 2026-09-16, variable names only: the Railway `api` service sets `NEWSLETTER_FROM_EMAIL` and `CORS_ORIGINS`, and no brand variable (`SITE_URL`, `BRAND_NAME`, `BRAND_SHORT_NAME`, `FOUNDER_NAME`, `NEWSLETTER_FROM_NAME`, `API_KEY_PREFIX`, `RSS_USER_AGENT`, `GITHUB_ISSUES_URL`, `API_TITLE`). Explicit values keep winning over derived defaults.
- The repository defines no GitHub Actions variables, so workflows use the `vars.SITE_URL` fallback.
- Release step 1 repeats these checks.

**AD7 copy**
- Labels use the exact strings in "AI label copy".
- Never write "Edited by …".
- No person-like byline: "Editorial", "Redaktion", "编辑部", "Team".
- The founder appears only as `Organization.founder` and as "Made by <founder>", and only when the founder name is set. The founder chose the byline on 2026-09-16: `Deepviews`, rendering "Made by Deepviews". The name still never appears in code — Release step 0 sets the variables (Ruling R-10).

**Authorization (spec §3.6)**
- Pre-approved:
  - pushing this branch and opening a PR;
  - test emails to the founder's inbox.
- Each needs explicit founder approval:
  - merging to `main` (deploys Vercel);
  - `railway up`;
  - setting any Vercel, Railway or GitHub variable;
  - emails to subscribers;
  - DNS changes.

**Test safety (spec §3.7)**
- Tests and scripts never touch the production database.
- `ai-hub-backend/.env` stays renamed to `.env.r2-backup` for the whole execution.
- Every local `python`, `pytest` or `alembic` command sets a local `DATABASE_URL` in the same command.
- Never wrap Python in `railway run`.

**Frontend builds**
- `next build`, `npm run build` and `npm run dev` run in CI only; they fetch the production API.
- Locally, run `npm test` and `npm run lint`.
- Capture or rewrite frontend goldens (`-u`) under CI's Node major version, 22: prefix the command with `export PATH=/usr/local/bin:$PATH &&` and check that `node --version` prints `v22`. The default local Node is 24. The plan review found identical golden output under both; capturing under 22 keeps CI the reference.

**Python compatibility**
- Backend code targets Python 3.11 (`ruff.toml`).
- `scripts/` at the repository root uses only the standard library and runs on Python 3.9+ (`from __future__ import annotations`).

**Untracked files**
- Never stage or edit `ai-information-hub/lib/text-split.ts` or `docs/monetization-plan.md`.

**Public repository**
- Committed files contain no absolute local paths (write `<repo-root>`), no employer references, no email addresses of real people and no real subscriber data.
- Golden fixtures are synthetic.
- The controller scans the branch before every push.

**Non-ASCII in existing source**
- These files store non-ASCII characters as `\uXXXX` escapes: `ai-information-hub/lib/translations.ts`, the tool pages, and `EMAIL_STRINGS`.
- Edit those strings only with the Python snippets in the tasks. Tool transports decode `\u`, so never retype the escapes by hand.
- New files may contain UTF-8 text directly.

**Release timing**
- Merging to `main` redeploys Vercel only.
- Merge only after the day's Daily Newsletter run has sent, and run `railway up` in the same sitting, so no email leaves the old backend while the new AI disclosure copy is live (Ruling R-14).
- Run `railway up` only when all of these hold:
  - the day's Daily Newsletter run has sent (check its log, not just the conclusion);
  - no Daily Collection or Daily Newsletter run is in progress (`gh run list --workflow daily-collect.yml --limit 1`, and the same for `daily-newsletter.yml`);
  - no translation backfill is running.

**Commits**
- One commit per task; fix-up commits are allowed.
- Every commit message ends with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Run git from the repository root and stage by explicit path: `git -C <repo-root> add <paths>`.
- Use `':(literal)'` pathspecs for paths that contain `[`.

## Intended output changes

**Phase 1 — brand source of truth (Tasks 5–12)**

| ID | Change |
|---|---|
| B1 | **One spelling.** "DataCube AI" becomes "Data Cube AI" wherever it is rendered: the four tool pages (text, metadata, JSON-LD, image alt text), the `SoftwareApplicationSchema` author and publisher, the week page's editorial attribution and byline, `/llms.txt`, the LLM prompts, and the collector's fallback source name. |
| B2 | **No double-branded titles.** The rendered `<title>` names the brand once on week pages (de, en, fr, es, pt), `/editorial-policy`, `/ai-disclosure`, `/source-methodology`, `/corrections`, `/login`, `/about` ("About Data Cube AI") and `/contact` ("Contact Data Cube AI"). For a missing story, the article page's `generateMetadata` returns `title: 'Article not found'`, which the title template brands once; the 404 body itself is `components/not-found-page.tsx` and names no brand. Week pages in zh, ja and ko gain " \| Data Cube AI" in `og:title`, `twitter:title` and the CollectionPage `name`, so all eight languages match their `<title>`. |
| B3 | **robots.txt layout.** `app/robots.ts` generates the file. Comments and blank lines change, and each group lists its `Allow` lines before its `Disallow` lines. User agents, paths, crawl delays and sitemaps are unchanged. |
| B4 | **CSV filename.** `/api/deals/export.csv` downloads as `data-cube-ai-deals.csv` (was `datacube-ai-deals.csv`). |

**Phase 2 — AI labeling and attribution (Tasks 13–16)**

| ID | Change |
|---|---|
| L1 | **AI label** near the top of: week/day pages, article pages, topic pages, the home feed masthead, the AI News Aggregator tool page's live preview, every email, the `/feed.xml` and `/newsletter.xml` subtitles, each `/newsletter.xml` entry, `/api/content-summary`, `/llms.txt`, and the OG image. |
| L2 | **Bylines.** The label replaces the week page's "By Data Cube AI Editorial" and the article page's "Data Cube AI Editorial / Redaktion / 编辑部 / …". The week page's editorial-brief attribution drops the editorial byline. |
| L3 | **Organization authorship.** Article JSON-LD `author` becomes the Organization (name and url). The root metadata `authors` becomes the Organization (was "Data Cube Team"). |
| L4 | **AI disclosure page.** Its metadata no longer claims human review. A new first section says content is AI-generated and published without human review. |
| L5 | **Content-summary footer** says "AI-generated" instead of "AI-assisted". |

Nothing changes while `NEXT_PUBLIC_FOUNDER_NAME` (frontend) and `FOUNDER_NAME` (backend) are unset; Release step 0 sets both to `Deepviews` (founder decision, 2026-09-16).

## AI label copy

There is one copy table per app:
- frontend: `ai-information-hub/lib/ai-label.ts`;
- email: `EMAIL_STRINGS` (`ai_label`, `ai_label_link`) in `ai-hub-backend/app/services/newsletter_sender.py`.

| lang | label | short label | link text (to `/ai-disclosure`) |
|---|---|---|---|
| en | AI-generated: summaries written by AI from the linked sources. | AI-generated | How we use AI |
| de | KI-generiert: Die Zusammenfassungen schreibt eine KI auf Grundlage der verlinkten Quellen. | KI-generiert | So nutzen wir KI |
| zh | AI 生成：摘要由 AI 根据所链接的来源撰写。 | AI 生成 | 我们如何使用 AI |
| fr | Généré par IA : résumés rédigés par une IA à partir des sources citées. | Généré par IA | Notre usage de l'IA |
| es | Generado por IA: resúmenes redactados por IA a partir de las fuentes enlazadas. | Generado por IA | Cómo usamos la IA |
| pt | Gerado por IA: resumos escritos por IA a partir das fontes indicadas. | Gerado por IA | Como usamos a IA |
| ja | AI生成：要約はリンク先の情報源をもとにAIが作成しています。 | AI生成 | AIの利用について |
| ko | AI 생성: 요약은 링크된 출처를 바탕으로 AI가 작성했습니다. | AI 생성 | AI 활용 방식 |

**Week page editorial-brief attribution** (replaces `labelEditorialAttribution`):

| lang | text |
|---|---|
| de | `KI-generierte Analyse — mehr erfahren` |
| en | `AI-generated analysis — learn how we work` |
| zh | `AI 生成的分析 — 了解我们的方法` |
| fr | `Analyse générée par IA` |
| es | `Análisis generado por IA` |
| pt | `Análise gerada por IA` |
| ja | `AI 生成分析` |
| ko | `AI 생성 분석` |

**OG image:** it uses the label in de, en, fr, es and pt, and the English label for zh, ja and ko (Ruling R-5).

## Command reference

| Purpose | Command |
|---|---|
| Backend unit tests | `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m "not integration" -q` |
| One backend test file | `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/<file>.py -q` |
| Backend integration tests | `cd <repo-root>/ai-hub-backend && DATABASE_URL=postgresql://postgres:test@localhost:5433/aihub_test OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m integration -q` (Docker container `aihub-test-pg`) |
| Backend lint | `cd <repo-root>/ai-hub-backend && venv312/bin/python -m ruff check app/ scripts/ tests/` |
| Rewrite backend goldens (intended changes only) | `cd <repo-root>/ai-hub-backend && UPDATE_GOLDENS=1 DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_brand_goldens.py -q` |
| Frontend unit tests | `cd <repo-root>/ai-information-hub && npm test` |
| One frontend test file | `cd <repo-root>/ai-information-hub && npx vitest run <path>` |
| Rewrite frontend goldens (intended changes only) | `cd <repo-root>/ai-information-hub && export PATH=/usr/local/bin:$PATH && node --version && npx vitest run <path> -u` (Node 22, see Frontend builds) |
| Frontend type check | `cd <repo-root>/ai-information-hub && npm run lint` |
| Brand guard, whole repository | `cd <repo-root> && python3 scripts/brand_guard.py` |
| Brand guard, some files | `cd <repo-root> && python3 scripts/brand_guard.py <repo-relative path> …` |
| Script tests | `cd <repo-root> && python3 -m unittest scripts/test_brand_guard.py scripts/test_page_snapshot.py` |
| Golden diff review | `git -C <repo-root> diff --stat -- ai-information-hub/test/golden/__goldens__ ai-hub-backend/tests/goldens`, then `git -C <repo-root> diff -- <golden file>` |

## File map

| Path | Change | Task | Responsibility |
|---|---|---|---|
| `ai-information-hub/vitest.config.ts` | modify | 1 | test discovery includes `test/**` |
| `ai-information-hub/test/fixtures/api.ts` | create | 1 | deterministic API fixture and fetch stub |
| `ai-information-hub/test/golden/golden.ts` | create | 1 | golden helpers |
| `ai-information-hub/test/golden/{routes,structured-data,metadata,pages,static-files}.test.ts` | create | 1 (12 removes `static-files`) | output goldens |
| `ai-information-hub/test/golden/__goldens__/**` | create | 1 | golden files, regenerated only for intended changes |
| `ai-hub-backend/tests/{golden.py,newsletter_fixtures.py,test_brand_goldens.py}` | create | 2 | backend goldens |
| `ai-hub-backend/tests/goldens/**` | create | 2 | golden files |
| `scripts/brand_guard.py`, `scripts/test_brand_guard.py` | create | 3 | legacy brand guard |
| `.github/workflows/ci.yml` | modify | 3, 4 | `brand-guard` job |
| `scripts/page_snapshot.py`, `scripts/test_page_snapshot.py`, `scripts/page_snapshot_paths.txt` | create | 4 | before/after production comparison |
| `ai-information-hub/lib/brand-defaults.json`, `lib/brand.ts`, `lib/brand.test.ts` | create | 5 | frontend brand source |
| `ai-information-hub/next.config.mjs`, `test/next-config.test.ts` | modify / create | 5 | apex redirect from the brand config |
| `ai-information-hub/vercel.json` | delete | 5 | redirect moved to `next.config.mjs` |
| `ai-information-hub/lib/server/api-guard.ts` | modify | 5 | allowed hosts from `BRAND` |
| `ai-hub-backend/app/config.py`, `tests/test_brand_settings.py` | modify / create | 6 | backend brand settings |
| `ai-hub-backend/app/services/newsletter_sender.py` | modify | 6, 15 | brand from settings; AI label; founder line |
| `ai-hub-backend/app/main.py` | modify | 6 | API title from settings |
| `ai-hub-backend/tests/test_newsletter_brand.py` | create | 6 | email follows the brand settings |
| `ai-hub-backend/tests/test_newsletter_{recipient_messages,test_send,translation_gate}.py` | modify | 6 | `site_url` argument and setting |
| `ai-hub-backend/app/routers/{deals,developer}.py`, `app/services/{rss_fetcher,collector,llm_processor}.py`, `app/models/week.py`, `app/schemas/trend.py`, `.env.example`, `tests/test_developer_rate_limit_message.py` | modify | 7 | backend identity from settings |
| `ai-hub-backend/tests/test_brand_identity.py` | create | 7 | backend identity tests |
| `ai-information-hub/lib/site-metadata.ts`, `components/root-shell.tsx`, `app/(site)/page.tsx`, `app/(localized)/[lang]/page.tsx`, `components/structured-data.tsx`, `app/sitemap.ts`, `app/news-sitemap.xml/route.ts`, `app/feed.xml/route.ts`, `app/newsletter.xml/route.ts`, `app/api/content-summary/route.ts`, `app/api/og/route.tsx`, `app/api/chat/route.ts` | modify | 8 (14, 16) | brand from `BRAND`; labels; attribution |
| `ai-information-hub/app/(localized)/[lang]/tools/{ai-news-aggregator,ai-news-api,ai-report-generator,ai-stock-tracker}/page.tsx` | modify | 9 (13) | `fillBrand` helpers; AI label on the aggregator's live preview |
| `ai-information-hub/app/(site)/week/[weekId]/page.tsx`, `app/(localized)/[lang]/week/[weekId]/page.tsx`, `app/(localized)/[lang]/news/[periodId]/[storyId]/page.tsx`, `app/(localized)/[lang]/topic/[topic]/page.tsx` | modify | 10 (13, 16) | brand, titles, labels, attribution |
| `ai-information-hub/app/(site)/{about,ai-disclosure,editorial-policy,source-methodology,corrections,contact,impressum,datenschutz,premium,for-teams,funding}/page.tsx`, `app/(site)/login/{layout,page}.tsx`, `components/{right-sidebar,sidebar,feed,home-page-client}.tsx`, `lib/translations.ts` | modify | 11 (13, 16) | brand, titles, footers |
| `ai-information-hub/app/(site)/trust-page.tsx` | modify | 16 | founder footer line |
| `ai-information-hub/app/robots.ts`, `app/robots.test.ts` | create | 12 | generated robots.txt |
| `ai-information-hub/app/llms.txt/route.ts`, `app/llms.txt/route.test.ts` | create | 12 (14) | generated llms.txt |
| `ai-information-hub/public/robots.txt`, `ai-information-hub/public/llms.txt` | delete | 12 | replaced by routes |
| `.github/workflows/daily-collect.yml` | modify | 12 | `vars.SITE_URL` with fallback |
| `ai-information-hub/lib/ai-label.ts`, `lib/ai-label.test.ts`, `components/ai-label.tsx`, `components/feed-masthead.tsx` | create | 13 | label copy and component |
| `ai-information-hub/test/ai-label-surfaces.test.ts` | create | 13 (14) | label render tests per surface and language |
| `ai-hub-backend/tests/test_newsletter_ai_label.py` | create | 15 | email label tests |
| `ai-information-hub/test/attribution.test.ts` | create | 16 | attribution tests |
| `README.md`, `ai-information-hub/README.md`, `ai-hub-backend/README.md`, `docs/documentation-maintenance.md` | modify | 17 | documentation; the two `CLAUDE.md` files are git-ignored, so they are edited locally and never staged |

## Task order

| Task | Deliverable | Depends on |
|---|---|---|
| 1 | Frontend golden harness | — |
| 2 | Backend golden harness | — |
| 3 | Brand guard and CI job | — |
| 4 | Page snapshot tool | 3 |
| 5 | Frontend brand config, apex redirect, API guard hosts | 1 |
| 6 | Backend brand settings, email, API title | 2 |
| 7 | Backend identity in deals, developer keys, RSS, collector, prompts | 6 |
| 8 | Shared frontend surfaces | 1, 5 |
| 9 | Tool pages | 1, 5 |
| 10 | Week, article and topic pages | 1, 5 |
| 11 | Trust, legal and marketing pages; components; login; translations | 1, 5 |
| 12 | Generated robots.txt and llms.txt; workflow site URL | 1, 5 |
| 13 | AI label module and HTML surfaces | 8–11 |
| 14 | AI label on feeds, summary, llms.txt and the OG image | 12, 13 |
| 15 | AI label and founder line in emails | 6 |
| 16 | Organization attribution, founder, AI disclosure copy | 13 |
| 17 | Documentation and final guard | 1–16 |

**Execution phases (Ruling R-11)**
- **Phase A, runs first:** Tasks 3, 4, 2, 6, 7, 15, in that order. They touch only the backend, the repository scripts and CI, which the Vercel cost work does not change.
- **Phase B, waits for the cost work:** Tasks 1, 5, 8–14, 16, 17. They start only after Execution setup Step 5 passes.

## Rulings recorded in this plan

Each ruling states what was decided, why, and what it costs if wrong.

**R-1 — `middleware.ts` → `proxy.ts` is deferred out of R2, pending founder confirmation (spec §6.2 lists the codemod under SP2).**
- Why:
  - Next.js 16 builds a proxy file for the Node.js runtime whatever its config (`next@16.0.10`, `dist/build/index.js`). `middleware.ts` keeps running at the edge and only logs a deprecation warning.
  - The rename moves every matched request's middleware run from the edge to Node.js compute. Before the WAF rule that was about 266K runs a day (`.ai-collab/context/vercel-cost-analysis-2026-09.md` §2: 133K per 12 h). With `meta-externalagent`, about 85% of requests, now denied at the firewall, it is roughly 40K a day (estimated, not re-measured), and the cost branch narrows the matcher further.
  - The cost is small but unmeasured, and R2's before/after comparison should not also carry a runtime change.
  - The spec wants the codemod so that R4's URL work lands in `proxy.ts`. Nothing in R2 or R3 needs it.
- Trigger: once the cost work has been live for 7 days, and before R4's URL work starts, run the codemod in its own PR and compare middleware/proxy invocations and latency over 24 hours.
- Status: the founder confirmed the deferral on 2026-09-16. It stays out of R2; the trigger above governs when it runs.
- Cost if wrong: one small PR later, and a deprecation warning in build logs until then.

**R-2 — One brand spelling (B1).**
- Why: a single `name` is what makes a rename one config value (goal G1). "DataCube AI" was an inconsistency confined to the tool pages, the prompts and one attribution.
- Cost if wrong: the brand spelling in four tool page titles.

**R-3 — Week page titles (B2).** `<title>`, `og:title`, `twitter:title` and the CollectionPage `name` all read "<page title> | <brand>" in every language.
- Cost if wrong: three strings per zh, ja and ko week page.

**R-4 — `lib/settings-context.tsx` stays unchanged.**
- Why:
  - After Task 11 deletes the unused `dataCube` and `team` keys, no translation contains the brand.
  - Spec §6.2 only names where the generic lookup lives.
  - A placeholder pass with nothing to fill would be dead code.
- Cost if wrong: one line in `t()` when a translation first needs the brand.

**R-5 — The OG image uses the English label for zh, ja and ko.**
- Why: the OG renderer bundles only a Latin font. For other scripts it downloads Noto Sans from Google Fonts during the render, which adds a font fetch to every uncached OG render while the cost work is making those renders cheap. The page itself and its metadata carry the localized label.
- Cost if wrong: localized CJK labels on the image later, with a bundled CJK font subset (R4 assets work).

**R-6 — The home feed masthead and the AI News Aggregator tool page's live preview get the label; the chat assistant, report generator and `/funding` do not.**
- Why:
  - AD7 covers every surface that renders AI-written prose. The home feed and the aggregator's live preview show the same AI summaries as the day pages.
  - Of the four tool pages, only the aggregator fetches and renders summaries; the AI News API page's `fetch` is a code sample (checked 2026-09-16).
  - The chat assistant and report generator are interactive tools named "AI" whose answers are not published prose.
  - `/funding` rows carry their own AI-extraction disclosure.
- Cost if wrong: one label line per tool.

**R-7 — How page output is proven neutral.**
- In the branch: pages render in Vitest through their server components. This was checked on 2026-09-15 for tool, trust, week, article and topic pages, and the plan review rendered all 27 golden pages. `Math.random` is stubbed for every rendered golden, because the login page draws with it.
- Outside Vitest's reach are the client-rendered home feed, the sidebars and the real HTML head. The brand guard and review cover them, and so does the production snapshot: it keeps all visible body text, sidebars and footers included, and it includes the `/en` and `/de` home pages.
- Preview deployments sit behind Vercel SSO, so the comparison runs against production right before and right after the merge, inside one window with no collection or backfill.
- Cost if wrong: a production window until rollback.

**R-8 — Goldens and the snapshot tool are committed.**
- Why: the goldens use synthetic fixtures, and the snapshot tool is reused for the R4 rename.
- Cost: about 0.5 MB of text in a public repository.

**R-9 — `api_key_prefix` changes only new developer keys.**
- Why: `developer.py` looks stored keys up by exact value, so existing `dcai_` keys keep working after any prefix change.

**R-10 — "Made by <founder>" is English on the site and in emails, and renders only when a founder name is set.**
- Why: spec §3.2 and AD7 require attribution under the founder's real name. The founder chose `Deepviews` as the byline on 2026-09-16 — it is a brand the founder owns, not a person-like editorial byline, so it satisfies the AD7 rule against "Editorial"/"Redaktion"-style names. The value still never appears in code; it is configuration.
- Release step 0 sets `NEXT_PUBLIC_FOUNDER_NAME` (Vercel) and `FOUNDER_NAME` (Railway) to `Deepviews`; each variable still needs the founder's approval at the time it is set, because both are production configuration changes.
- Cost if wrong: the footer line and `Organization.founder` appear later than the spec intended.

**R-11 — The Vercel cost work lands first, and R2's frontend tasks follow its tree.**
- The cost branch `fix/vercel-cost-cuts` was code-ready but uncommitted in its own worktree on 2026-09-16. It:
  - moves every page into the route groups `app/(site)` and `app/(localized)/[lang]`;
  - deletes `app/layout.tsx` in favor of `lib/site-metadata.ts`, two group layouts and `components/root-shell.tsx`;
  - moves the article noindex from a middleware header into page metadata;
  - adds robots rules and moves `/api/og` to the Node.js runtime.
- Why cost first: it is a live cost incident with the founder's decisions already taken, and R2 has no frontend code yet. Re-planning unwritten tasks is cheap; porting written ones through 28 renames and a deleted root layout is not.
- Phase A (Tasks 3, 4, 2, 6, 7, 15) touches nothing the cost branch touches, so it runs now. Phase B (Tasks 1, 5, 8–14, 16, 17) waits for Execution setup Step 5: the cost branch merged, this branch rebased, and every Phase B path present. Task 1 captures its goldens only after that, because the cost work legitimately changes the head, the noindex placement and the OG route.
- Phase B task text is rebased onto the cost tree (paths, anchors, robots rules, release checks) before Phase B starts, and re-checked against the merged tree in Step 5.
- This R2 work never commits, pushes or merges the cost branch; that belongs to its own session and the founder.
- R2 never changes response headers, caching or the matcher.
- Cost if wrong: Phase B waits on the cost merge. If the cost branch changes shape before it merges, Step 5 catches it and the affected task text is patched.

**R-12 — `DISCLOSURE` in `app/routers/deals.py` stays a module constant, now computed from the settings at import.** Existing callers and the Task 2 golden keep referencing the name.

**R-13 — The CSV download name derives from the brand (B4).**
- Why: the name is a `Content-Disposition` suggestion, not an identifier anything links to or parses. It follows the brand like any other name, and R4 renames it through the config.
- Cost if wrong: a reader's script that expects `datacube-ai-deals.csv` on disk.

**R-14 — Release order: merge after the day's newsletter has sent, then `railway up` in the same sitting, from `main`.**
- Why: the new AI disclosure copy says every email carries the label. With this order, no email leaves the old backend while that copy is live. The backend deploys from the merge commit, never from the feature branch.
- Cost if wrong: a window of hours in which the disclosure page overstates the email label.

## Execution setup (controller, once, before Task 1)

- [ ] **Step 1: Confirm the branch and a clean tree**

```bash
git -C <repo-root> switch feat/r2-brand-ssot-ai-labels
git -C <repo-root> status --short
```

Expected: only `?? ai-information-hub/lib/text-split.ts` and `?? docs/monetization-plan.md`, plus this plan file if it is not yet committed.

- [ ] **Step 2: Commit this plan on the branch (after the plan review)**

```bash
git -C <repo-root> add docs/superpowers/plans/2026-09-16-r2-brand-ssot-ai-labeling.md
git -C <repo-root> commit -m "docs(plan): R2 brand SSOT and AI labeling implementation plan

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Park the production `.env` for the whole execution**

```bash
mv <repo-root>/ai-hub-backend/.env <repo-root>/ai-hub-backend/.env.r2-backup
```

- [ ] **Step 4: Record the baseline**

```bash
cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m "not integration" -q
cd <repo-root>/ai-hub-backend && DATABASE_URL=postgresql://postgres:test@localhost:5433/aihub_test venv312/bin/python -m alembic upgrade head
cd <repo-root>/ai-hub-backend && DATABASE_URL=postgresql://postgres:test@localhost:5433/aihub_test OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m integration -q
cd <repo-root>/ai-hub-backend && venv312/bin/python -m ruff check app/ scripts/ tests/
cd <repo-root>/ai-information-hub && npm run lint && npm test
```

Expected: everything green. Write the pass and deselect counts into the ledger. This baseline is for `main` at `cac43c7`; Step 5 repeats the frontend part after the rebase.

- [ ] **Step 5: Phase B gate (before Task 1)**

Run this only after the founder has merged the Vercel cost work (Ruling R-11).

Execution paused between Phase A and Phase B, and `ai-hub-backend/.env` was restored for the pause. Park it again before any other command: `mv <repo-root>/ai-hub-backend/.env <repo-root>/ai-hub-backend/.env.r2-backup`.

```bash
git -C <repo-root> fetch origin
git -C <repo-root> log --oneline -1 origin/main -- ai-information-hub/lib/site-metadata.ts
git -C <repo-root> rebase origin/main
git -C <repo-root> log --oneline HEAD..origin/main
ls '<repo-root>/ai-information-hub/app/(site)' '<repo-root>/ai-information-hub/app/(localized)/[lang]'
test ! -e <repo-root>/ai-information-hub/app/layout.tsx && echo "root layout removed"
cd <repo-root>/ai-information-hub && npm run lint && npm test
```

Expected:
- the first `log` prints the commit that added `lib/site-metadata.ts`, and the second prints nothing;
- the rebase replays the Phase A commits without conflicts, since they touch no frontend file;
- both route-group directories exist and `app/layout.tsx` does not;
- the frontend type check and tests are green: `Tests  58 passed (58)` in 5 test files on the cost tree as checked on 2026-09-16 (the cost work adds the 29 tests of `lib/middleware-matcher.test.ts`). Record the counts as the Phase B baseline.

Then check that every file Phase B modifies exists:

```bash
cd <repo-root> && python3 - <<'EOF'
import re
from pathlib import Path

plan = Path("docs/superpowers/plans/2026-09-16-r2-brand-ssot-ai-labeling.md").read_text(encoding="utf-8")
missing = []
created = set()  # files an earlier task creates, such as the llms.txt route and label tests that Task 14 modifies
for task in re.split(r"\n### Task ", plan)[1:]:
    number = int(task.split(":", 1)[0])
    if number in (2, 3, 4, 6, 7, 15):
        continue
    for path in re.findall(r"^- Modify: `([^`]+)`", task, flags=re.M):
        path = re.sub(r":\d+(-\d+)?$", "", path)
        if path not in created and not any(char in path for char in "{*") and not Path(path).exists():
            missing.append((number, path))
    created.update(re.findall(r"^- Create: `([^`]+)`", task, flags=re.M))
print(missing or "every Phase B path exists")
EOF
```

Expected: `every Phase B path exists`.

Finally, the read-only Vercel check. In the project's Environment Variables settings, confirm that Production defines none of `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BRAND_NAME`, `NEXT_PUBLIC_BRAND_SHORT_NAME` and `NEXT_PUBLIC_FOUNDER_NAME`, or that each equals the default. Read names only; the CLI has no credentials, so use the founder's logged-in Chrome. `lib/server/api-guard.ts` already reads `NEXT_PUBLIC_SITE_URL`. If it points anywhere but the canonical site, rule on it before Task 5, because canonical URLs would move.

Then check that the files Phase B was rebased against did not change before the merge. The fingerprints below were taken on 2026-09-16 from the cost worktree, plus the two local `CLAUDE.md` files:

```bash
cd <repo-root> && shasum -a 256 -c <<'EOF'
bc33c6df89c8f1c35e695e69f4ca31b2c4075d6f07761790dadf7265ddcb60cb  .github/workflows/daily-collect.yml
0a12f7d78f24ce4f06936981084e6f6fe7908a840e4ef6cbc87d57428263465b  CLAUDE.md
1e31cf196c7d41658dd41364af70a83e918b896c744a0b3ff4f4602b696ccb8c  README.md
70bee4b43d80ada9d93ef7af4d248824c4a8c39b02a75f9b4b63b85d152975a5  ai-hub-backend/README.md
c8b576fe8d91e83cf3288dbc9b1ab8b0a9aac1aceaa79b6d03b678d571f330c2  ai-information-hub/CLAUDE.md
adaba2e9051631b5273bd3a5877a6fc9e08b0737b18ccdd1ca789fc56fe4cb02  ai-information-hub/README.md
43c73587de02bab685f0b52d5b2832bb7e2611693964bfb5456c2a38351ef7ca  ai-information-hub/app/(localized)/[lang]/news/[periodId]/[storyId]/page.tsx
56d561d83430dec1d543324b9bbc2dce30558d597a38bda71c456af538c63851  ai-information-hub/app/(localized)/[lang]/page.tsx
142d8eaa6fa3b8c2980688f0d183c43b962d53a09b0439ac2aaea302ac8db206  ai-information-hub/app/(localized)/[lang]/tools/ai-news-aggregator/page.tsx
e66f8abf2f09398670b24366187bd455ed41189d0011483a52551bd132eee026  ai-information-hub/app/(localized)/[lang]/tools/ai-news-api/page.tsx
08fa1aff04719f3ca5ec46fb73ddecaf5c181cf429770f9d7edbd67736305664  ai-information-hub/app/(localized)/[lang]/tools/ai-report-generator/page.tsx
e3557f28dc951b6d7db0964affec30c860d9b8caaf4bf8612c02a2facaf59260  ai-information-hub/app/(localized)/[lang]/tools/ai-stock-tracker/page.tsx
2fa74c1494dd3941da9e4c6ea91fc6398174bd590e2235debeeff1a781cc2f7f  ai-information-hub/app/(localized)/[lang]/topic/[topic]/page.tsx
0dbe3de03d72bf6613c2883fc05d2d3f1e9aac4e19e86a0e6fc05b3a039cf89f  ai-information-hub/app/(localized)/[lang]/week/[weekId]/page.tsx
9f3aabfbff805e76554a3f2191c4ec4db23de94b92a35e0edba6a7860f0734f8  ai-information-hub/app/(site)/ai-disclosure/page.tsx
8e4bc940e6c5738fc656790ca47a7efc2f4cf36fa4ca0384a547945a21a24f2a  ai-information-hub/app/(site)/login/layout.tsx
2c91e4e5a99b5b9c322d9adcf00e0c105791bded5d3e8a8a2542970d74256774  ai-information-hub/app/(site)/login/page.tsx
16ece465c6b3ced49bf5b8a1a3567333da69669a1fccfebc5045470b7b1502f7  ai-information-hub/app/(site)/page.tsx
d9c5b55ca590f06bde306aab9ba26808b2bcab7f857be5c25f780192a97aad5c  ai-information-hub/app/(site)/trust-page.tsx
4e5a784634eebbf15e740be61aa3274199acd8af9759dd6baafe719b5e316afc  ai-information-hub/app/(site)/week/[weekId]/page.tsx
2803bfa481de9cafe9a3f856c45d499c16d53c16c4ee62920862b6cb34dc434d  ai-information-hub/app/api/chat/route.ts
c943ee9b36122d51a1905d147bd9de57222ef9f6f10d6481dd1834be8765eb15  ai-information-hub/app/api/content-summary/route.ts
5b218063357fb639b8e7c05284e70b41bf7dcc0f3a887f42289b53689cc77954  ai-information-hub/app/api/og/route.tsx
738a72296436e1d0cc686a05784b1a1b8090b5bc4b31d8eb7c2c7a4f05bd1a99  ai-information-hub/app/feed.xml/route.ts
e57545ae18b131f414147da7551c0ac2a8575d90be635b01de8fa3baf85aa2d9  ai-information-hub/app/news-sitemap.xml/route.ts
3c9c06f3ee4b23acab7c8f6a47bf157b4981bd7c22993d609756e945df4ff996  ai-information-hub/app/newsletter.xml/route.ts
b37e6a9e561b600e5812edbafefdd4782d9f3cf6e664f762f767a1c6a10cc79a  ai-information-hub/app/sitemap.ts
2aa8652cafac8eec7d60a476dd83f1cfff1352534060a8aaf919dc611bd79a3a  ai-information-hub/components/feed.tsx
31f1b89c95f98fa0d48be41643b60cfdf8a329a0bc8d80ffa540e648710ed5ca  ai-information-hub/components/home-page-client.tsx
b08fd2d71cf2696da08a3be817cb2b377ec3524c22c25924b812e17cedd420d3  ai-information-hub/components/right-sidebar.tsx
cef49074512ac64e4ffbb3e1793e19ea1ffbf4e8882b5e1ace3a6b77445a55fe  ai-information-hub/components/root-shell.tsx
00ac1d92efe346916fefeca9c62d59b3a10ca17ebb6779050385dc7a0d5bf3cc  ai-information-hub/components/sidebar.tsx
8a5590d4c9004918894515878a7f22a7423689876d6daeb5d243f6f8fd0332a3  ai-information-hub/components/structured-data.tsx
a63e195a0b51101af77c37884a4e5e4e5e431019b7fbd8f6b2f805ecc99efa8c  ai-information-hub/lib/server/api-guard.ts
e8b58669075e7af7d4feaa6d075380c47dc0e3d11aac88604bf0e863d126d914  ai-information-hub/lib/site-metadata.ts
416e7d1248b2b288f6b6be35b26fdd4dcba02130c1621592692248570ac2f085  ai-information-hub/lib/translations.ts
1189d819882da447050540f77e5be391ec3bb6619f023f20e7b581a71b49cbe6  ai-information-hub/next.config.mjs
bf9be346d8c40d3f55a92f78090a06192f8a38a5684498ffba296d992005f56e  ai-information-hub/vitest.config.ts
f09d4b23ea97295721a7c54a0b48584edd4eeeb29b5158982b8a4f7b6897bd7b  docs/documentation-maintenance.md
EOF
```

Expected: every line ends in `OK`. For each `FAILED` file, re-check the anchors of every Phase B task that modifies it against the merged file.

If a path is missing, or the cost work changed shape before merging, patch the affected task text, have the patch reviewed, and commit it before dispatching Task 1.

---

## Brand replacement rules (Tasks 8–12)

The controller pastes this section into every dispatch for Tasks 8–12. The backend rules are in Tasks 6 and 7.

| Found in frontend code | Replace with |
|---|---|
| Module constant that holds the site URL (`SITE_URL`, `BASE_URL`, `baseUrl`) | Keep the constant and set it to `BRAND.siteUrl` |
| Any other site URL | `absoluteUrl('/about')`, `` absoluteUrl(`/${lang}`) ``. A bare site root stays `BRAND.siteUrl` (no trailing slash) unless the old string ended in `/`; then use `absoluteUrl('/')` |
| Brand inside a string or template literal outside a per-page translation map | Template literal with `${BRAND.name}`; as a JSX attribute: `` alt={`${BRAND.name} …`} `` |
| Brand as JSX text | `{BRAND.name}` |
| "Data Cube" without "AI" (wordmark, copyright) | `BRAND.shortName` |
| Brand inside a per-page translation map read through the page's `t(map, lang)` helper | The placeholder `{brand}`. The helper returns `fillBrand(map[lang] \|\| map.en)` |
| `datacubeai.space` shown as text (link text, citation) | `BRAND.apexHost` |
| The Atom id prefix `tag:datacubeai.space,2026:` | `${FROZEN_IDS.atomTagPrefix}` |
| `dcai-takeaways` | `FROZEN_IDS.takeawaysAnchorId` |
| `https://github.com/Rswcf/DataCube-AI-Space/issues` | `BRAND.githubIssuesUrl` |
| A page `title` that repeats the brand the root template (`%s \| <brand>`) already appends | Drop the brand from `title`. Where the branded string must stay (`openGraph.title`, `twitter.title`, JSON-LD names), use `brandedTitle(…)` |
| A comment that names the brand | Reword the comment without the brand |

Import only what the file uses: `import { BRAND, FROZEN_IDS, absoluteUrl, brandedTitle, fillBrand } from '@/lib/brand'`.

Every task ends with the same three checks:
- the guard reports nothing for the task's files;
- the goldens pass, or change only as the task says;
- `npm run lint` passes.

**Optional helper for quoted literals.**
- What it does:
  - converts single- and double-quoted literals that contain the brand into template literals;
  - wraps JSX attribute values in braces;
  - skips comment lines and literals that already contain a backtick or `${`.
- After running it, review every converted line in `git diff`: an apostrophe in JSX text can look like a quote to it.

```bash
cd <repo-root> && python3 - <repo-relative file> <<'EOF'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
LITERAL = re.compile(r"'(?:[^'\\\n]|\\.)*'|\"(?:[^\"\\\n]|\\.)*\"")
BRAND = re.compile(r"Data ?Cube AI")


def convert(match):
    token = match.group(0)
    inner = token[1:-1]
    if not BRAND.search(inner) or "`" in inner or "${" in inner:
        return token
    inner = inner.replace("\\'", "'") if token[0] == "'" else inner.replace('\\"', '"')
    template = "`" + BRAND.sub("${BRAND.name}", inner) + "`"
    is_jsx_attribute = match.start() > 0 and match.string[match.start() - 1] == "="
    return "{" + template + "}" if is_jsx_attribute else template


lines = path.read_text(encoding="utf-8").split("\n")
changed = 0
for index, line in enumerate(lines):
    if line.lstrip().startswith(("//", "*", "/*", "{/*")):
        continue
    converted = LITERAL.sub(convert, line)
    if converted != line:
        lines[index] = converted
        changed += 1
path.write_text("\n".join(lines), encoding="utf-8")
print(f"{path}: {changed} line(s) converted; add the BRAND import and review the diff")
EOF
```

---

### Task 1: Frontend golden harness

These are characterization goldens: they pin today's output before any brand change.
- They pass the moment they are written, so Step 12 proves they catch a change by mutating the code.
- Later tasks either keep the goldens byte-identical or regenerate exactly the files that an intended change touches.
- Every page renders from synthetic fixtures served by a stubbed `fetch`, with a frozen clock.

**Files:**
- Modify: `ai-information-hub/vitest.config.ts`
- Create: `ai-information-hub/test/fixtures/api.ts`
- Create: `ai-information-hub/test/golden/golden.ts`
- Create: `ai-information-hub/test/golden/routes.test.ts`
- Create: `ai-information-hub/test/golden/structured-data.test.ts`
- Create: `ai-information-hub/test/golden/metadata.test.ts`
- Create: `ai-information-hub/test/golden/pages.test.ts`
- Create: `ai-information-hub/test/golden/static-files.test.ts`
- Create (generated): `ai-information-hub/test/golden/__goldens__/**`

**Interfaces:**
- **Consumes:** the existing route handlers and page modules, `components/structured-data.tsx`, `lib/site-metadata.ts` with the two root layouts that export it (`app/(site)/layout.tsx`, `app/(localized)/[lang]/layout.tsx`), and `components/root-shell.tsx`.
- **Produces:**
  - `test/fixtures/api.ts`: `LANGS`, `FIXED_NOW`, `PERIOD_ID`, `WEEK_ID`, `STORY_ID`, `TOPIC`, and `stubApiFetch(overrides?: Record<string, unknown>): string[]`.
  - `test/golden/golden.ts`: `expectGolden(text: string, name: string): Promise<void>`, `stableJson(value: unknown): string`, and `normalizeHtml(html: string): string`.
  - The golden file names listed in Step 9. Later tasks regenerate them by name.

- [ ] **Step 1: Let Vitest find tests under `test/`**

In `ai-information-hub/vitest.config.ts`, change the `include` line to:

```ts
    include: ["lib/**/*.test.ts", "app/**/*.test.ts", "test/**/*.test.ts"],
```

- [ ] **Step 2: Create the API fixture**

Create `ai-information-hub/test/fixtures/api.ts`:

```ts
// Deterministic backend responses for golden and label tests. Synthetic data only: this repository is public.
import { vi } from 'vitest'

export const LANGS = ['de', 'en', 'zh', 'fr', 'es', 'pt', 'ja', 'ko'] as const
export const FIXED_NOW = new Date('2026-09-14T08:00:00.000Z')
export const PERIOD_ID = '2026-09-13'
export const WEEK_ID = '2026-kw37'
export const STORY_ID = 'tech-101'
export const TOPIC = 'openai'

const author = { name: 'Example News', handle: '', avatar: 'EN', verified: false }
const metrics = { comments: 0, retweets: 0, likes: 0, views: '0' }

function perLanguage<T>(build: (lang: string) => T[]): Record<string, T[]> {
  return Object.fromEntries(LANGS.map((lang) => [lang, build(lang)]))
}

export function techFixture() {
  return perLanguage((lang) => [
    {
      id: 101, author, metrics, tags: ['OpenAI', 'LLM'], category: 'LLM', iconType: 'Brain', impact: 'high',
      content: `OpenAI ships a new reasoning model for developers: the release adds tool use and a lower price (${lang}).`,
      timestamp: '2026-09-13T09:00:00.000Z', source: 'Example News', sourceUrl: 'https://example.com/openai-model',
    },
    {
      id: 102, author, metrics, tags: ['Chips'], category: 'Infrastructure', iconType: 'Server', impact: 'medium',
      content: `Chip startup expands inference capacity in Europe with a new data center (${lang}).`,
      timestamp: '2026-09-13T11:30:00.000Z', source: 'Example Wire', sourceUrl: 'https://example.com/chips',
    },
    {
      id: 103, author, metrics, tags: ['Agents'], category: 'Video', iconType: 'Zap', impact: 'low',
      content: `Video: how agents plan multi-step tasks (${lang}).`,
      timestamp: '2026-09-13T12:00:00.000Z', source: 'Example Channel', isVideo: true, videoId: 'abc123XYZ00',
    },
  ])
}

export function investmentFixture() {
  return {
    primaryMarket: perLanguage((lang) => [{
      id: 201, author, metrics, content: `Example AI raises a Series B round (${lang}).`, company: 'Example AI',
      amount: '$50M', round: 'Series B', roundCategory: 'Series B', investors: ['Example Ventures'], valuation: '$400M',
      timestamp: '2026-09-13T10:00:00.000Z', sourceUrl: 'https://example.com/series-b',
    }]),
    secondaryMarket: perLanguage((lang) => [{
      id: 301, author, metrics, content: `Chip stocks rise after earnings (${lang}).`, ticker: 'NVDA', price: 'N/A',
      change: '+2.1%', direction: 'up', timestamp: '2026-09-13T15:00:00.000Z',
    }]),
    ma: perLanguage((lang) => [{
      id: 401, author, metrics, content: `Big Cloud acquires Example Labs (${lang}).`, acquirer: 'Big Cloud',
      target: 'Example Labs', dealValue: '$1.2B', dealType: 'Acquisition', industry: 'Cloud',
      timestamp: '2026-09-13T13:00:00.000Z', sourceUrl: 'https://example.com/ma',
    }]),
  }
}

export function tipsFixture() {
  return perLanguage((lang) => [{
    id: 501, author, metrics, platform: 'Reddit', category: 'Prompting', difficulty: 'Intermediate',
    content: `Use structured outputs to validate agent replies (${lang}).`,
    tip: 'Ask for JSON and validate it against a schema before acting.',
    timestamp: '2026-09-13T08:00:00.000Z', sourceUrl: 'https://example.com/tip',
  }])
}

export function trendsFixture() {
  return {
    trends: perLanguage(() => [{ category: 'AI · Trending', title: 'OpenAI', posts: 2 }]),
    editorial: perLanguage((lang) => [{ text: `Two stories point to cheaper inference this week (${lang}).`, topic: 'Inference' }]),
  }
}

export function weeksFixture() {
  return { weeks: [{ id: WEEK_ID, dateRange: 'Sep 7 – Sep 13, 2026', days: [{ id: '2026-09-12' }, { id: PERIOD_ID }] }] }
}

/**
 * Serves /weeks, /tech, /investment, /tips and /trends for any period, on any API host.
 * `overrides` maps an API path (e.g. '/weeks') to a response body. Returns the list of fetched URLs.
 */
export function stubApiFetch(overrides: Record<string, unknown> = {}): string[] {
  const calls: string[] = []
  vi.stubGlobal('fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    calls.push(url)
    const path = new URL(url).pathname.replace(/^.*?\/api(?=\/)/, '')
    if (path in overrides) return Response.json(overrides[path])
    if (path === '/weeks') return Response.json(weeksFixture())
    switch (path.match(/^\/(tech|investment|tips|trends)\/[^/]+$/)?.[1]) {
      case 'tech': return Response.json(techFixture())
      case 'investment': return Response.json(investmentFixture())
      case 'tips': return Response.json(tipsFixture())
      case 'trends': return Response.json(trendsFixture())
      default: return new Response('not found', { status: 404 })
    }
  })
  return calls
}
```

- [ ] **Step 3: Create the golden helpers**

Create `ai-information-hub/test/golden/golden.ts`:

```ts
import { expect } from 'vitest'

/** React static markup without the empty comment separators React can place between text nodes. */
export function normalizeHtml(html: string): string {
  return html.replaceAll('<!-- -->', '')
}

/** Pretty JSON with a final newline, so golden diffs stay readable. */
export function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

/**
 * Compares `text` with test/golden/__goldens__/<name>. `npx vitest run <file> -u` rewrites the file —
 * only for an intended change listed in the plan, followed by a review of the golden diff.
 */
export async function expectGolden(text: string, name: string): Promise<void> {
  await expect(text).toMatchFileSnapshot(`./__goldens__/${name}`)
}
```

- [ ] **Step 4: Golden tests for routes**

Create `ai-information-hub/test/golden/routes.test.ts`:

```ts
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { FIXED_NOW, LANGS, PERIOD_ID, stubApiFetch } from '../fixtures/api'
import { expectGolden, stableJson } from './golden'

// The handlers ignore the request host; example.com keeps legacy brand strings out of the request.
const SITE = 'https://www.example.com'

beforeEach(() => {
  vi.useFakeTimers({ now: FIXED_NOW, toFake: ['Date'] })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('feed.xml', () => {
  it.each(LANGS)('%s', async (lang) => {
    stubApiFetch()
    const { GET } = await import('@/app/feed.xml/route')
    const res = await GET(new NextRequest(`${SITE}/feed.xml?lang=${lang}`))
    await expectGolden(await res.text(), `feed-${lang}.xml`)
  })
})

describe('newsletter.xml', () => {
  it.each(['de', 'en'])('%s', async (lang) => {
    stubApiFetch()
    const { GET } = await import('@/app/newsletter.xml/route')
    const res = await GET(new NextRequest(`${SITE}/newsletter.xml?lang=${lang}`))
    await expectGolden(await res.text(), `newsletter-${lang}.xml`)
  })
})

describe('content-summary', () => {
  it.each(LANGS)('%s for a given period', async (lang) => {
    stubApiFetch()
    const { GET } = await import('@/app/api/content-summary/route')
    const res = await GET(new NextRequest(`${SITE}/api/content-summary?lang=${lang}&periodId=${PERIOD_ID}`))
    await expectGolden(await res.text(), `content-summary-${lang}.md`)
  })

  it('latest period', async () => {
    stubApiFetch()
    const { GET } = await import('@/app/api/content-summary/route')
    const res = await GET(new NextRequest(`${SITE}/api/content-summary?lang=en`))
    await expectGolden(await res.text(), 'content-summary-latest-en.md')
  })

  it('no content', async () => {
    stubApiFetch({ '/weeks': { weeks: [] } })
    const { GET } = await import('@/app/api/content-summary/route')
    const res = await GET(new NextRequest(`${SITE}/api/content-summary?lang=en`))
    await expectGolden(await res.text(), 'content-summary-empty.md')
  })
})

describe('sitemaps', () => {
  it('news-sitemap.xml', async () => {
    stubApiFetch()
    const { GET } = await import('@/app/news-sitemap.xml/route')
    await expectGolden(await (await GET()).text(), 'news-sitemap.xml')
  })

  it('sitemap.xml entries', async () => {
    stubApiFetch()
    const { default: sitemap } = await import('@/app/sitemap')
    await expectGolden(stableJson(await sitemap()), 'sitemap.json')
  })
})
```

- [ ] **Step 5: Golden tests for JSON-LD**

Create `ai-information-hub/test/golden/structured-data.test.ts`:

```ts
import { describe, it } from 'vitest'
import type { ReactElement } from 'react'
import {
  ArticleSchema,
  BreadcrumbListSchema,
  CollectionPageSchema,
  FAQSchema,
  OrganizationSchema,
  SoftwareApplicationSchema,
  VideoSchema,
  WebsiteSchema,
} from '@/components/structured-data'
import type { TechPost } from '@/lib/types'
import { LANGS } from '../fixtures/api'
import { expectGolden, stableJson } from './golden'

type JsonLdScript = ReactElement<{ dangerouslySetInnerHTML: { __html: string } }>

function jsonLd(element: unknown): unknown {
  return JSON.parse((element as JsonLdScript).props.dangerouslySetInnerHTML.__html)
}

const post: TechPost = {
  id: 101,
  author: { name: 'Example News', handle: '', avatar: 'EN', verified: false },
  content: 'OpenAI ships a new reasoning model for developers\nThe release adds tool use.',
  tags: ['OpenAI'],
  category: 'LLM',
  iconType: 'Brain',
  impact: 'high',
  timestamp: '2026-09-13T09:00:00.000Z',
  metrics: { comments: 0, retweets: 0, likes: 0, views: '0' },
  source: 'Example News',
  sourceUrl: 'https://example.com/openai-model',
}

describe('structured data', () => {
  it('site-wide and page schemas', async () => {
    const schemas = {
      organization: jsonLd(OrganizationSchema()),
      website: jsonLd(WebsiteSchema()),
      breadcrumb: jsonLd(BreadcrumbListSchema({ weekId: '2026-09-13', weekLabel: 'Sep 13, 2026', lang: 'en' })),
      softwareApplication: jsonLd(SoftwareApplicationSchema({
        name: 'Example Tool', description: 'A tool.', url: 'https://example.com/tool', lang: 'en',
      })),
      collectionPage: jsonLd(CollectionPageSchema({
        url: 'https://example.com/page', name: 'AI News', description: 'Curated.', inLanguage: 'en',
        datePublished: '2026-09-13T00:00:00.000Z', dateModified: '2026-09-13T12:00:00.000Z',
        speakableCssSelector: ['#takeaways'],
      })),
      articleWithDefaultUrl: jsonLd(ArticleSchema({ post, inLanguage: 'en' })),
      video: jsonLd(VideoSchema({ video: { ...post, isVideo: true, videoId: 'abc123XYZ00' } })),
    }
    await expectGolden(stableJson(schemas), 'structured-data.json')
  })

  it.each(LANGS)('FAQ in %s', async (lang) => {
    await expectGolden(stableJson(jsonLd(FAQSchema({ lang }))), `faq-${lang}.json`)
  })
})
```

- [ ] **Step 6: Golden tests for metadata**

Create `ai-information-hub/test/golden/metadata.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FIXED_NOW, LANGS, PERIOD_ID, STORY_ID, TOPIC, stubApiFetch } from '../fixtures/api'
import { expectGolden, stableJson } from './golden'

// Both root layouts load next/font and analytics through components/root-shell.tsx; those only work inside
// the Next.js compiler. The home client component is not metadata.
vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: 'font-geist-sans' }),
  Geist_Mono: () => ({ variable: 'font-geist-mono' }),
  Newsreader: () => ({ variable: 'font-newsreader' }),
}))
vi.mock('@vercel/analytics/next', () => ({ Analytics: () => null }))
vi.mock('@/components/home-page-client', () => ({ default: () => null }))

beforeEach(() => {
  vi.useFakeTimers({ now: FIXED_NOW, toFake: ['Date'] })
  stubApiFetch()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function params<T>(value: T) {
  return { params: Promise.resolve(value) }
}

describe('metadata', () => {
  it('site metadata and static pages', async () => {
    // lib/site-metadata.ts holds the site-wide metadata; both root layouts export it as is.
    const { siteMetadata, siteViewport } = await import('@/lib/site-metadata')
    for (const layout of [await import('@/app/(site)/layout'), await import('@/app/(localized)/[lang]/layout')]) {
      expect(layout.metadata).toBe(siteMetadata)
      expect(layout.viewport).toBe(siteViewport)
    }
    const modules = {
      home: await import('@/app/(site)/page'),
      about: await import('@/app/(site)/about/page'),
      aiDisclosure: await import('@/app/(site)/ai-disclosure/page'),
      contact: await import('@/app/(site)/contact/page'),
      corrections: await import('@/app/(site)/corrections/page'),
      datenschutz: await import('@/app/(site)/datenschutz/page'),
      editorialPolicy: await import('@/app/(site)/editorial-policy/page'),
      forTeams: await import('@/app/(site)/for-teams/page'),
      funding: await import('@/app/(site)/funding/page'),
      impressum: await import('@/app/(site)/impressum/page'),
      login: await import('@/app/(site)/login/layout'),
      premium: await import('@/app/(site)/premium/page'),
      sourceMethodology: await import('@/app/(site)/source-methodology/page'),
      unsubscribe: await import('@/app/(site)/unsubscribe/page'),
    }
    const metadata = {
      siteMetadata,
      ...Object.fromEntries(Object.entries(modules).map(([name, mod]) => [name, mod.metadata])),
    }
    await expectGolden(stableJson(metadata), 'metadata-static.json')
  })

  it.each(LANGS)('localized pages in %s', async (lang) => {
    const home = await import('@/app/(localized)/[lang]/page')
    const week = await import('@/app/(localized)/[lang]/week/[weekId]/page')
    const topic = await import('@/app/(localized)/[lang]/topic/[topic]/page')
    const article = await import('@/app/(localized)/[lang]/news/[periodId]/[storyId]/page')
    const aggregator = await import('@/app/(localized)/[lang]/tools/ai-news-aggregator/page')
    const api = await import('@/app/(localized)/[lang]/tools/ai-news-api/page')
    const report = await import('@/app/(localized)/[lang]/tools/ai-report-generator/page')
    const stock = await import('@/app/(localized)/[lang]/tools/ai-stock-tracker/page')
    const metadata = {
      home: await home.generateMetadata(params({ lang })),
      week: await week.generateMetadata(params({ lang, weekId: PERIOD_ID })),
      topic: await topic.generateMetadata({ ...params({ lang, topic: TOPIC }), searchParams: Promise.resolve({ period: PERIOD_ID }) }),
      article: await article.generateMetadata(params({ lang, periodId: PERIOD_ID, storyId: STORY_ID })),
      articleNotFound: await article.generateMetadata(params({ lang, periodId: PERIOD_ID, storyId: 'tech-999' })),
      tools: {
        aggregator: await aggregator.generateMetadata(params({ lang })),
        api: await api.generateMetadata(params({ lang })),
        report: await report.generateMetadata(params({ lang })),
        stock: await stock.generateMetadata(params({ lang })),
      },
    }
    await expectGolden(stableJson(metadata), `metadata-${lang}.json`)
  })
})
```

- [ ] **Step 7: Golden tests for rendered pages**

Create `ai-information-hub/test/golden/pages.test.ts`:

```ts
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { createElement, type ComponentType, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FIXED_NOW, PERIOD_ID, STORY_ID, TOPIC, stubApiFetch } from '../fixtures/api'
import { expectGolden, normalizeHtml } from './golden'

vi.mock('next/link', () => ({
  default: ({ href, children, prefetch: _prefetch, ...rest }: any) =>
    createElement('a', { href: typeof href === 'string' ? href : String(href?.pathname ?? ''), ...rest }, children),
}))
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ push: () => undefined, replace: () => undefined, prefetch: () => undefined }),
}))
vi.mock('@/components/home-page-client', () => ({ default: () => null }))
// The root shell loads next/font and analytics, which only work inside the Next.js compiler.
vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: 'font-geist-sans' }),
  Geist_Mono: () => ({ variable: 'font-geist-mono' }),
  Newsreader: () => ({ variable: 'font-newsreader' }),
}))
vi.mock('@vercel/analytics/next', () => ({ Analytics: () => null }))

type AnyElement = ReactElement<Record<string, unknown>>

beforeEach(() => {
  vi.useFakeTimers({ now: FIXED_NOW, toFake: ['Date'] })
  // The login page positions decorative lines with Math.random(); a fixed value makes every render reproducible.
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  stubApiFetch()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** renderToStaticMarkup cannot render an async server component, so a top-level one is called first. */
async function resolveTopLevel(element: AnyElement): Promise<AnyElement> {
  const type = element.type
  if (typeof type === 'function' && type.constructor.name === 'AsyncFunction') {
    return resolveTopLevel(await (type as (props: Record<string, unknown>) => Promise<AnyElement>)(element.props))
  }
  return element
}

async function render(element: ReactElement | Promise<ReactElement>): Promise<string> {
  return normalizeHtml(renderToStaticMarkup(await resolveTopLevel((await element) as AnyElement)))
}

const TOOLS = {
  'ai-news-aggregator': () => import('@/app/(localized)/[lang]/tools/ai-news-aggregator/page'),
  'ai-news-api': () => import('@/app/(localized)/[lang]/tools/ai-news-api/page'),
  'ai-report-generator': () => import('@/app/(localized)/[lang]/tools/ai-report-generator/page'),
  'ai-stock-tracker': () => import('@/app/(localized)/[lang]/tools/ai-stock-tracker/page'),
}

const STATIC_PAGES: Record<string, () => Promise<{ default: ComponentType }>> = {
  about: () => import('@/app/(site)/about/page'),
  'ai-disclosure': () => import('@/app/(site)/ai-disclosure/page'),
  'editorial-policy': () => import('@/app/(site)/editorial-policy/page'),
  'source-methodology': () => import('@/app/(site)/source-methodology/page'),
  corrections: () => import('@/app/(site)/corrections/page'),
  contact: () => import('@/app/(site)/contact/page'),
  impressum: () => import('@/app/(site)/impressum/page'),
  datenschutz: () => import('@/app/(site)/datenschutz/page'),
  premium: () => import('@/app/(site)/premium/page'),
  'for-teams': () => import('@/app/(site)/for-teams/page'),
  funding: () => import('@/app/(site)/funding/page'),
  login: () => import('@/app/(site)/login/page'),
}

describe('rendered pages', () => {
  for (const [slug, load] of Object.entries(TOOLS)) {
    it.each(['en', 'zh'])(`tool ${slug} in %s`, async (lang) => {
      const { default: Page } = await load()
      await expectGolden(await render(Page({ params: Promise.resolve({ lang }) })), `pages/tool-${slug}-${lang}.html`)
    })
  }

  it('home page in en', async () => {
    const { default: Page } = await import('@/app/(localized)/[lang]/page')
    await expectGolden(await render(Page({ params: Promise.resolve({ lang: 'en' }) })), 'pages/home-en.html')
  })

  it.each(['en', 'de', 'zh'])('week page in %s', async (lang) => {
    const { default: Page } = await import('@/app/(localized)/[lang]/week/[weekId]/page')
    await expectGolden(await render(Page({ params: Promise.resolve({ lang, weekId: PERIOD_ID }) })), `pages/week-${lang}.html`)
  })

  it.each(['en', 'zh'])('article page in %s', async (lang) => {
    const { default: Page } = await import('@/app/(localized)/[lang]/news/[periodId]/[storyId]/page')
    const props = { params: Promise.resolve({ lang, periodId: PERIOD_ID, storyId: STORY_ID }) }
    await expectGolden(await render(Page(props)), `pages/article-${lang}.html`)
  })

  it('topic page in en', async () => {
    const { default: Page } = await import('@/app/(localized)/[lang]/topic/[topic]/page')
    const props = { params: Promise.resolve({ lang: 'en', topic: TOPIC }), searchParams: Promise.resolve({ period: PERIOD_ID }) }
    await expectGolden(await render(Page(props)), 'pages/topic-en.html')
  })

  // The <html> shell of both root layouts: preconnect links, the site-wide JSON-LD and the feed discovery links.
  it.each(['en', 'zh'] as const)('root shell in %s', async (lang) => {
    const { RootShell } = await import('@/components/root-shell')
    const shell = createElement(RootShell, { lang, children: createElement('p', null, 'Page body') })
    await expectGolden(await render(shell), `pages/root-shell-${lang}.html`)
  })

  for (const [name, load] of Object.entries(STATIC_PAGES)) {
    it(`${name} page`, async () => {
      const { default: Page } = await load()
      await expectGolden(await render(createElement(Page)), `pages/${name}.html`)
    })
  }
})
```

If a single page cannot render outside Next.js — an async server component nested below the top level, or browser globals read during render — do this:
- remove that entry;
- write the reason in the task report;
- keep every other page.

The metadata goldens still cover its head.

A page whose output differs between two runs is a harness bug, not a page to drop. Find the source of the nondeterminism (random numbers, the current time, unordered iteration) and pin it in `beforeEach`, as the `Math.random` stub does for the login page.

- [ ] **Step 8: Golden copies of the brand-bearing static files**

Create `ai-information-hub/test/golden/static-files.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, it } from 'vitest'
import { expectGolden } from './golden'

// Reference copies: Task 12 replaces both files with generated routes and compares against these goldens.
describe('brand-bearing static files', () => {
  it.each(['robots.txt', 'llms.txt'])('%s', async (name) => {
    await expectGolden(readFileSync(new URL(`../../public/${name}`, import.meta.url), 'utf8'), name)
  })
})
```

- [ ] **Step 9: Capture the goldens**

Run: `cd <repo-root>/ai-information-hub && export PATH=/usr/local/bin:$PATH && node --version && npx vitest run test/golden -u`

Expected: `node --version` prints `v22.x`; all 71 tests pass (`Snapshots  71 written`), and `test/golden/__goldens__/` holds:

| Group | Files |
|---|---|
| Atom feed | `feed-{de,en,zh,fr,es,pt,ja,ko}.xml` |
| Newsletter feed | `newsletter-{de,en}.xml` |
| Content summary | `content-summary-{de,en,zh,fr,es,pt,ja,ko}.md`, `content-summary-latest-en.md`, `content-summary-empty.md` |
| Sitemaps | `news-sitemap.xml`, `sitemap.json` |
| JSON-LD | `structured-data.json`, `faq-{de,en,zh,fr,es,pt,ja,ko}.json` |
| Metadata | `metadata-static.json`, `metadata-{de,en,zh,fr,es,pt,ja,ko}.json` |
| Tool pages | `pages/tool-{ai-news-aggregator,ai-news-api,ai-report-generator,ai-stock-tracker}-{en,zh}.html` |
| Period, article, topic pages | `pages/home-en.html`, `pages/week-{en,de,zh}.html`, `pages/article-{en,zh}.html`, `pages/topic-en.html` |
| Root shell of both root layouts | `pages/root-shell-{en,zh}.html` |
| Static pages | `pages/{about,ai-disclosure,editorial-policy,source-methodology,corrections,contact,impressum,datenschutz,premium,for-teams,funding,login}.html` |
| Static files | `robots.txt`, `llms.txt` |

- [ ] **Step 10: Confirm the goldens are stable**

```bash
git -C <repo-root> add ai-information-hub/test/golden/__goldens__
cd <repo-root>/ai-information-hub && npx vitest run test/golden && npx vitest run test/golden
git -C <repo-root> diff --exit-code -- ai-information-hub/test/golden/__goldens__
```

Expected:
- both runs pass without `-u` (`Tests  71 passed (71)`);
- `git diff --exit-code` exits 0, so a run rewrites nothing.

Goldens that contain dates depend on Node's ICU data. CI runs Node 22 and the default local Node is 24, so Step 9 captures under Node 22 while Step 10 re-runs under the default Node. The plan review found the goldens identical under both, apart from the login page that the `Math.random` stub fixes. The rebase check on the cost tree (2026-09-16) captured under Node 22 and re-ran under Node 22 with `TZ=UTC CI=true` and under Node 24 in the local time zone: no golden changed. If CI still fails only on date strings, record both Node versions and the differing lines in the ledger, and recapture under Node 22.

- [ ] **Step 11: Check the golden content**

```bash
cd <repo-root>/ai-information-hub && grep -rln "DataCube AI" test/golden/__goldens__ | sort
cd <repo-root>/ai-information-hub && grep -rn "/Users/" test/golden/__goldens__ | head -3
```

Expected:
- The first command lists `pages/tool-{ai-news-aggregator,ai-news-api,ai-report-generator}-{en,zh}.html` (the stock tracker page does not use that spelling), `metadata-*.json`, `structured-data.json`, `llms.txt` and `pages/week-*.html`. These are the B1 baseline.
- The second prints nothing: no local paths.

- [ ] **Step 12: Prove a golden catches a change (mutation check)**

```bash
cd <repo-root> && python3 - <<'EOF'
from pathlib import Path
path = Path("ai-information-hub/app/feed.xml/route.ts")
text = path.read_text(encoding="utf-8")
assert text.count("en: 'Data Cube AI – Daily AI News',") == 1
path.write_text(text.replace("en: 'Data Cube AI – Daily AI News',", "en: 'Data Cube AI – Daily AI Newz',"), encoding="utf-8")
EOF
cd <repo-root>/ai-information-hub && npx vitest run test/golden/routes.test.ts; echo "exit=$?"
git -C <repo-root> checkout -- ai-information-hub/app/feed.xml/route.ts
cd <repo-root>/ai-information-hub && npx vitest run test/golden/routes.test.ts
```

Expected:
- the first run fails on `feed-en.xml` only (`Tests  1 failed | 21 passed (22)`), with `exit=1`;
- after the checkout, the run passes.

- [ ] **Step 13: Run the frontend suite**

Run: `cd <repo-root>/ai-information-hub && npm run lint && npm test`
Expected: the type check is clean, and all tests pass: `Tests  129 passed (129)` in 10 files (the 58 existing tests plus the 71 goldens).

- [ ] **Step 14: Commit**

```bash
git -C <repo-root> add ai-information-hub/vitest.config.ts ai-information-hub/test
git -C <repo-root> commit -m "test(frontend): golden files for brand-bearing routes, metadata, JSON-LD and pages

Characterization goldens captured before the R2 brand refactor (spec AD1).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Backend golden harness

This task pins the email HTML in all eight languages, the API identity strings and the deals disclosure. It uses synthetic content objects shaped like the ORM rows that `_fetch_period_content` returns.

**Files:**
- Create: `ai-hub-backend/tests/golden.py`
- Create: `ai-hub-backend/tests/newsletter_fixtures.py`
- Create: `ai-hub-backend/tests/test_brand_goldens.py`
- Create (generated): `ai-hub-backend/tests/goldens/email_{de,en,zh,fr,es,pt,ja,ko}.html`, `ai-hub-backend/tests/goldens/api_identity.txt`, `ai-hub-backend/tests/goldens/deals_disclosure.txt`

**Interfaces:**
- **Consumes:** `app.services.newsletter_sender._build_email_html(data, lang)`, `app.main.app`, `app.routers.deals.DISCLOSURE`.
- **Produces:**
  - `golden.assert_golden(name: str, text: str) -> None`;
  - `newsletter_fixtures.LANGS: list[str]`;
  - `newsletter_fixtures.period_data(period_id: str = "2026-09-13") -> dict`.

  Tasks 6 and 15 import these; test modules import them by bare name, because `tests/` is on `sys.path`.

- [ ] **Step 1: Create the golden helper**

Create `ai-hub-backend/tests/golden.py`:

```python
"""Golden-file assertions: compare output with a committed file, or rewrite it with UPDATE_GOLDENS=1."""

import os
from pathlib import Path

GOLDEN_DIR = Path(__file__).resolve().parent / "goldens"


def assert_golden(name: str, text: str) -> None:
    """Fail when `text` differs from tests/goldens/<name>.

    UPDATE_GOLDENS=1 rewrites the file instead. Use it only for an intended change named in the
    plan, then review the golden diff.
    """
    path = GOLDEN_DIR / name
    if os.environ.get("UPDATE_GOLDENS") == "1":
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return
    assert path.exists(), f"missing golden {name}: run once with UPDATE_GOLDENS=1 and review the file"
    assert text == path.read_text(encoding="utf-8"), f"output differs from golden {name}"
```

- [ ] **Step 2: Create the synthetic newsletter content**

Create `ai-hub-backend/tests/newsletter_fixtures.py`:

```python
"""Synthetic newsletter content for render tests. Public repository: no real data."""

from types import SimpleNamespace

LANGS = ["de", "en", "zh", "fr", "es", "pt", "ja", "ko"]


def _row(**fields) -> SimpleNamespace:
    fields.setdefault("translations", None)
    return SimpleNamespace(**fields)


def period_data(period_id: str = "2026-09-13") -> dict:
    """One period in the shape `_fetch_period_content` returns."""
    return {
        "period_id": period_id,
        "tech": [
            _row(
                content_en="OpenAI ships a new reasoning model for developers: it adds tool use and a lower price.",
                content_de="OpenAI stellt ein neues Reasoning-Modell vor: mit Tool-Nutzung und niedrigerem Preis.",
                category_en="LLM",
                category_de="LLM",
                impact="high",
                source="Example News",
                source_url="https://example.com/openai-model",
                translations={"zh": {"content": "OpenAI 发布新的推理模型：支持工具调用，价格更低。", "category": "大模型"}},
            ),
            _row(
                content_en="Chip startup expands inference capacity in Europe with a new data center.",
                content_de="Chip-Startup baut Inferenzkapazität in Europa mit einem neuen Rechenzentrum aus.",
                category_en="Infrastructure",
                category_de="Infrastruktur",
                impact="medium",
                source="Example Wire",
                source_url=None,
            ),
        ],
        "videos": [
            _row(
                content_en="How agents plan multi-step tasks, explained with three demos.",
                content_de="Wie Agenten mehrstufige Aufgaben planen, erklärt an drei Demos.",
                video_id="abc123XYZ00",
                source="Example Channel",
            ),
        ],
        "funding": [_row(company="Example AI", amount_en="$50M", amount_de="50 Mio. $", round="Series B")],
        "ma": [
            _row(
                acquirer="Big Cloud",
                target="Example Labs",
                deal_value_en="$1.2B",
                deal_value_de="1,2 Mrd. $",
                content_en="Big Cloud acquires Example Labs to add agent tooling.",
                content_de="Big Cloud übernimmt Example Labs, um Agenten-Werkzeuge zu ergänzen.",
            ),
        ],
        "tips": [
            _row(
                content_en="Use structured outputs to validate agent replies before acting on them.",
                content_de="Strukturierte Ausgaben helfen, Agenten-Antworten vor dem Handeln zu prüfen.",
                category_en="Prompting",
                category_de="Prompting",
            ),
        ],
    }
```

- [ ] **Step 3: Write the golden tests**

Create `ai-hub-backend/tests/test_brand_goldens.py`:

```python
"""Characterization goldens for brand-bearing backend output (spec AD1: the brand refactor changes no output)."""

import pytest
from fastapi.testclient import TestClient

import app.services.newsletter_sender as sender
from app.main import app
from app.routers.deals import DISCLOSURE
from golden import assert_golden
from newsletter_fixtures import LANGS, period_data


@pytest.mark.parametrize("lang", LANGS)
def test_email_html(lang):
    assert_golden(f"email_{lang}.html", sender._build_email_html(period_data(), lang))


def test_api_identity():
    root = TestClient(app).get("/").json()
    assert_golden("api_identity.txt", f"title={app.title}\nroot_name={root['name']}\n")


def test_deals_disclosure():
    assert_golden("deals_disclosure.txt", DISCLOSURE + "\n")
```

- [ ] **Step 4: Run the tests before any golden exists**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_brand_goldens.py -q`
Expected: 10 failures, each with `missing golden …`.

- [ ] **Step 5: Capture and re-run**

```bash
cd <repo-root>/ai-hub-backend && UPDATE_GOLDENS=1 DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_brand_goldens.py -q
cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_brand_goldens.py -q
grep -c "Data Cube AI" <repo-root>/ai-hub-backend/tests/goldens/email_en.html
```

Expected:
- both runs pass (10 passed);
- `tests/goldens/` holds 10 files;
- the count is 5: lockup, masthead, promo, the English `footer_msg` line and the address line;
- `api_identity.txt` reads `title=AI Hub API` / `root_name=AI Hub API`.

- [ ] **Step 6: Prove the goldens catch a change (mutation check)**

```bash
cd <repo-root> && python3 - <<'EOF'
from pathlib import Path
path = Path("ai-hub-backend/app/services/newsletter_sender.py")
text = path.read_text(encoding="utf-8")
assert text.count("Data Cube AI &bull; Frankfurt am Main, Germany") == 1
path.write_text(text.replace("Data Cube AI &bull; Frankfurt", "Data Cube Al &bull; Frankfurt"), encoding="utf-8")
EOF
cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_brand_goldens.py -q; echo "exit=$?"
git -C <repo-root> checkout -- ai-hub-backend/app/services/newsletter_sender.py
```

Expected:
- 8 email tests fail, with `exit=1`;
- after the checkout, `git -C <repo-root> status --short ai-hub-backend/app` is empty.

- [ ] **Step 7: Lint and the whole backend suite**

```bash
cd <repo-root>/ai-hub-backend && venv312/bin/python -m ruff check app/ scripts/ tests/
cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m "not integration" -q
```

Expected:
- ruff is clean. If it reports import order in the new files only, run `ruff check --fix` on those files. If it reports a long line in `newsletter_fixtures.py`, wrap that string.
- All unit tests pass: the baseline count plus 10.

- [ ] **Step 8: Commit**

```bash
git -C <repo-root> add ai-hub-backend/tests/golden.py ai-hub-backend/tests/newsletter_fixtures.py ai-hub-backend/tests/test_brand_goldens.py ai-hub-backend/tests/goldens
git -C <repo-root> commit -m "test(backend): golden files for the email, API identity and deals disclosure

Characterization goldens captured before the R2 brand refactor (spec AD1).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Brand guard and CI job

This task implements the AD1 guard with file classes:
- brand sources may contain the legacy strings;
- docs, tests, promo assets and images are exempt until R4;
- workflows may name the legacy site only as the `vars.SITE_URL` fallback;
- everything else must be clean.

The guard fails on the whole repository until Task 17. Nothing is pushed before then.

**Files:**
- Create: `scripts/brand_guard.py`
- Create: `scripts/test_brand_guard.py`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- **Consumes:** nothing.
- **Produces:**
  - `python3 scripts/brand_guard.py [PATH …]`: exit 0 when clean, 1 with `path:line: text` lines otherwise;
  - `classify(path) -> str`: one of `brand-source`, `guard`, `exempt`, `workflow`, `code`;
  - `scan_text(path, text) -> list[Violation]`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/test_brand_guard.py`:

```python
"""Tests for scripts/brand_guard.py."""

import contextlib
import io
import os
import tempfile
import unittest
from pathlib import Path

from scripts.brand_guard import Violation, classify, main, scan_text


class ClassifyTest(unittest.TestCase):
    def test_brand_sources_docs_tests_promo_and_images_are_not_checked_as_code(self):
        self.assertEqual(classify("ai-information-hub/lib/brand-defaults.json"), "brand-source")
        self.assertEqual(classify("ai-information-hub/lib/brand.ts"), "brand-source")
        self.assertEqual(classify("ai-hub-backend/app/config.py"), "brand-source")
        self.assertEqual(classify("scripts/brand_guard.py"), "guard")
        for path in (
            "docs/brand-guidelines.md",
            "README.md",
            "ai-information-hub/CLAUDE.md",
            "LICENSE",
            "promo-video/src/Root.tsx",
            "ai-hub-backend/tests/test_privacy.py",
            "ai-information-hub/lib/newsletter/unsubscribe-token.test.ts",
            "ai-information-hub/test/golden/__goldens__/feed-en.xml",
            "ai-information-hub/public/og-image.svg",
        ):
            self.assertEqual(classify(path), "exempt", path)

    def test_workflows_and_everything_else_are_checked(self):
        self.assertEqual(classify(".github/workflows/daily-collect.yml"), "workflow")
        for path in (
            "ai-information-hub/app/layout.tsx",
            "ai-information-hub/public/llms.txt",
            "ai-hub-backend/app/services/newsletter_sender.py",
            "ai-hub-backend/.env.example",
            "scripts/page_snapshot.py",
        ):
            self.assertEqual(classify(path), "code", path)


class ScanTextTest(unittest.TestCase):
    def test_flags_every_legacy_spelling_in_code(self):
        text = "\n".join([
            "title: 'Data Cube AI'",
            "name: 'DataCube AI'",
            "url: 'https://www.datacubeai.space'",
            "filename=datacube-ai-deals.csv",
            'return "dcai_" + token',
            "id='dcai-takeaways'",
            "const ok = 'Acme News'",
        ])
        violations = scan_text("ai-information-hub/app/page.tsx", text)
        self.assertEqual([v.line for v in violations], [1, 2, 3, 4, 5, 6])
        self.assertEqual(violations[0], Violation("ai-information-hub/app/page.tsx", 1, "title: 'Data Cube AI'"))

    def test_ignores_words_that_merely_contain_the_letters(self):
        self.assertEqual(scan_text("ai-hub-backend/app/x.py", "metadata = cubes\nabcdcai_value = 1"), [])

    def test_never_flags_exempt_or_brand_source_files(self):
        text = "Data Cube AI https://www.datacubeai.space dcai_"
        for path in ("docs/a.md", "ai-hub-backend/tests/test_a.py", "promo-video/src/a.tsx", "ai-information-hub/lib/brand.ts"):
            self.assertEqual(scan_text(path, text), [], path)

    def test_workflows_may_name_the_legacy_site_only_as_the_site_url_fallback(self):
        allowed = "          SITE=\"${{ vars.SITE_URL || 'https://www.datacubeai.space' }}\""
        self.assertEqual(scan_text(".github/workflows/daily-collect.yml", allowed), [])
        hardcoded = '              "host": "www.datacubeai.space",'
        self.assertEqual(len(scan_text(".github/workflows/daily-collect.yml", hardcoded)), 1)


class MainTest(unittest.TestCase):
    def test_prints_violations_and_exits_1_or_exits_0_when_clean(self):
        previous = os.getcwd()
        with tempfile.TemporaryDirectory() as tmp:
            os.chdir(tmp)
            try:
                Path("ai-information-hub/app").mkdir(parents=True)
                Path("ai-information-hub/app/page.tsx").write_text("const a = 1\nconst b = 'Data Cube AI'\n", encoding="utf-8")
                Path("ai-information-hub/app/clean.tsx").write_text("const a = 'Acme'\n", encoding="utf-8")
                output = io.StringIO()
                with contextlib.redirect_stdout(output):
                    self.assertEqual(main(["ai-information-hub/app/page.tsx", "./ai-information-hub/app/clean.tsx"]), 1)
                self.assertIn("ai-information-hub/app/page.tsx:2: const b = 'Data Cube AI'", output.getvalue())
                with contextlib.redirect_stdout(io.StringIO()):
                    self.assertEqual(main(["ai-information-hub/app/clean.tsx"]), 0)
            finally:
                os.chdir(previous)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `cd <repo-root> && python3 -m unittest scripts/test_brand_guard.py`
Expected: an error, `ModuleNotFoundError: No module named 'scripts.brand_guard'`.

- [ ] **Step 3: Implement the guard**

Create `scripts/brand_guard.py`:

```python
#!/usr/bin/env python3
"""Fail when a legacy brand string appears outside the brand configuration (spec AD1).

Where brand identity lives:
- ai-information-hub/lib/brand-defaults.json
- ai-information-hub/lib/brand.ts
- ai-hub-backend/app/config.py

Exempt until the rebrand (R4) rewrites them: documentation, tests, promo assets and image files.
Workflows may name the legacy site only as the vars.SITE_URL fallback.

Usage:
    python3 scripts/brand_guard.py            # every tracked file
    python3 scripts/brand_guard.py PATH ...   # only these repository-relative files
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path
from typing import NamedTuple

LEGACY_BRAND = re.compile(r"data[\s_-]?cube|(?<![a-z0-9])dcai[_-]", re.IGNORECASE)
WORKFLOW_SITE_FALLBACK = re.compile(r"\$\{\{ vars\.SITE_URL \|\| 'https://www\.datacubeai\.space' \}\}")

BRAND_SOURCES = frozenset({
    "ai-information-hub/lib/brand-defaults.json",
    "ai-information-hub/lib/brand.ts",
    "ai-hub-backend/app/config.py",
})
GUARD_FILES = frozenset({"scripts/brand_guard.py", "scripts/test_brand_guard.py"})
EXEMPT_PREFIXES = ("docs/", "promo-video/", ".ai-collab/", "ai-information-hub/test/", "ai-hub-backend/tests/")
EXEMPT_SUFFIXES = (".md", ".test.ts", ".test.tsx", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp")
EXEMPT_NAMES = frozenset({"LICENSE"})


class Violation(NamedTuple):
    path: str
    line: int
    text: str


def classify(path: str) -> str:
    """The file class that decides how the guard treats a repository-relative path."""
    if path in BRAND_SOURCES:
        return "brand-source"
    if path in GUARD_FILES:
        return "guard"
    name = path.rsplit("/", 1)[-1]
    if path.startswith(EXEMPT_PREFIXES) or path.endswith(EXEMPT_SUFFIXES) or name in EXEMPT_NAMES:
        return "exempt"
    if path.startswith(".github/workflows/"):
        return "workflow"
    return "code"


def scan_text(path: str, text: str) -> list[Violation]:
    """Legacy brand occurrences in one file that its class does not allow."""
    file_class = classify(path)
    if file_class in ("brand-source", "guard", "exempt"):
        return []
    violations = []
    for number, line in enumerate(text.splitlines(), start=1):
        checked = WORKFLOW_SITE_FALLBACK.sub("", line) if file_class == "workflow" else line
        if LEGACY_BRAND.search(checked):
            violations.append(Violation(path, number, line.strip()[:160]))
    return violations


def tracked_files() -> list[str]:
    output = subprocess.run(["git", "ls-files"], capture_output=True, text=True, check=True).stdout
    return [line for line in output.splitlines() if line]


def read_text(path: str) -> str | None:
    """File content, or None for missing, binary or non-UTF-8 files."""
    try:
        data = Path(path).read_bytes()
    except (FileNotFoundError, IsADirectoryError):
        return None
    if b"\0" in data:
        return None
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return None


def main(argv: list[str] | None = None) -> int:
    paths = argv if argv is not None else sys.argv[1:]
    paths = [path[2:] if path.startswith("./") else path for path in (paths or tracked_files())]
    violations = []
    for path in paths:
        text = read_text(path)
        if text is not None:
            violations.extend(scan_text(path, text))
    for violation in violations:
        print(f"{violation.path}:{violation.line}: {violation.text}")
    if violations:
        files = len({violation.path for violation in violations})
        print(f"brand guard: {len(violations)} legacy brand string(s) in {files} file(s) outside the brand config")
        return 1
    print("brand guard: clean")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `cd <repo-root> && python3 -m unittest scripts/test_brand_guard.py`
Expected: `OK` (7 tests).

- [ ] **Step 5: Record the starting point**

Run: `cd <repo-root> && python3 scripts/brand_guard.py | tail -1`

Expected: a line `brand guard: N legacy brand string(s) in M file(s) outside the brand config`. Write N and M into the ledger. The count reaches 0 in Task 17.

- [ ] **Step 6: Add the CI job**

Append this job to `.github/workflows/ci.yml`, after `backend-integration`, at the same indentation as the other jobs. It runs on every push and pull request and is not path-filtered:

```yaml
  brand-guard:
    name: Brand guard
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Script tests
        run: python3 -m unittest scripts/test_brand_guard.py
      - name: Legacy brand strings stay in the brand config
        run: python3 scripts/brand_guard.py
```

- [ ] **Step 7: Check the workflow file parses**

Run: `cd <repo-root> && ai-hub-backend/venv312/bin/python -c "import yaml, sys; jobs = yaml.safe_load(open('.github/workflows/ci.yml'))['jobs']; print(sorted(jobs))"`
Expected: `['backend', 'backend-integration', 'brand-guard', 'changes', 'frontend']`. If `yaml` is missing from the venv, use `python3 -c "import yaml"` from any Python that has PyYAML.

- [ ] **Step 8: Commit**

```bash
git -C <repo-root> add scripts/brand_guard.py scripts/test_brand_guard.py .github/workflows/ci.yml
git -C <repo-root> commit -m "ci: guard that fails on legacy brand strings outside the brand config

Spec AD1: file classes for brand sources, docs, tests, promo assets and workflows.
The guard stays red until the R2 brand work removes the remaining strings.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Page snapshot tool

This task adds the release-time before/after comparison of production (spec AD1 and §9). Pages for the frozen period 2026-09-13 only change when the code changes. The comparison runs right before and right after the merge (Release, steps 3 and 6).

**Files:**
- Create: `scripts/page_snapshot.py`
- Create: `scripts/test_page_snapshot.py`
- Create: `scripts/page_snapshot_paths.txt`
- Modify: `.github/workflows/ci.yml` (the `brand-guard` job's test step)

**Interfaces:**
- **Consumes:** nothing.
- **Produces:**
  - `python3 scripts/page_snapshot.py capture --base-url URL --paths FILE --out FILE`;
  - `python3 scripts/page_snapshot.py compare BEFORE AFTER`;
  - functions `html_snapshot(html) -> dict`, `text_snapshot(body) -> dict`, `capture(base_url, paths, fetcher=fetch) -> dict`, `compare(before, after) -> list[str]`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/test_page_snapshot.py`:

```python
"""Tests for scripts/page_snapshot.py."""

import tempfile
import unittest
from pathlib import Path

from scripts.page_snapshot import capture, compare, html_snapshot, read_paths, text_snapshot

PAGE = """<!DOCTYPE html><html lang="en"><head>
<title>AI News | Acme</title>
<meta charset="utf-8"/>
<meta name="description" content="Curated AI news."/>
<meta property="og:title" content="AI News | Acme"/>
<link rel="canonical" href="https://acme.example/en"/>
<link rel="alternate" hreflang="de" href="https://acme.example/de"/>
<link rel="stylesheet" href="/app.css"/>
<script type="application/ld+json">{"name":"Acme","@type":"Organization"}</script>
<style>.x{color:red}</style>
</head><body><nav>Menu</nav><main><h1>AI News</h1><p>First <b>story</b>.</p><script>var hidden = 1</script></main></body></html>"""


class HtmlSnapshotTest(unittest.TestCase):
    def test_keeps_what_readers_and_crawlers_see(self):
        snapshot = html_snapshot(PAGE)
        self.assertEqual(snapshot["title"], "AI News | Acme")
        self.assertEqual(snapshot["meta"], {"description": "Curated AI news.", "og:title": "AI News | Acme"})
        self.assertEqual(snapshot["links"], ["alternate de https://acme.example/de", "canonical https://acme.example/en"])
        self.assertEqual(snapshot["jsonLd"], ['{"@type": "Organization", "name": "Acme"}'])
        self.assertEqual(snapshot["text"], ["Menu", "AI News", "First", "story", "."])

    def test_keeps_text_outside_main_such_as_sidebars_and_footers(self):
        html = "<html><body><aside>Made by Ada</aside><main><p>Story</p></main><footer>© Acme</footer></body></html>"
        self.assertEqual(html_snapshot(html)["text"], ["Made by Ada", "Story", "© Acme"])


class TextSnapshotTest(unittest.TestCase):
    def test_keeps_lines_and_masks_timestamps(self):
        self.assertEqual(text_snapshot("generated: 2026-09-15T17:09:36.123Z\nok")["text"], ["generated: <timestamp>", "ok"])


class CaptureAndCompareTest(unittest.TestCase):
    def test_capture_follows_the_content_type_and_compare_reports_changed_paths_only(self):
        pages = {
            "https://acme.example/a": (200, "text/html; charset=utf-8", "<html><head><title>A</title></head><body><main>One</main></body></html>"),
            "https://acme.example/robots.txt": (200, "text/plain", "User-Agent: *\nAllow: /"),
        }
        before = capture("https://acme.example/", ["/a", "/robots.txt"], fetcher=lambda url: pages[url])
        self.assertEqual(before["/a"]["title"], "A")
        self.assertEqual(before["/a"]["status"], 200)
        self.assertEqual(before["/robots.txt"]["text"], ["User-Agent: *", "Allow: /"])

        pages["https://acme.example/a"] = (200, "text/html", "<html><head><title>B</title></head><body><main>One</main></body></html>")
        after = capture("https://acme.example", ["/a", "/robots.txt"], fetcher=lambda url: pages[url])
        report = "\n".join(compare(before, after))
        self.assertIn("=== /a", report)
        self.assertIn('-  "title": "A"', report)
        self.assertIn('+  "title": "B"', report)
        self.assertNotIn("/robots.txt", report)
        self.assertEqual(compare(before, before), [])


class ReadPathsTest(unittest.TestCase):
    def test_skips_blank_lines_and_comments(self):
        with tempfile.TemporaryDirectory() as tmp:
            path_file = Path(tmp) / "paths.txt"
            path_file.write_text("# comment\n/en\n\n/about\n", encoding="utf-8")
            self.assertEqual(read_paths(str(path_file)), ["/en", "/about"])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `cd <repo-root> && python3 -m unittest scripts/test_page_snapshot.py`
Expected: an error, `ModuleNotFoundError: No module named 'scripts.page_snapshot'`.

- [ ] **Step 3: Implement the tool**

Create `scripts/page_snapshot.py`:

```python
#!/usr/bin/env python3
"""Capture and compare what readers and crawlers see on a list of site paths (spec AD1 and §9).

    python3 scripts/page_snapshot.py capture --base-url https://www.example.com \
        --paths scripts/page_snapshot_paths.txt --out before.json
    python3 scripts/page_snapshot.py compare before.json after.json

What a snapshot keeps:
- HTML responses: the title, meta tags, canonical and alternate links, JSON-LD blocks, and all
  visible body text, including navigation, sidebars and footers.
- Other responses: their lines, with ISO timestamps masked.

Standard library only.
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
import urllib.error
import urllib.request
from html.parser import HTMLParser
from typing import Callable, Tuple

USER_AGENT = "Mozilla/5.0 (compatible; page-snapshot/1.0)"
ISO_TIMESTAMP = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z")
HIDDEN_TAGS = {"script", "style", "noscript", "template"}

Fetcher = Callable[[str], Tuple[int, str, str]]


class _PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.meta: dict[str, str] = {}
        self.links: list[str] = []
        self.json_ld: list[str] = []
        self.body_text: list[str] = []
        self._in_title = False
        self._json_ld: list[str] | None = None
        self._hidden_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = {name: value or "" for name, value in attrs}
        key = attributes.get("name") or attributes.get("property")
        if tag == "title":
            self._in_title = True
        elif tag == "meta" and key:
            self.meta[key] = attributes.get("content", "")
        elif tag == "link" and attributes.get("rel") in ("canonical", "alternate"):
            parts = (attributes.get(name, "") for name in ("rel", "hreflang", "type", "title", "href"))
            self.links.append(" ".join(part for part in parts if part))
        elif tag == "script" and attributes.get("type") == "application/ld+json":
            self._json_ld = []
        if tag in HIDDEN_TAGS:
            self._hidden_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False
        elif tag == "script" and self._json_ld is not None:
            self.json_ld.append("".join(self._json_ld).strip())
            self._json_ld = None
        if tag in HIDDEN_TAGS and self._hidden_depth:
            self._hidden_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title += data
            return
        if self._json_ld is not None:
            self._json_ld.append(data)
            return
        text = data.strip()
        if self._hidden_depth or not text:
            return
        self.body_text.append(text)


def _canonical_json(block: str) -> str:
    try:
        return json.dumps(json.loads(block), sort_keys=True, ensure_ascii=False)
    except json.JSONDecodeError:
        return block


def html_snapshot(html: str) -> dict:
    parser = _PageParser()
    parser.feed(html)
    parser.close()
    return {
        "title": parser.title.strip(),
        "meta": dict(sorted(parser.meta.items())),
        "links": sorted(parser.links),
        "jsonLd": [_canonical_json(block) for block in parser.json_ld],
        "text": parser.body_text,
    }


def text_snapshot(body: str) -> dict:
    return {"text": ISO_TIMESTAMP.sub("<timestamp>", body).splitlines()}


def fetch(url: str) -> Tuple[int, str, str]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return response.status, response.headers.get("Content-Type", ""), response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as error:
        return error.code, error.headers.get("Content-Type", ""), error.read().decode("utf-8", "replace")


def capture(base_url: str, paths: list[str], fetcher: Fetcher = fetch) -> dict:
    snapshots = {}
    for path in paths:
        status, content_type, body = fetcher(base_url.rstrip("/") + path)
        snapshot = html_snapshot(body) if "text/html" in content_type else text_snapshot(body)
        snapshots[path] = {"status": status, **snapshot}
    return snapshots


def compare(before: dict, after: dict) -> list[str]:
    report: list[str] = []
    for path in sorted(set(before) | set(after)):
        old = json.dumps(before.get(path), indent=2, sort_keys=True, ensure_ascii=False).splitlines()
        new = json.dumps(after.get(path), indent=2, sort_keys=True, ensure_ascii=False).splitlines()
        if old != new:
            report.append(f"=== {path}")
            report.extend(difflib.unified_diff(old, new, "before", "after", lineterm="", n=1))
    return report


def read_paths(path_file: str) -> list[str]:
    with open(path_file, encoding="utf-8") as handle:
        return [line.strip() for line in handle if line.strip() and not line.lstrip().startswith("#")]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest="command", required=True)
    capture_parser = commands.add_parser("capture", help="snapshot every path under a base URL")
    capture_parser.add_argument("--base-url", required=True)
    capture_parser.add_argument("--paths", required=True, help="file with one site path per line")
    capture_parser.add_argument("--out", required=True)
    compare_parser = commands.add_parser("compare", help="print the differences between two snapshots")
    compare_parser.add_argument("before")
    compare_parser.add_argument("after")
    args = parser.parse_args(argv)

    if args.command == "capture":
        snapshots = capture(args.base_url, read_paths(args.paths))
        with open(args.out, "w", encoding="utf-8") as handle:
            json.dump(snapshots, handle, indent=2, sort_keys=True, ensure_ascii=False)
        print(f"captured {len(snapshots)} paths into {args.out}")
        return 0

    with open(args.before, encoding="utf-8") as before, open(args.after, encoding="utf-8") as after:
        report = compare(json.load(before), json.load(after))
    print("\n".join(report) if report else "no differences")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `cd <repo-root> && python3 -m unittest scripts/test_page_snapshot.py`
Expected: `OK` (5 tests).

- [ ] **Step 5: Create the path list**

Create `scripts/page_snapshot_paths.txt`:

```
# Site paths compared right before and right after a release.
# Capture both snapshots inside one window with no collection or translation backfill.
# Period 2026-09-13 is frozen, so its pages change only when the code changes.
/en/week/2026-09-13
/de/week/2026-09-13
/zh/week/2026-09-13
/ja/week/2026-09-13
/en/news/2026-09-13/tech-2843
/zh/news/2026-09-13/tech-2843
/en/tools/ai-news-api
/en/tools/ai-report-generator
/en/tools/ai-stock-tracker
/about
/ai-disclosure
/editorial-policy
/source-methodology
/corrections
/contact
/impressum
/datenschutz
/premium
/for-teams
/login
/unsubscribe
/robots.txt
/llms.txt
/api/content-summary?lang=en&periodId=2026-09-13
/api/content-summary?lang=zh&periodId=2026-09-13
# Live data: these pages also change when a collection or backfill changes the stories.
/en
/de
/en/topic/openai
/en/tools/ai-news-aggregator
/zh/tools/ai-news-aggregator
```

- [ ] **Step 6: Smoke-test against production (30 read-only GET requests)**

```bash
cd <repo-root> && python3 scripts/page_snapshot.py capture --base-url https://www.datacubeai.space --paths scripts/page_snapshot_paths.txt --out <sdd-workspace>/snapshot-smoke.json
cd <repo-root> && python3 scripts/page_snapshot.py compare <sdd-workspace>/snapshot-smoke.json <sdd-workspace>/snapshot-smoke.json
cd <repo-root> && python3 -c "import json; s = json.load(open('<sdd-workspace>/snapshot-smoke.json')); print({p: v['status'] for p, v in s.items() if v['status'] != 200})"
```

Expected:
- `captured 30 paths`;
- `no differences`;
- `{}`, meaning every path returned 200.

The snapshot file stays in the git-ignored SDD workspace and is never committed.

- [ ] **Step 7: Run both script test files in CI**

In `.github/workflows/ci.yml`, change the `brand-guard` job's `Script tests` step to:

```yaml
      - name: Script tests
        run: python3 -m unittest scripts/test_brand_guard.py scripts/test_page_snapshot.py
```

Run: `cd <repo-root> && python3 -m unittest scripts/test_brand_guard.py scripts/test_page_snapshot.py && python3 scripts/brand_guard.py scripts/page_snapshot.py scripts/page_snapshot_paths.txt scripts/test_page_snapshot.py`
Expected: `OK` (12 tests) and `brand guard: clean`.

- [ ] **Step 8: Commit**

```bash
git -C <repo-root> add scripts/page_snapshot.py scripts/test_page_snapshot.py scripts/page_snapshot_paths.txt .github/workflows/ci.yml
git -C <repo-root> commit -m "chore: page snapshot tool for before/after release comparison

Spec AD1 and §9: captures title, meta, links, JSON-LD and visible text per path and
prints the differences between two captures.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Frontend brand config, apex redirect, API guard hosts

This task creates the frontend brand source (spec AD1) with the legacy values as defaults. It also moves the apex→www redirect from `vercel.json` into `next.config.mjs`, which reads the same defaults. No rendered output changes.

**Files:**
- Create: `ai-information-hub/lib/brand-defaults.json`
- Create: `ai-information-hub/lib/brand.ts`
- Create: `ai-information-hub/lib/brand.test.ts`
- Create: `ai-information-hub/test/next-config.test.ts`
- Modify: `ai-information-hub/next.config.mjs`
- Modify: `ai-information-hub/lib/server/api-guard.ts:1-4`
- Delete: `ai-information-hub/vercel.json`

**Interfaces:**
- **Consumes:** the goldens from Task 1.
- **Produces:** `@/lib/brand`, which exports:

| Export | Signature / value |
|---|---|
| `Brand` | type: `{ name, shortName, siteUrl, siteHost, apexHost, founderName, githubIssuesUrl }`, all `string` |
| `BrandEnv` | type |
| `buildBrand` | `(env: BrandEnv): Brand` |
| `BRAND` | `Brand` |
| `FROZEN_IDS` | `{ atomTagPrefix: 'tag:datacubeai.space,2026:', takeawaysAnchorId: 'dcai-takeaways' }` |
| `fillBrand` | `(template: string, brand?: Brand): string`; placeholders `{brand}`, `{brandShort}`, `{siteUrl}`, `{siteHost}` |
| `absoluteUrl` | `(path: string, brand?: Brand): string` |
| `brandedTitle` | `(title: string, brand?: Brand): string`, returns `"<title> \| <brand name>"` |

- [ ] **Step 1: Write the failing brand tests**

Create `ai-information-hub/lib/brand.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { BRAND, FROZEN_IDS, absoluteUrl, brandedTitle, buildBrand, fillBrand } from './brand'

describe('buildBrand', () => {
  it('reproduces the current identity when no variable is set', () => {
    expect(buildBrand({})).toEqual({
      name: 'Data Cube AI',
      shortName: 'Data Cube',
      siteUrl: 'https://www.datacubeai.space',
      siteHost: 'www.datacubeai.space',
      apexHost: 'datacubeai.space',
      founderName: '',
      githubIssuesUrl: 'https://github.com/Rswcf/DataCube-AI-Space/issues',
    })
  })

  it('takes trimmed overrides and drops a trailing slash from the site URL', () => {
    expect(
      buildBrand({
        NEXT_PUBLIC_BRAND_NAME: ' Acme News ',
        NEXT_PUBLIC_BRAND_SHORT_NAME: 'Acme',
        NEXT_PUBLIC_SITE_URL: 'https://acme.example/',
        NEXT_PUBLIC_FOUNDER_NAME: 'Jane Doe',
      }),
    ).toMatchObject({
      name: 'Acme News',
      shortName: 'Acme',
      siteUrl: 'https://acme.example',
      siteHost: 'acme.example',
      apexHost: 'acme.example',
      founderName: 'Jane Doe',
    })
  })

  it('treats empty and blank variables as unset', () => {
    const brand = buildBrand({ NEXT_PUBLIC_BRAND_NAME: '', NEXT_PUBLIC_SITE_URL: '  ' })
    expect([brand.name, brand.siteUrl]).toEqual(['Data Cube AI', 'https://www.datacubeai.space'])
  })

  it('exports the default brand when the environment sets no brand variable', () => {
    expect(BRAND).toEqual(buildBrand({}))
  })
})

describe('fillBrand', () => {
  const acme = buildBrand({
    NEXT_PUBLIC_BRAND_NAME: 'Acme News',
    NEXT_PUBLIC_BRAND_SHORT_NAME: 'Acme',
    NEXT_PUBLIC_SITE_URL: 'https://acme.example',
  })

  it('replaces every placeholder, however often it appears', () => {
    expect(fillBrand('{brand} | {brand} ({brandShort}) {siteUrl} {siteHost}', acme)).toBe(
      'Acme News | Acme News (Acme) https://acme.example acme.example',
    )
  })

  it('leaves other braces untouched', () => {
    expect(fillBrand('Price {amount}', acme)).toBe('Price {amount}')
  })
})

describe('absoluteUrl and brandedTitle', () => {
  it('joins site paths with or without a leading slash', () => {
    expect(absoluteUrl('/en/week/2026-09-13')).toBe('https://www.datacubeai.space/en/week/2026-09-13')
    expect(absoluteUrl('about')).toBe('https://www.datacubeai.space/about')
    expect(absoluteUrl('/')).toBe('https://www.datacubeai.space/')
  })

  it('appends the brand the way the root title template does', () => {
    expect(brandedTitle('Editorial Policy')).toBe('Editorial Policy | Data Cube AI')
  })
})

describe('FROZEN_IDS', () => {
  it('keeps the identifiers that must survive a rename', () => {
    expect(FROZEN_IDS).toEqual({ atomTagPrefix: 'tag:datacubeai.space,2026:', takeawaysAnchorId: 'dcai-takeaways' })
  })
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `cd <repo-root>/ai-information-hub && npx vitest run lib/brand.test.ts`
Expected: FAIL, because `./brand` cannot be resolved.

- [ ] **Step 3: Create the brand config and module**

Create `ai-information-hub/lib/brand-defaults.json`:

```json
{
  "name": "Data Cube AI",
  "shortName": "Data Cube",
  "siteUrl": "https://www.datacubeai.space",
  "founderName": "",
  "githubIssuesUrl": "https://github.com/Rswcf/DataCube-AI-Space/issues"
}
```

Create `ai-information-hub/lib/brand.ts`:

```ts
import defaults from './brand-defaults.json'

/**
 * Public identity of the site (spec AD1). Rename by changing lib/brand-defaults.json or the NEXT_PUBLIC_*
 * variables. ai-hub-backend/app/config.py carries the same identity for the backend.
 */
export type Brand = {
  name: string
  shortName: string
  siteUrl: string
  siteHost: string
  apexHost: string
  founderName: string
  githubIssuesUrl: string
}

export type BrandEnv = {
  NEXT_PUBLIC_BRAND_NAME?: string
  NEXT_PUBLIC_BRAND_SHORT_NAME?: string
  NEXT_PUBLIC_SITE_URL?: string
  NEXT_PUBLIC_FOUNDER_NAME?: string
}

function pick(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : fallback
}

export function buildBrand(env: BrandEnv): Brand {
  const siteUrl = pick(env.NEXT_PUBLIC_SITE_URL, defaults.siteUrl).replace(/\/+$/, '')
  const siteHost = new URL(siteUrl).hostname
  return {
    name: pick(env.NEXT_PUBLIC_BRAND_NAME, defaults.name),
    shortName: pick(env.NEXT_PUBLIC_BRAND_SHORT_NAME, defaults.shortName),
    siteUrl,
    siteHost,
    apexHost: siteHost.replace(/^www\./, ''),
    founderName: pick(env.NEXT_PUBLIC_FOUNDER_NAME, defaults.founderName),
    githubIssuesUrl: defaults.githubIssuesUrl,
  }
}

// Each variable is read by its full name, so Next.js inlines it into client bundles.
export const BRAND: Brand = buildBrand({
  NEXT_PUBLIC_BRAND_NAME: process.env.NEXT_PUBLIC_BRAND_NAME,
  NEXT_PUBLIC_BRAND_SHORT_NAME: process.env.NEXT_PUBLIC_BRAND_SHORT_NAME,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_FOUNDER_NAME: process.env.NEXT_PUBLIC_FOUNDER_NAME,
})

/** Identifiers that must survive a rename (spec AD1). Never derive them from BRAND. */
export const FROZEN_IDS = {
  atomTagPrefix: 'tag:datacubeai.space,2026:',
  takeawaysAnchorId: 'dcai-takeaways',
} as const

/** Fills the {brand}, {brandShort}, {siteUrl} and {siteHost} placeholders of translated strings. */
export function fillBrand(template: string, brand: Brand = BRAND): string {
  return template
    .replaceAll('{brand}', brand.name)
    .replaceAll('{brandShort}', brand.shortName)
    .replaceAll('{siteUrl}', brand.siteUrl)
    .replaceAll('{siteHost}', brand.siteHost)
}

export function absoluteUrl(path: string, brand: Brand = BRAND): string {
  return `${brand.siteUrl}${path.startsWith('/') ? path : `/${path}`}`
}

/** "<title> | <brand>": the format the title template in lib/site-metadata.ts produces. */
export function brandedTitle(title: string, brand: Brand = BRAND): string {
  return `${title} | ${brand.name}`
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `cd <repo-root>/ai-information-hub && npx vitest run lib/brand.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Write the failing redirect tests**

Create `ai-information-hub/test/next-config.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

async function loadRedirects() {
  const { default: config } = await import('../next.config.mjs')
  // NextConfig types redirects as optional, so a missing function fails the test rather than the type check.
  if (!config.redirects) throw new Error('next.config.mjs must define redirects()')
  return config.redirects()
}

describe('next.config redirects', () => {
  it('sends the apex host to the canonical www host in one permanent hop, like the former vercel.json', async () => {
    expect(await loadRedirects()).toEqual([
      {
        source: '/:path(.*)',
        has: [{ type: 'host', value: 'datacubeai.space' }],
        destination: 'https://www.datacubeai.space/:path',
        permanent: true,
      },
    ])
  })

  it('follows NEXT_PUBLIC_SITE_URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.acme.example')
    expect(await loadRedirects()).toEqual([
      expect.objectContaining({ has: [{ type: 'host', value: 'acme.example' }], destination: 'https://www.acme.example/:path' }),
    ])
  })

  it('adds no redirect when the canonical site has no www host', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://acme.example')
    expect(await loadRedirects()).toEqual([])
  })
})
```

- [ ] **Step 6: Run the tests to see them fail**

Run: `cd <repo-root>/ai-information-hub && npx vitest run test/next-config.test.ts`
Expected: FAIL in all 3 tests with `Error: next.config.mjs must define redirects()`.

- [ ] **Step 7: Move the redirect into `next.config.mjs`**

Replace `ai-information-hub/next.config.mjs` with:

```js
import { readFileSync } from 'node:fs'

// The canonical site comes from the brand config (lib/brand-defaults.json, shared with lib/brand.ts);
// NEXT_PUBLIC_SITE_URL overrides it at build time.
const brandDefaults = JSON.parse(readFileSync(new URL('./lib/brand-defaults.json', import.meta.url), 'utf8'))
const siteUrl = new URL((process.env.NEXT_PUBLIC_SITE_URL || '').trim() || brandDefaults.siteUrl)
const apexHost = siteUrl.hostname.replace(/^www\./, '')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep metadata in the initial <head> for crawlers and audit tools instead of
  // streaming it after page content.
  htmlLimitedBots: /.*/,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.youtube.com', pathname: '/vi/**' },
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/:path((?!content-summary).*)',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://img.youtube.com https://i.ytimg.com; font-src 'self' data:; connect-src 'self' https://api-production-3ee5.up.railway.app https://*.vercel-insights.com https://vitals.vercel-insights.com; frame-src https://www.youtube.com https://www.youtube-nocookie.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests" },
        ],
      },
    ]
  },
  async redirects() {
    // Apex host → canonical www host in one permanent (308) hop; path and query are kept.
    if (apexHost === siteUrl.hostname) return []
    return [
      {
        source: '/:path(.*)',
        has: [{ type: 'host', value: apexHost }],
        destination: `${siteUrl.origin}/:path`,
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/:path*',
          has: [{ type: 'header', key: 'next-router-prefetch' }],
          missing: [{ type: 'header', key: 'rsc' }],
          destination: '/api/prefetch-noop',
        },
      ],
    }
  },
}

export default nextConfig
```

Then delete the file that held the redirect:

```bash
git -C <repo-root> rm ai-information-hub/vercel.json
```

- [ ] **Step 8: Run the redirect tests to see them pass**

Run: `cd <repo-root>/ai-information-hub && npx vitest run test/next-config.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 9: Allowed API hosts from the brand config**

In `ai-information-hub/lib/server/api-guard.ts`:
- add `import { BRAND } from "@/lib/brand";` as the first line;
- replace the two legacy host literals at the top of `DEFAULT_ALLOWED_HOSTS`. The result is:

```ts
import { BRAND } from "@/lib/brand";

const DEFAULT_ALLOWED_HOSTS = new Set([
  BRAND.apexHost,
  BRAND.siteHost,
  "ai-information-hub.vercel.app",
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
]);
```

Leave `getAllowedHosts()` unchanged. It still adds the `NEXT_PUBLIC_SITE_URL` and `VERCEL_URL` hosts.

- [ ] **Step 10: Checks**

```bash
cd <repo-root> && python3 scripts/brand_guard.py ai-information-hub/next.config.mjs ai-information-hub/lib/server/api-guard.ts ai-information-hub/lib/brand.ts ai-information-hub/lib/brand-defaults.json
cd <repo-root>/ai-information-hub && npx vitest run test/golden && npm run lint && npm test
```

Expected:
- `brand guard: clean`;
- the goldens pass unchanged (`Tests  71 passed (71)`);
- the type check is clean;
- all tests pass: `Tests  141 passed (141)` in 12 files.

- [ ] **Step 11: Commit**

```bash
git -C <repo-root> add ai-information-hub/lib/brand-defaults.json ai-information-hub/lib/brand.ts ai-information-hub/lib/brand.test.ts ai-information-hub/test/next-config.test.ts ai-information-hub/next.config.mjs ai-information-hub/lib/server/api-guard.ts
git -C <repo-root> commit -m "feat(brand): frontend brand config with legacy defaults; apex redirect in next.config

Spec AD1: lib/brand.ts builds BRAND from NEXT_PUBLIC_* over lib/brand-defaults.json. The
non-www redirect moves from vercel.json to next.config.mjs redirects() with the same 308.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Backend brand settings, email and API title

This task adds the spec §6.2 `Settings` fields with legacy defaults. It also derives the defaults that depend on the site (sender address, RSS user agent, CORS origins). Explicit environment values still win, and Railway sets `NEWSLETTER_FROM_EMAIL` and `CORS_ORIGINS`. The newsletter email and the API title then read the brand from the settings. The Task 2 goldens must stay byte-identical.

**Files:**
- Modify: `ai-hub-backend/app/config.py`
- Create: `ai-hub-backend/tests/test_brand_settings.py`
- Modify: `ai-hub-backend/app/services/newsletter_sender.py`
- Modify: `ai-hub-backend/app/main.py`
- Create: `ai-hub-backend/tests/test_newsletter_brand.py`
- Modify: `ai-hub-backend/tests/test_newsletter_recipient_messages.py`
- Modify: `ai-hub-backend/tests/test_newsletter_test_send.py`
- Modify: `ai-hub-backend/tests/test_newsletter_translation_gate.py`

**Interfaces:**
- **Consumes:** `golden.assert_golden` and `newsletter_fixtures.period_data` from Task 2.
- **Produces:**
  - `Settings` fields:
    - `brand_name`, `brand_short_name`, `founder_name`, `newsletter_from_name`, `github_issues_url`, `api_title`;
    - `site_url`, stored without a trailing slash;
    - `api_key_prefix`, at most 8 characters;
    - `rss_user_agent`.
  - The property `Settings.site_domain`: the site host without `www.`.
  - Derived defaults for `newsletter_from_email`, `rss_user_agent` and `cors_origins`.
  - `newsletter_sender._recipient_messages(from_email, subject, html_content, recipients, signing_secret, site_url)`.

- [ ] **Step 1: Write the failing settings tests**

Create `ai-hub-backend/tests/test_brand_settings.py`:

```python
"""Brand identity settings: legacy defaults, overrides and derived values (spec AD1 and §6.2)."""

import pytest
from pydantic import ValidationError

from app.config import Settings

BRAND_ENV = (
    "BRAND_NAME", "BRAND_SHORT_NAME", "SITE_URL", "FOUNDER_NAME", "NEWSLETTER_FROM_NAME", "NEWSLETTER_FROM_EMAIL",
    "API_KEY_PREFIX", "RSS_USER_AGENT", "GITHUB_ISSUES_URL", "API_TITLE", "CORS_ORIGINS",
)


@pytest.fixture(autouse=True)
def no_brand_environment(monkeypatch):
    for name in BRAND_ENV:
        monkeypatch.delenv(name, raising=False)


def _settings(**overrides) -> Settings:
    return Settings(_env_file=None, **overrides)


def test_defaults_reproduce_the_current_identity():
    settings = _settings()
    assert settings.brand_name == "Data Cube AI"
    assert settings.brand_short_name == "Data Cube"
    assert settings.site_url == "https://www.datacubeai.space"
    assert settings.site_domain == "datacubeai.space"
    assert settings.founder_name == ""
    assert settings.newsletter_from_name == "Data Cube AI"
    assert settings.newsletter_from_email == "Data Cube AI <newsletter@datacubeai.space>"
    assert settings.api_key_prefix == "dcai_"
    assert settings.rss_user_agent == "Mozilla/5.0 (compatible; AI-Hub-Bot/1.0; +https://www.datacubeai.space)"
    assert settings.github_issues_url == "https://github.com/Rswcf/DataCube-AI-Space/issues"
    assert settings.api_title == "AI Hub API"
    assert settings.cors_origins == [
        "http://localhost:3000",
        "http://localhost:3002",
        "https://www.datacubeai.space",
        "https://ai-information-hub.vercel.app",
    ]


def test_values_derived_from_the_site_follow_a_new_site_and_sender_name():
    settings = _settings(site_url="https://www.acme.example/", newsletter_from_name="Acme News")
    assert settings.site_url == "https://www.acme.example"
    assert settings.site_domain == "acme.example"
    assert settings.newsletter_from_email == "Acme News <newsletter@acme.example>"
    assert settings.rss_user_agent == "Mozilla/5.0 (compatible; AI-Hub-Bot/1.0; +https://www.acme.example)"
    assert "https://www.acme.example" in settings.cors_origins


def test_explicit_environment_values_win_over_derived_defaults(monkeypatch):
    monkeypatch.setenv("SITE_URL", "https://www.acme.example")
    monkeypatch.setenv("NEWSLETTER_FROM_EMAIL", "Legacy <news@example.com>")
    monkeypatch.setenv("CORS_ORIGINS", '["https://only.example"]')
    settings = _settings()
    assert settings.site_url == "https://www.acme.example"
    assert settings.newsletter_from_email == "Legacy <news@example.com>"
    assert settings.cors_origins == ["https://only.example"]


def test_api_key_prefix_is_at_most_eight_characters():
    assert _settings(api_key_prefix="abcdefg_").api_key_prefix == "abcdefg_"
    with pytest.raises(ValidationError) as excinfo:
        _settings(api_key_prefix="toolong_x")
    assert [error["type"] for error in excinfo.value.errors()] == ["string_too_long"]


def test_api_title_comes_from_the_settings():
    from app.config import get_settings
    from app.main import app

    assert app.title == get_settings().api_title == "AI Hub API"
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_brand_settings.py -q`
Expected: failures from `AttributeError` (no `brand_name`) and `ValidationError` (extra inputs are not permitted). `test_api_title_comes_from_the_settings` fails with `AttributeError`.

- [ ] **Step 3: Replace `app/config.py`**

Replace `ai-hub-backend/app/config.py` with:

```python
"""
Application configuration loaded from environment variables.
"""

from functools import lru_cache
from urllib.parse import urlsplit

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "postgresql://localhost/ai_hub"

    # API Keys
    openrouter_api_key: str = ""
    youtube_api_key: str = ""
    polygon_api_key: str = ""  # Polygon.io (Massive.com) API for stock data

    # Admin
    admin_api_key: str = ""
    app_timezone: str = "Europe/Berlin"

    # Brand identity (spec AD1). The defaults are the current brand; a rename changes these values or
    # their environment variables, never the code. Keep in step with ai-information-hub/lib/brand-defaults.json.
    brand_name: str = "Data Cube AI"
    brand_short_name: str = "Data Cube"
    site_url: str = "https://www.datacubeai.space"
    founder_name: str = ""  # "Made by <founder>" renders only when set
    newsletter_from_name: str = "Data Cube AI"
    api_key_prefix: str = Field(default="dcai_", max_length=8)  # new developer keys only; stored keys keep working
    rss_user_agent: str = ""  # empty: "Mozilla/5.0 (compatible; AI-Hub-Bot/1.0; +<site_url>)"
    github_issues_url: str = "https://github.com/Rswcf/DataCube-AI-Space/issues"
    api_title: str = "AI Hub API"

    # Newsletter
    resend_api_key: str = ""
    beehiiv_api_key: str = ""
    beehiiv_publication_id: str = ""
    newsletter_from_email: str = ""  # empty: "<newsletter_from_name> <newsletter@<site domain>>"

    # One-click unsubscribe tokens (HMAC-SHA256, at least 32 characters). Generate with:
    #   python -c "import secrets; print(secrets.token_urlsafe(48))"
    signing_secret: str = ""
    signing_secret_previous: str = ""  # verifies old links during a rotation, only alongside a usable signing_secret

    # Contact form destination (POST /api/contact)
    contact_inbox: str = ""

    # Stripe (unused since R1; membership / SP3a reuses these)
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_premium_price_id: str = ""  # Stripe Price ID for premium subscription
    stripe_api_developer_price_id: str = ""
    stripe_api_business_price_id: str = ""

    # CORS (empty: local dev servers, site_url and the Vercel production alias)
    cors_origins: list[str] = []

    # Collection settings
    hn_min_points: int = 100
    hn_days: int = 1
    hn_limit: int = 50
    youtube_max_results: int = 10

    # Output counts
    tech_output_count: int = 10
    tips_output_count: int = 5
    investment_output_count: int = 5
    video_output_count: int = 2

    # Thread pool and timeout settings
    rss_max_workers: int = 8
    hn_max_workers: int = 8
    hn_enhance_max_workers: int = 6
    llm_max_workers: int = 2

    # HTTP timeouts (seconds)
    rss_request_timeout_seconds: int = 20
    hn_request_timeout_seconds: int = 30

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def site_domain(self) -> str:
        """The site host without a leading "www.", e.g. for sender addresses and link text."""
        host = urlsplit(self.site_url).hostname or ""
        return host.removeprefix("www.")

    @model_validator(mode="after")
    def _derive_brand_defaults(self) -> "Settings":
        self.site_url = self.site_url.rstrip("/")
        if not self.newsletter_from_email:
            self.newsletter_from_email = f"{self.newsletter_from_name} <newsletter@{self.site_domain}>"
        if not self.rss_user_agent:
            self.rss_user_agent = f"Mozilla/5.0 (compatible; AI-Hub-Bot/1.0; +{self.site_url})"
        if not self.cors_origins:
            self.cors_origins = [
                "http://localhost:3000",
                "http://localhost:3002",
                self.site_url,
                "https://ai-information-hub.vercel.app",
            ]
        return self


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
```

- [ ] **Step 4: Point `main.py` at the API title**

In `ai-hub-backend/app/main.py`:
- in `lifespan`, log `logger.info("Starting %s...", get_settings().api_title)` and `logger.info("Shutting down %s...", get_settings().api_title)`;
- set `app = FastAPI(title=settings.api_title, …)`, keeping the other arguments;
- set the root endpoint's `"name": settings.api_title`.

- [ ] **Step 5: Run the settings tests to see them pass**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_brand_settings.py -q`
Expected: 5 passed.

- [ ] **Step 6: Write the failing email tests and pass the site URL in existing tests**

Create `ai-hub-backend/tests/test_newsletter_brand.py`:

```python
"""The newsletter email takes its identity from the brand settings (spec AD1)."""

import app.services.newsletter_sender as sender
from app.config import Settings
from newsletter_fixtures import period_data

ACME = Settings(_env_file=None, brand_name="Acme News", site_url="https://www.acme.example")


def test_email_uses_the_brand_settings(monkeypatch):
    monkeypatch.setattr(sender, "get_settings", lambda: ACME)

    html = sender._build_email_html(period_data(), "en")

    assert "Acme News" in html
    assert 'href="https://www.acme.example/en/week/2026-09-13"' in html
    assert ">acme.example</a>" in html
    assert "You received this email because you subscribed to the Acme News newsletter." in html
    assert "Data Cube" not in html
    assert "datacubeai" not in html


def test_recipient_links_use_the_site_url_argument():
    html = f'<a href="{sender.UNSUBSCRIBE_URL_PLACEHOLDER}">u</a>'
    recipients = [{"id": "sub_1", "email": "reader@example.com"}]

    messages = sender._recipient_messages("News <n@example.com>", "S", html, recipients, "s" * 40, "https://www.acme.example")

    assert messages[0]["headers"]["List-Unsubscribe"].startswith("<https://www.acme.example/api/newsletter/unsubscribe?t=")
    assert 'href="https://www.acme.example/unsubscribe?t=' in messages[0]["html"]
```

Update three existing test files to the new signature and settings:
- **`ai-hub-backend/tests/test_newsletter_recipient_messages.py`:**
  - add `SITE = "https://www.datacubeai.space"` below `SECRET`;
  - append `SITE` as the last argument of every `sender._recipient_messages(...)` call;
  - leave the assertions unchanged.
- **`ai-hub-backend/tests/test_newsletter_test_send.py`:** add `site_url="https://www.datacubeai.space",` to the `SimpleNamespace(...)` in `_patch`.
- **`ai-hub-backend/tests/test_newsletter_translation_gate.py`:** add `site_url="https://www.datacubeai.space",` to the `SimpleNamespace(...)` in `_patch_sender`.

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_newsletter_brand.py tests/test_newsletter_recipient_messages.py -q`
Expected: failures. The Acme brand is not rendered, and `_recipient_messages()` rejects the sixth argument with `TypeError`.

- [ ] **Step 7: Brand the email from the settings**

In `ai-hub-backend/app/services/newsletter_sender.py`:

1. **Delete the module constant** `SITE_URL = "https://www.datacubeai.space"` and the blank line after it.

2. **Put the brand placeholder into all eight `footer_msg` strings.** The strings keep their `\u` escapes:

```bash
cd <repo-root> && python3 - <<'EOF'
from pathlib import Path
path = Path("ai-hub-backend/app/services/newsletter_sender.py")
lines = path.read_text(encoding="utf-8").split("\n")
count = 0
for index, line in enumerate(lines):
    if line.lstrip().startswith('"footer_msg"') and "Data Cube AI" in line:
        lines[index] = line.replace("Data Cube AI", "{brand}")
        count += 1
assert count == 8, count
path.write_text("\n".join(lines), encoding="utf-8")
print("footer_msg strings updated:", count)
EOF
```

3. **`_brand_lockup`:** replace the text line `          Data Cube AI` with `          {_esc(get_settings().brand_name)}`.

4. **`_build_email_html`:** below its docstring, replace the two lines `period_id = data["period_id"]` and `week_url = f"{SITE_URL}/{lang}/week/{period_id}"` with:

```python
    settings = get_settings()
    brand_name = _esc(settings.brand_name)
    period_id = data["period_id"]
    week_url = f"{settings.site_url}/{lang}/week/{period_id}"
```

5. **Remaining brand literals in `_build_email_html`:**
   - The masthead cell with `font-size:48px`: replace its text `Data Cube AI` with `{brand_name}`.
   - The promo cell with `font-size:11px` inside the `BG_PROMO` table: replace its text `Data Cube AI` with `{brand_name}`.
   - The footer link: `<a href="{SITE_URL}" …>datacubeai.space</a>` becomes `<a href="{settings.site_url}" …>{_esc(settings.site_domain)}</a>`. Keep the style attribute.
   - The footer message: `{_esc(_s(lang, "footer_msg"))}` becomes `{_esc(_s(lang, "footer_msg").format(brand=settings.brand_name))}`.
   - The address line: `Data Cube AI &bull; Frankfurt am Main, Germany` becomes `{brand_name} &bull; Frankfurt am Main, Germany`.

6. **`_recipient_messages`:** replace the function with:

```python
def _recipient_messages(
    from_email: str,
    subject: str,
    html_content: str,
    recipients: list[dict],
    signing_secret: str,
    site_url: str,
) -> list[dict]:
    """One Resend message per recipient, each with a personal unsubscribe link.

    With a usable SIGNING_SECRET and a Beehiiv subscription id, the footer
    links to the token confirm page and RFC 8058 headers enable one-click
    unsubscribe in the mail client. Otherwise the message still goes out and
    the footer links to the token-less /unsubscribe page (send_newsletter logs
    the degraded state once per run).
    """
    messages = []
    for recipient in recipients:
        token = mint_token(recipient.get("id"), signing_secret)
        message = {"from": from_email, "to": [recipient["email"]], "subject": subject}
        if token:
            message["html"] = html_content.replace(
                UNSUBSCRIBE_URL_PLACEHOLDER, f"{site_url}/unsubscribe?t={token}"
            )
            message["headers"] = {
                "List-Unsubscribe": f"<{site_url}/api/newsletter/unsubscribe?t={token}>",
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            }
        else:
            message["html"] = html_content.replace(UNSUBSCRIBE_URL_PLACEHOLDER, f"{site_url}/unsubscribe")
        messages.append(message)
    return messages
```

7. **Both `_recipient_messages(` calls** (in `send_newsletter` and `send_test_newsletter`): pass `settings.site_url` as the last argument. Both functions already have a local `settings = get_settings()`.

- [ ] **Step 8: Run the email tests and the goldens**

```bash
cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_newsletter_brand.py tests/test_newsletter_recipient_messages.py tests/test_newsletter_test_send.py tests/test_newsletter_translation_gate.py tests/test_brand_goldens.py tests/test_brand_settings.py -q
git -C <repo-root> status --short ai-hub-backend/tests/goldens
```

Expected:
- all tests pass;
- the goldens pass without `UPDATE_GOLDENS`;
- the `status` command prints nothing.

- [ ] **Step 9: Lint, guard and the backend suite**

```bash
cd <repo-root>/ai-hub-backend && venv312/bin/python -m ruff check app/ scripts/ tests/
cd <repo-root> && python3 scripts/brand_guard.py ai-hub-backend/app/services/newsletter_sender.py ai-hub-backend/app/main.py
cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m "not integration" -q
```

Expected:
- ruff is clean;
- `brand guard: clean`;
- all unit tests pass.

- [ ] **Step 10: Commit**

```bash
git -C <repo-root> add ai-hub-backend/app/config.py ai-hub-backend/app/main.py ai-hub-backend/app/services/newsletter_sender.py ai-hub-backend/tests/test_brand_settings.py ai-hub-backend/tests/test_newsletter_brand.py ai-hub-backend/tests/test_newsletter_recipient_messages.py ai-hub-backend/tests/test_newsletter_test_send.py ai-hub-backend/tests/test_newsletter_translation_gate.py
git -C <repo-root> commit -m "feat(brand): backend brand settings; email and API title read them

Spec AD1 / §6.2 settings with the current brand as defaults; sender address, RSS user agent
and CORS origins derive from site_url unless set. Email goldens unchanged.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Backend identity in deals, developer keys, RSS, collector and prompts

This task removes the remaining backend brand literals.
- The deals disclosure keeps its text; the Task 2 golden proves it.
- Output changes: the CSV filename (B4), and the brand spelling in the LLM prompts and in the collector fallback (B1).

**Files:**
- Modify: `ai-hub-backend/app/routers/deals.py`
- Modify: `ai-hub-backend/app/routers/developer.py`
- Modify: `ai-hub-backend/app/services/rss_fetcher.py`
- Modify: `ai-hub-backend/app/services/collector.py`
- Modify: `ai-hub-backend/app/services/llm_processor.py`
- Modify: `ai-hub-backend/app/models/week.py:33-34`
- Modify: `ai-hub-backend/app/schemas/trend.py:46`
- Modify: `ai-hub-backend/.env.example`
- Create: `ai-hub-backend/tests/test_brand_identity.py`
- Modify: `ai-hub-backend/tests/test_developer_rate_limit_message.py`

**Interfaces:**
- **Consumes:** the `Settings` fields from Task 6.
- **Produces:**
  - `deals._disclosure(settings: Settings) -> str`;
  - `deals.DISCLOSURE: str`, computed at import;
  - `deals._export_filename(settings: Settings) -> str`.

- [ ] **Step 1: Write the failing tests**

Create `ai-hub-backend/tests/test_brand_identity.py`:

```python
"""Backend identity strings come from the brand settings (spec AD1 and §6.2)."""

import pytest

from app.config import Settings
from app.routers import deals, developer
from app.services import collector, rss_fetcher
from app.services.llm_processor import LLMProcessor

ACME = Settings(
    _env_file=None,
    brand_name="Acme News",
    site_url="https://www.acme.example",
    api_key_prefix="acme_",
    github_issues_url="https://github.com/acme/news/issues",
)

ARTICLE = {
    "source": "Example News",
    "title": "Startup reportedly in talks to raise $50M",
    "link": "https://example.com/story",
    "summary": "The startup is reportedly in talks to raise $50M, according to people familiar with the matter.",
    "published": "2026-09-12",
}
VIDEO = {
    "video_id": "abc123XYZ00",
    "original_title": "How agents plan",
    "channel_name": "Example Channel",
    "view_count_formatted": "1K",
    "duration_formatted": "10:00",
    "description": "A walkthrough.",
}


def test_disclosure_links_the_site_and_the_issue_tracker():
    text = deals._disclosure(ACME)
    assert "(https://www.acme.example/funding)" in text
    assert text.endswith("Report errors: https://github.com/acme/news/issues")


def test_export_filename_is_derived_from_the_brand_name():
    assert deals._export_filename(ACME) == "acme-news-deals.csv"
    assert deals._export_filename(Settings(_env_file=None)) == "data-cube-ai-deals.csv"


def test_new_api_keys_use_the_configured_prefix(monkeypatch):
    monkeypatch.setattr(developer, "get_settings", lambda: ACME)
    key = developer._generate_api_key()
    assert key.startswith("acme_")
    assert len(key) == len("acme_") + 32


def test_rss_requests_send_the_configured_user_agent(monkeypatch):
    seen = {}

    class FakeResponse:
        content = b"<rss></rss>"

        def raise_for_status(self):
            return None

    def fake_get(url, headers=None, timeout=None):
        seen["user_agent"] = headers["User-Agent"]
        return FakeResponse()

    monkeypatch.setattr(rss_fetcher, "get_settings", lambda: ACME)
    monkeypatch.setattr(rss_fetcher.requests, "get", fake_get)

    rss_fetcher.fetch_feed_with_timeout("https://example.com/feed.xml")

    assert seen["user_agent"] == "Mozilla/5.0 (compatible; AI-Hub-Bot/1.0; +https://www.acme.example)"


def test_source_author_falls_back_to_the_brand_name(monkeypatch):
    monkeypatch.setattr(collector, "get_settings", lambda: ACME)
    assert collector._source_author({})["name"] == "Acme News"


@pytest.mark.parametrize(
    "call, response",
    [
        (lambda p: p.classify_articles([dict(ARTICLE)]), "[]"),
        (lambda p: p.process_tech_articles([ARTICLE], count=5), '{"en": []}'),
        (lambda p: p.process_youtube_videos([VIDEO], count=1), '{"en": []}'),
        (lambda p: p.process_investment_articles([ARTICLE], count=5),
         '{"primaryMarket": {"en": []}, "secondaryMarket": {"en": []}, "ma": {"en": []}}'),
        (lambda p: p.process_ma_articles([ARTICLE], count=5), '{"ma": {"en": []}}'),
        (lambda p: p.generate_editorial({"en": [{"impact": "high", "content": ARTICLE["summary"]}]}, {}, {}), '{"bullets": []}'),
    ],
    ids=["classify", "tech", "videos", "investment", "ma", "editorial"],
)
def test_prompts_name_the_configured_brand(monkeypatch, call, response):
    monkeypatch.setattr("app.services.llm_processor.get_settings", lambda: ACME)
    processor = LLMProcessor.__new__(LLMProcessor)  # skip __init__: no API key, no client
    prompts = []
    monkeypatch.setattr(processor, "_call_llm", lambda prompt, temperature=0.3, **kwargs: prompts.append(prompt) or response)
    monkeypatch.setattr(
        processor, "_call_with_fallback", lambda prompt, temperature, timeout, **kwargs: prompts.append(prompt) or response
    )

    call(processor)

    assert prompts
    assert "Acme News" in prompts[0]
    assert "DataCube" not in prompts[0]
    assert "Data Cube" not in prompts[0]
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_brand_identity.py -q`
Expected: failures. `deals` has no `_disclosure` or `_export_filename`, and the key prefix, user agent, fallback name and prompts still use legacy literals.

- [ ] **Step 3: Implement**

**`app/routers/deals.py`**
- Add `import re` and `from app.config import Settings, get_settings` if they are missing.
- Replace the `DISCLOSURE = (...)` block with:

```python
def _disclosure(settings: Settings) -> str:
    """Data-use disclosure returned with deal data; links the site and the public issue tracker."""
    return (
        "Deals are AI-extracted from monitored public sources. Rows labeled "
        "ai_extracted passed a server-side evidence gate (figures require a "
        "verbatim excerpt found in the source corpus); legacy_unverified rows "
        "predate that gate and carry no evidence contract. Coverage is limited "
        "to our monitored EN/ZH sources — not a complete market picture. Dates "
        "reflect when our sources reported the deal. Facts are free to reuse "
        f"with attribution and a link ({settings.site_url}/funding); "
        "evidence excerpts are quotations from the linked sources and are not "
        "licensed for redistribution. Report errors: "
        f"{settings.github_issues_url}"
    )


DISCLOSURE = _disclosure(get_settings())


def _export_filename(settings: Settings) -> str:
    """CSV download name derived from the brand, e.g. "data-cube-ai-deals.csv"."""
    slug = re.sub(r"[^a-z0-9]+", "-", settings.brand_name.lower()).strip("-")
    return f"{slug}-deals.csv"
```

- In the CSV export response, set the headers to:

```python
        headers={
            "Content-Disposition": f"attachment; filename={_export_filename(get_settings())}",
            "X-Data-Source": f"{get_settings().site_domain}/funding",
        },
```

**`app/routers/developer.py`**
- Add `from app.config import get_settings` to the module imports, next to `from app.database import get_db`. Delete the function-local `from app.config import get_settings` inside `check_developer_rate_limit`. The other routers import it at module level, and the tests patch `developer.get_settings`.
- Replace `_generate_api_key` with:

```python
def _generate_api_key() -> str:
    """Generate a new API key: Settings.api_key_prefix plus 32 hex characters.

    Stored keys are looked up by exact value, so keys issued under an older prefix keep working.
    """
    return get_settings().api_key_prefix + secrets.token_hex(16)
```

- In the rate-limit `HTTPException` in `check_developer_rate_limit`, the second detail line becomes `f"API details: {settings.site_url}/en/tools/ai-news-api",`. The function already assigns `settings = get_settings()`.

**`tests/test_developer_rate_limit_message.py`**
- `check_developer_rate_limit` now reads the module-level name, so patch that name and give the stub a site URL. Replace the line `monkeypatch.setattr("app.config.get_settings", lambda: SimpleNamespace(admin_api_key="admin-key"))` with:

```python
    monkeypatch.setattr(
        developer,
        "get_settings",
        lambda: SimpleNamespace(admin_api_key="admin-key", site_url="https://www.datacubeai.space"),
    )
```

**`app/services/rss_fetcher.py`**
- In `fetch_feed_with_timeout`: `headers = {"User-Agent": get_settings().rss_user_agent}`.

**`app/services/collector.py`**
- In `_source_author`: `name = str(name) if name else get_settings().brand_name`.

**`app/services/llm_processor.py`**
- In each of `classify_articles`, `process_tech_articles`, `process_youtube_videos`, `process_investment_articles`, `process_ma_articles` and `generate_editorial`:
  - add `brand = get_settings().brand_name` directly above `prompt = f"""`;
  - replace `DataCube AI` in the prompt's first line with `{brand}`.
- In the `generate_editorial` docstring, replace the sentence about the UI attribution with: `The UI labels it as AI-generated analysis with an /ai-disclosure link (never a human byline).`

**`app/models/week.py`**
- Replace the two comment lines about the attribution with:

```python
    # Shown in the UI as AI-generated analysis with an /ai-disclosure link —
    # never attributed to a human editor.
```

**`app/schemas/trend.py`**
- Replace the attribution comment line with `    # Shown in the UI as AI-generated analysis (see /ai-disclosure).`

**`.env.example`**
- Replace the line `NEWSLETTER_FROM_EMAIL=Data Cube AI <newsletter@datacubeai.space>` with `# NEWSLETTER_FROM_EMAIL=        # default: "<NEWSLETTER_FROM_NAME> <newsletter@<site domain>>"`.
- Append:

```
# Brand identity (optional; the defaults in app/config.py are the current brand)
# BRAND_NAME=
# BRAND_SHORT_NAME=
# SITE_URL=
# FOUNDER_NAME=                 # "Made by <founder>" in emails only when set
# NEWSLETTER_FROM_NAME=
# API_KEY_PREFIX=               # at most 8 characters; applies to new developer keys only
# RSS_USER_AGENT=
# GITHUB_ISSUES_URL=
# API_TITLE=
```

- [ ] **Step 4: Run the tests and the goldens**

```bash
cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_brand_identity.py tests/test_brand_goldens.py tests/test_prompt_contracts.py tests/test_developer_rate_limit_message.py -q
```

Expected:
- all tests pass;
- `deals_disclosure.txt` is unchanged.

- [ ] **Step 5: Lint, guard and the backend suite**

```bash
cd <repo-root>/ai-hub-backend && venv312/bin/python -m ruff check app/ scripts/ tests/
cd <repo-root> && python3 scripts/brand_guard.py ai-hub-backend/app/routers/deals.py ai-hub-backend/app/routers/developer.py ai-hub-backend/app/services/rss_fetcher.py ai-hub-backend/app/services/collector.py ai-hub-backend/app/services/llm_processor.py ai-hub-backend/app/models/week.py ai-hub-backend/app/schemas/trend.py ai-hub-backend/.env.example
cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m "not integration" -q
```

Expected:
- ruff is clean;
- `brand guard: clean`;
- all unit tests pass.

- [ ] **Step 6: Commit**

```bash
git -C <repo-root> add ai-hub-backend/app/routers/deals.py ai-hub-backend/app/routers/developer.py ai-hub-backend/app/services/rss_fetcher.py ai-hub-backend/app/services/collector.py ai-hub-backend/app/services/llm_processor.py ai-hub-backend/app/models/week.py ai-hub-backend/app/schemas/trend.py ai-hub-backend/.env.example ai-hub-backend/tests/test_brand_identity.py ai-hub-backend/tests/test_developer_rate_limit_message.py
git -C <repo-root> commit -m "refactor(brand): backend identity from settings in deals, keys, RSS, collector and prompts (B1, B4)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Shared frontend surfaces

This task applies the Brand replacement rules to the site metadata and the `<html>` shell that both root layouts share, both home pages, the JSON-LD components, the sitemaps, the Atom feeds, the content summary, the OG image and the chat prompt.
- The only intended golden change is B1 in `structured-data.json`: `SoftwareApplicationSchema` spelled "DataCube AI".
- `lib/site-metadata.ts` keeps `authors` as "Data Cube Team" until Task 16.
- The root layouts `app/(site)/layout.tsx` and `app/(localized)/[lang]/layout.tsx` contain no brand string: they export `siteMetadata` and render `RootShell`, so they stay unchanged.

**Files:**
- Modify: `ai-information-hub/lib/site-metadata.ts`
- Modify: `ai-information-hub/components/root-shell.tsx`
- Modify: `ai-information-hub/app/(site)/page.tsx`
- Modify: `ai-information-hub/app/(localized)/[lang]/page.tsx`
- Modify: `ai-information-hub/components/structured-data.tsx`
- Modify: `ai-information-hub/app/sitemap.ts`
- Modify: `ai-information-hub/app/news-sitemap.xml/route.ts`
- Modify: `ai-information-hub/app/feed.xml/route.ts`
- Modify: `ai-information-hub/app/newsletter.xml/route.ts`
- Modify: `ai-information-hub/app/api/content-summary/route.ts`
- Modify: `ai-information-hub/app/api/og/route.tsx`
- Modify: `ai-information-hub/app/api/chat/route.ts`

**Interfaces:**
- **Consumes:** `BRAND`, `FROZEN_IDS`, `absoluteUrl` from `@/lib/brand` (Task 5); the goldens from Task 1.
- **Produces:** no new exports. `components/structured-data.tsx` keeps its export names and props.

- [ ] **Step 1: List the brand lines in the task's files**

Run: `git -C <repo-root> grep -n -E "Data ?Cube|datacubeai" -- ai-information-hub/lib/site-metadata.ts ai-information-hub/components/root-shell.tsx 'ai-information-hub/app/(site)/page.tsx' ':(literal)ai-information-hub/app/(localized)/[lang]/page.tsx' ai-information-hub/components/structured-data.tsx ai-information-hub/app/sitemap.ts ai-information-hub/app/news-sitemap.xml/route.ts ai-information-hub/app/feed.xml/route.ts ai-information-hub/app/newsletter.xml/route.ts ai-information-hub/app/api/content-summary/route.ts ai-information-hub/app/api/og/route.tsx ai-information-hub/app/api/chat/route.ts`

Expected: 164 lines. The biggest contributors are `structured-data.tsx` (55), `app/(site)/page.tsx` (24), `lib/site-metadata.ts` (22) and `app/(localized)/[lang]/page.tsx` (19); `components/root-shell.tsx` has 1.

- [ ] **Step 2: Apply the rules file by file**

**`lib/site-metadata.ts`** (the `siteMetadata` object both root layouts export)
- Add `import { BRAND, absoluteUrl } from '@/lib/brand'`.
- `metadataBase: new URL(BRAND.siteUrl)`.
- `title.default: `${BRAND.name} | Daily AI News, Investment Signals & Practical Tips``; `title.template: `%s | ${BRAND.name}``.
- `authors: [{ name: `${BRAND.shortName} Team` }]`. The output is unchanged; Task 16 replaces it.
- `creator` and `publisher`: `BRAND.name`.
- `openGraph.url: BRAND.siteUrl`; `openGraph.siteName: BRAND.name`.
- The Open Graph and Twitter titles and image `alt` texts become template literals with `${BRAND.name}`.
- `alternates.canonical: BRAND.siteUrl`; each language `absoluteUrl('/de')` … `absoluteUrl('/ko')`; `'x-default': BRAND.siteUrl`.

**`components/root-shell.tsx`** (the `<html>` shell both root layouts render)
- Add `import { BRAND } from '@/lib/brand'`.
- The feed discovery links: `title={`Data Cube AI (${l.toUpperCase()})`}` becomes `title={`${BRAND.name} (${l.toUpperCase()})`}`.
- Leave the rest unchanged, including the `OrganizationSchema`, `WebsiteSchema` and `FAQSchema` elements. The golden `pages/root-shell-{en,zh}.html` pins this output.

**`app/(site)/page.tsx`**
- `title: { absolute: `${BRAND.name} | Daily AI News` }`.
- `canonical: absoluteUrl('/en')`; languages `absoluteUrl('/de')` …; `'x-default': absoluteUrl('/')`, because the old value ends in `/`.
- `openGraph.url: absoluteUrl('/en')`.
- Titles and image `alt` texts become template literals.
- The eight `h1:` values become template literals starting with `${BRAND.name}`.

**`app/(localized)/[lang]/page.tsx`**
- The `META` `title` and `ogAlt` values become template literals.
- `localizedHome = absoluteUrl(`/${lang}`)`.
- `'x-default': BRAND.siteUrl`.
- `hreflangEntries[toBcp47(code)] = absoluteUrl(`/${code}`)`.

**`components/structured-data.tsx`**
- Every `name: 'Data Cube AI'` and `name: 'DataCube AI'` becomes `BRAND.name`. The two `DataCube AI` names in `SoftwareApplicationSchema` are B1.
- Site URLs:
  - `BRAND.siteUrl`;
  - `absoluteUrl('/icon.svg')`, `absoluteUrl('/editorial-policy')`, `absoluteUrl('/corrections')`, `absoluteUrl('/about')`, `absoluteUrl('/source-methodology')`, `absoluteUrl('/og-image.jpg')`;
  - `absoluteUrl('/?search={search_term_string}')`;
  - breadcrumb items `absoluteUrl(`/${lang}`)` and `absoluteUrl(`/${lang}/week/${weekId}`)`.
- `ArticleSchema`: `const canonicalUrl = url || BRAND.siteUrl`.
- `FAQSchema`: every question and answer that names the brand becomes a template literal.
- Reword the comment "the Data Cube story fragment" to "our story fragment".

**`app/sitemap.ts`**
- `const baseUrl = BRAND.siteUrl`.

**`app/news-sitemap.xml/route.ts`**
- `const SITE_URL = BRAND.siteUrl`.
- The eight `newsTitle` template literals start with `${BRAND.name}`.
- `<news:name>${escapeXml(BRAND.name)}</news:name>`.

**`app/feed.xml/route.ts`**
- `const SITE_URL = BRAND.siteUrl`.
- The `feedTitle` map and its fallback use `${BRAND.name}`.
- `<id>${FROZEN_IDS.atomTagPrefix}${lang}:${post.periodId}-${storyId}</id>` and `<id>${FROZEN_IDS.atomTagPrefix}feed:${lang}</id>`.
- `<name>${escapeXml(BRAND.name)}</name>` and `<generator>${escapeXml(BRAND.name)}</generator>`.

**`app/newsletter.xml/route.ts`**
- `const SITE_URL = BRAND.siteUrl`.
- The footer paragraph: `` `<p style="color:#6b7280;font-size:13px">— ${escapeXml(BRAND.name)} · <a href="${SITE_URL}">${BRAND.apexHost}</a></p>` ``.
- Both `<id>` lines use `${FROZEN_IDS.atomTagPrefix}`.
- `feedTitle`, `<subtitle>` and `<name>` use `BRAND.name`.

**`app/api/content-summary/route.ts`**
- The empty response: `` `# ${BRAND.name}\n\nNo content available.` ``.
- `title` uses `${BRAND.name}`.
- The frontmatter: `title: "${BRAND.name} - AI News ${periodLabel}"` and `source: ${BRAND.siteUrl}`.
- The footer:
  - `## About ${BRAND.name}`;
  - the description sentence with `${BRAND.name}`;
  - `Source: [${BRAND.name}](${BRAND.siteUrl}) | [API Documentation](${absoluteUrl('/llms.txt')})`;
  - `Canonical URL: ${absoluteUrl(`/api/content-summary?${permalinkParams.toString()}`)}`;
  - `*Citation: ${BRAND.name} (${BRAND.apexHost}), ${periodId}*`.

**`app/api/og/route.tsx`**
- The brand text becomes `{BRAND.name}`.

**`app/api/chat/route.ts`**
- Both brand mentions in the system prompt become `${BRAND.name}`.

- [ ] **Step 3: Guard and type check**

```bash
cd <repo-root> && python3 scripts/brand_guard.py ai-information-hub/lib/site-metadata.ts ai-information-hub/components/root-shell.tsx 'ai-information-hub/app/(site)/page.tsx' 'ai-information-hub/app/(localized)/[lang]/page.tsx' ai-information-hub/components/structured-data.tsx ai-information-hub/app/sitemap.ts ai-information-hub/app/news-sitemap.xml/route.ts ai-information-hub/app/feed.xml/route.ts ai-information-hub/app/newsletter.xml/route.ts ai-information-hub/app/api/content-summary/route.ts ai-information-hub/app/api/og/route.tsx ai-information-hub/app/api/chat/route.ts
cd <repo-root>/ai-information-hub && npm run lint
```

Expected: `brand guard: clean`, and the type check is clean.

- [ ] **Step 4: Goldens: only B1 in `structured-data.json`**

```bash
cd <repo-root>/ai-information-hub && npx vitest run test/golden
```

Expected: exactly one failure, `structured-data.json`, where two `"name": "DataCube AI"` lines become `"name": "Data Cube AI"`. Then run:

```bash
cd <repo-root>/ai-information-hub && export PATH=/usr/local/bin:$PATH && npx vitest run test/golden/structured-data.test.ts -u
cd <repo-root> && python3 - <<'EOF'
import subprocess
from pathlib import Path

GOLDENS = "ai-information-hub/test/golden/__goldens__"
changed = subprocess.run(["git", "diff", "--name-only", "--", GOLDENS], capture_output=True, text=True, check=True).stdout.split()
for name in changed:
    before = subprocess.run(["git", "show", f"HEAD:{name}"], capture_output=True, text=True, check=True).stdout
    after = Path(name).read_text(encoding="utf-8")
    verdict = "B1 only" if before.replace("DataCube AI", "Data Cube AI") == after else "OTHER CHANGES"
    print(f"{verdict}: {name}")
EOF
```

Expected: exactly one line, `B1 only: ai-information-hub/test/golden/__goldens__/structured-data.json`.

If any other golden fails, the edit changed output. Fix the code rather than the golden. In particular, `metadata-static.json` (the site metadata) and `pages/root-shell-{en,zh}.html` (the feed discovery link titles) must pass unchanged.

- [ ] **Step 5: Frontend suite**

Run: `cd <repo-root>/ai-information-hub && npm test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git -C <repo-root> add ai-information-hub/lib/site-metadata.ts ai-information-hub/components/root-shell.tsx 'ai-information-hub/app/(site)/page.tsx' ':(literal)ai-information-hub/app/(localized)/[lang]/page.tsx' ai-information-hub/components/structured-data.tsx ai-information-hub/app/sitemap.ts ai-information-hub/app/news-sitemap.xml/route.ts ai-information-hub/app/feed.xml/route.ts ai-information-hub/app/newsletter.xml/route.ts ai-information-hub/app/api/content-summary/route.ts ai-information-hub/app/api/og/route.tsx ai-information-hub/app/api/chat/route.ts ai-information-hub/test/golden/__goldens__/structured-data.json
git -C <repo-root> commit -m "refactor(brand): site metadata, root shell, home, JSON-LD, sitemaps, feeds, summary and OG read the brand config (B1)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Tool pages

The four tool pages plus the tools index hold about 190 brand strings, most of them in per-page translation maps stored with `\u` escapes. The index (`tools/page.tsx`) arrived on main after Task 1 captured its goldens (PR #12), so this task captures its baseline first (Step 0) and only then changes it.
- Map values get the `{brand}` placeholder, and each page's `t()` helper fills it.
- Everything else reads `BRAND`.
- The only intended golden change is B1.

**Files:**
- Modify: `ai-information-hub/app/(localized)/[lang]/tools/page.tsx`
- Modify: `ai-information-hub/app/(localized)/[lang]/tools/ai-news-aggregator/page.tsx`
- Modify: `ai-information-hub/app/(localized)/[lang]/tools/ai-news-api/page.tsx`
- Modify: `ai-information-hub/app/(localized)/[lang]/tools/ai-report-generator/page.tsx`
- Modify: `ai-information-hub/app/(localized)/[lang]/tools/ai-stock-tracker/page.tsx`
- Modify: `ai-information-hub/test/golden/metadata.test.ts`, `ai-information-hub/test/golden/pages.test.ts` (Step 0 only)
- Modify (regenerated): `ai-information-hub/test/golden/__goldens__/metadata-*.json`, `ai-information-hub/test/golden/__goldens__/pages/tool-*.html`

**Interfaces:**
- **Consumes:** `BRAND`, `fillBrand` from `@/lib/brand` (Task 5); the goldens from Task 1.
- **Produces:** nothing new.

- [ ] **Step 0: Cover the tools index in the harness, before changing it**

`app/(localized)/[lang]/tools/page.tsx` is a localized index page that main gained in PR #12; Task 1 never captured it, so a brand change there would be unverified. Capture it first, exactly the way Task 1 captures the other tool pages:

- in `test/golden/metadata.test.ts`, import the page (`await import('@/app/(localized)/[lang]/tools/page')`) and add `index: await index.generateMetadata(params({ lang }))` to the `tools` section, next to `aggregator`, `api`, `report` and `stock`, so all eight `metadata-{lang}.json` goldens capture it;
- in `test/golden/pages.test.ts`, add `index: () => import('@/app/(localized)/[lang]/tools/page')` to the tool-page loader map, so the existing `it.each(['en', 'zh'])` loop writes `pages/tool-index-en.html` and `pages/tool-index-zh.html` — names the Step 5 filter (`pages/tool-*.html`) already accepts;
- capture with `UPDATE_GOLDENS=1`, then run the suite again with the variable unset and confirm it passes unchanged.

Commit this on its own, before any brand edit:

```bash
git -C <repo-root> add ai-information-hub/test/golden
git -C <repo-root> commit -m "test(frontend): pin the tools index output before the brand change

The page arrived on main in PR #12, after Task 1's capture.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 1: Placeholders in translation-map lines**

The script edits only lines that start with a language key. ASCII replacement leaves the `\u` escapes intact.

```bash
cd <repo-root> && python3 - <<'EOF'
import re
from pathlib import Path

LANG_LINE = re.compile(r"^\s+(de|en|zh|fr|es|pt|ja|ko): ")
for slug in ("", "ai-news-aggregator", "ai-news-api", "ai-report-generator", "ai-stock-tracker"):
    # "" is the tools index itself: app/(localized)/[lang]/tools/page.tsx
    path = Path("ai-information-hub/app/(localized)/[lang]/tools/" + (f"{slug}/page.tsx" if slug else "page.tsx"))
    lines = path.read_text(encoding="utf-8").split("\n")
    changed = 0
    for index, line in enumerate(lines):
        if LANG_LINE.match(line) and ("DataCube AI" in line or "Data Cube AI" in line):
            lines[index] = line.replace("DataCube AI", "{brand}").replace("Data Cube AI", "{brand}")
            changed += 1
    path.write_text("\n".join(lines), encoding="utf-8")
    print(slug, changed)
EOF
```

- [ ] **Step 2: Fill the placeholder in each page's helper**

In each of the five files (the four tool pages and the index):
- add `import { BRAND, fillBrand } from '@/lib/brand'`;
- change `const BASE_URL = 'https://www.datacubeai.space'` to `const BASE_URL = BRAND.siteUrl`;
- change the helper to:

```ts
const t = (map: L, lang: string) => fillBrand(map[lang] || map.en)
```

- [ ] **Step 3: Replace what the script did not cover**

Run: `git -C <repo-root> grep -n -i -E "data[ _-]?cube" -- ':(literal)ai-information-hub/app/(localized)/[lang]/tools'`

Replace every remaining hit:

| Remaining hit | Replacement |
|---|---|
| `name: 'DataCube AI'` | `name: BRAND.name` |
| `name: 'DataCube AI News Aggregator'`, and the same for News API and Report Generator | `` name: `${BRAND.name} News Aggregator` `` etc. |
| `alt: 'DataCube AI …'` | `` alt: `${BRAND.name} …` `` |
| JSX text `DataCube AI` | `{BRAND.name}` |
| `Data Cube AI · Tools` | `{BRAND.name} · Tools` |
| The comparison-table key `datacube` in the aggregator page: the `COMPARE_ROWS` type, its eight rows (`datacube: true, …`) and `row.datacube` | the key `ours`. The key is never rendered, so the goldens do not change |
| A map value that sits on its own line after the language key | the placeholder `{brand}` |

Run the grep again. Expected: no output.

- [ ] **Step 4: Regenerate the tool goldens**

```bash
cd <repo-root>/ai-information-hub && npx vitest run test/golden
cd <repo-root>/ai-information-hub && export PATH=/usr/local/bin:$PATH && npx vitest run test/golden/metadata.test.ts test/golden/pages.test.ts -u
```

Expected:
- The first run fails in `metadata-*.json` (the `tools` entries) and in `pages/tool-*.html`, and nowhere else.
- The second run passes.

- [ ] **Step 5: Prove the golden diff is B1 only**

```bash
cd <repo-root> && python3 - <<'EOF'
import subprocess
from pathlib import Path

GOLDENS = "ai-information-hub/test/golden/__goldens__"
changed = subprocess.run(["git", "diff", "--name-only", "--", GOLDENS], capture_output=True, text=True, check=True).stdout.split()
for name in changed:
    before = subprocess.run(["git", "show", f"HEAD:{name}"], capture_output=True, text=True, check=True).stdout
    after = Path(name).read_text(encoding="utf-8")
    verdict = "B1 only" if before.replace("DataCube AI", "Data Cube AI") == after else "OTHER CHANGES"
    print(f"{verdict}: {name}")
EOF
grep -rln "{brand}" <repo-root>/ai-information-hub/test/golden/__goldens__
```

Expected:
- every line starts with `B1 only:`, and only `metadata-*.json` and `pages/tool-*.html` are listed;
- `grep` prints nothing.

If a golden shows `{brand}` or `OTHER CHANGES`, a map value reaches the output without `t()`:
1. wrap that read site in `fillBrand(...)`;
2. restore the goldens: `git -C <repo-root> checkout -- ai-information-hub/test/golden/__goldens__`;
3. repeat Steps 4–5.

- [ ] **Step 6: Guard, type check, suite**

```bash
cd <repo-root> && python3 scripts/brand_guard.py 'ai-information-hub/app/(localized)/[lang]/tools/page.tsx' 'ai-information-hub/app/(localized)/[lang]/tools/ai-news-aggregator/page.tsx' 'ai-information-hub/app/(localized)/[lang]/tools/ai-news-api/page.tsx' 'ai-information-hub/app/(localized)/[lang]/tools/ai-report-generator/page.tsx' 'ai-information-hub/app/(localized)/[lang]/tools/ai-stock-tracker/page.tsx'
cd <repo-root>/ai-information-hub && npm run lint && npm test
```

Expected:
- `brand guard: clean`;
- the type check is clean;
- all tests pass.

- [ ] **Step 7: Commit**

```bash
git -C <repo-root> add ':(literal)ai-information-hub/app/(localized)/[lang]/tools' ai-information-hub/test/golden/__goldens__
git -C <repo-root> commit -m "refactor(brand): tool pages fill the brand from the config (B1)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Week, article and topic pages

This task brands the period, article and topic pages from the config and fixes the double-branded week and not-found titles (B2). The takeaways anchor moves to `FROZEN_IDS`. The editorial byline stays for now, with its spelling unified (B1); Task 13 replaces it.

**Files:**
- Modify: `ai-information-hub/app/(site)/week/[weekId]/page.tsx`
- Modify: `ai-information-hub/app/(localized)/[lang]/week/[weekId]/page.tsx`
- Modify: `ai-information-hub/app/(localized)/[lang]/news/[periodId]/[storyId]/page.tsx`
- Modify: `ai-information-hub/app/(localized)/[lang]/topic/[topic]/page.tsx`
- Modify (regenerated): `metadata-*.json`, `pages/week-*.html`

**Interfaces:**
- **Consumes:** `BRAND`, `FROZEN_IDS`, `absoluteUrl`, `brandedTitle`, `fillBrand` (Task 5); the goldens from Task 1.
- **Produces:** the week page still renders the byline span and `labelEditorialAttribution`. Task 13 replaces both.

- [ ] **Step 1: `app/(site)/week/[weekId]/page.tsx`**

**Helper and imports**
- Import `BRAND, FROZEN_IDS, absoluteUrl, brandedTitle, fillBrand` from `@/lib/brand`.
- Change the helper to `const t = (map: L, lang: string) => fillBrand(map[lang] || map.en)`.

**Translation maps**
- `metaTitles`: remove ` | Data Cube AI` from the de, en, fr, es and pt values (B2).
- `metaDescriptions`: replace `Data Cube AI` with `{brand}` in the six values that contain it.
- `ogAlt`: replace `Data Cube AI` with `{brand}` in all eight values.
- `labelEditorialAttribution`: replace `DataCube AI Editorial` with `{brand} Editorial` in all eight values (B1).

**`generateMetadata`**
- `const localizedUrl = absoluteUrl(`/${lang}/week/${weekId}`)`.
- `title: t(titles, lang)`.
- `openGraph.title: brandedTitle(t(titles, lang))` and `twitter.title: brandedTitle(t(titles, lang))`.
- `'x-default': absoluteUrl(`/de/week/${weekId}`)`.
- Languages: `absoluteUrl(`/${code}/week/${weekId}`)`.

**Page body**
- `const pageUrl = absoluteUrl(`/${lang}/week/${weekId}`)`.
- `CollectionPageSchema`: `name={brandedTitle(t(metaTitles(periodLabel), lang))}`.
- `speakableCssSelector={takeawayBullets.length > 0 ? [`#${FROZEN_IDS.takeawaysAnchorId}`] : undefined}`.
- The takeaways section: `id={FROZEN_IDS.takeawaysAnchorId}`.
- In the Key Takeaways comment, ``The #dcai-takeaways id is referenced as the `speakable` cssSelector`` becomes ``The takeaways anchor (FROZEN_IDS.takeawaysAnchorId) is referenced as the `speakable` cssSelector``.
- The byline span `<span className="font-medium">Data Cube AI Editorial</span>` becomes `<span className="font-medium">{BRAND.name} Editorial</span>`.
- In the comment above the editorial brief, replace these two lines:

```tsx
          Honestly attributed to DataCube AI Editorial (never an invented
          human) with a link to /ai-disclosure. */}
```

with:

```tsx
          Labeled as AI-generated with a link to /ai-disclosure (never an
          invented human). */}
```

- `ArticleSchema`: `url={absoluteUrl(articleHref(lang, weekId, techStoryId(post)))}`.

- [ ] **Step 2: `app/(localized)/[lang]/week/[weekId]/page.tsx`**

- Import `absoluteUrl`.
- `'x-default': absoluteUrl(`/en/week/${weekId}`)`.
- `hreflangEntries[toBcp47(code)] = absoluteUrl(`/${code}/week/${weekId}`)`.
- `canonical: absoluteUrl(`/${lang}/week/${weekId}`)`.

- [ ] **Step 3: `app/(localized)/[lang]/news/[periodId]/[storyId]/page.tsx`**

**Helper and imports**
- Import `BRAND, fillBrand`.
- `const SITE_URL = BRAND.siteUrl`.
- The helper becomes `function t(label: Dictionary, lang: AppLanguage): string { return fillBrand(label[lang] || label.en) }`.

**Label maps**
- Replace `Data Cube AI` with `{brand}` in the eight summary-description strings and the eight `byline` strings. Task 13 deletes the byline map.

**Metadata and JSON-LD**
- Not-found metadata: `title: 'Article not found'` (B2).
- Open Graph image: `alt: BRAND.name`.
- JSON-LD:
  - `author: { '@type': 'Organization', name: `${BRAND.name} Editorial` }` (Task 16 replaces it);
  - `publisher.name: BRAND.name`;
  - the breadcrumb `name: BRAND.name`.

- [ ] **Step 4: `app/(localized)/[lang]/topic/[topic]/page.tsx`**

- Import `BRAND, absoluteUrl`.
- Breadcrumb items: `absoluteUrl(`/${lang}`)` and `absoluteUrl(`/${lang}/topic/${topic}`)`.
- Item list: `url: absoluteUrl(`/${lang}/week/${bucket.periodId}`)`.
- `const localizedUrl = absoluteUrl(`/${lang}/topic/${topic}`)`.
- `'x-default': absoluteUrl(`/en/topic/${topic}`)`; languages `absoluteUrl(`/${code}/topic/${topic}`)`.
- Open Graph image: `` alt: `${BRAND.name} – ${topicTitle}` ``.

- [ ] **Step 5: Guard and type check**

```bash
cd <repo-root> && python3 scripts/brand_guard.py 'ai-information-hub/app/(site)/week/[weekId]/page.tsx' 'ai-information-hub/app/(localized)/[lang]/week/[weekId]/page.tsx' 'ai-information-hub/app/(localized)/[lang]/news/[periodId]/[storyId]/page.tsx' 'ai-information-hub/app/(localized)/[lang]/topic/[topic]/page.tsx'
cd <repo-root>/ai-information-hub && npm run lint
```

Expected: `brand guard: clean`, and the type check is clean.

- [ ] **Step 6: Regenerate and review the goldens**

```bash
cd <repo-root>/ai-information-hub && export PATH=/usr/local/bin:$PATH && npx vitest run test/golden/metadata.test.ts test/golden/pages.test.ts -u
git -C <repo-root> diff --stat -- ai-information-hub/test/golden/__goldens__
git -C <repo-root> diff -U0 -- ai-information-hub/test/golden/__goldens__ | grep -E '^[-+] ' | sort | uniq -c | sort -rn | head -40
```

Expected: the changed goldens are exactly these, and every changed line matches one of these items:

| Golden | Change |
|---|---|
| `metadata-{de,en,fr,es,pt}.json` | `week.title` loses " \| Data Cube AI" (B2) |
| `metadata-{zh,ja,ko}.json` | `week.openGraph.title` and `week.twitter.title` gain " \| Data Cube AI" (B2) |
| all eight `metadata-*.json` | `articleNotFound.title` becomes "Article not found" (B2) |
| `pages/week-zh.html` | the CollectionPage `name` gains " \| Data Cube AI" (B2) |
| `pages/week-{en,de,zh}.html` | "DataCube AI Editorial" becomes "Data Cube AI Editorial" (B1) |

`pages/article-*.html` and `pages/topic-en.html` do not change.

If anything else changed, restore the goldens (`git -C <repo-root> checkout -- ai-information-hub/test/golden/__goldens__`), fix the code, and repeat this step.

- [ ] **Step 7: Suite**

Run: `cd <repo-root>/ai-information-hub && npm test`
Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git -C <repo-root> add ':(literal)ai-information-hub/app/(site)/week/[weekId]/page.tsx' ':(literal)ai-information-hub/app/(localized)/[lang]/week/[weekId]/page.tsx' ':(literal)ai-information-hub/app/(localized)/[lang]/news/[periodId]/[storyId]/page.tsx' ':(literal)ai-information-hub/app/(localized)/[lang]/topic/[topic]/page.tsx' ai-information-hub/test/golden/__goldens__
git -C <repo-root> commit -m "refactor(brand): week, article and topic pages read the brand config; single-branded titles (B1, B2)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Trust, legal and marketing pages; components; login; translations

This task brands the static pages, the SPA components and the login page from the config.
- It fixes the double-branded trust-page and login titles (B2).
- It deletes the unused `dataCube` and `team` translation keys.
- `lib/settings-context.tsx` stays unchanged (Ruling R-4).

**Files:**
- Modify: `ai-information-hub/app/(site)/{about,ai-disclosure,editorial-policy,source-methodology,corrections,contact,impressum,datenschutz,premium,for-teams,funding}/page.tsx`
- Modify: `ai-information-hub/app/(site)/login/layout.tsx`
- Modify: `ai-information-hub/app/(site)/login/page.tsx`
- Modify: `ai-information-hub/components/right-sidebar.tsx`
- Modify: `ai-information-hub/components/sidebar.tsx`
- Modify: `ai-information-hub/components/feed.tsx`
- Modify: `ai-information-hub/components/home-page-client.tsx`
- Modify: `ai-information-hub/lib/translations.ts`
- Modify (regenerated): `ai-information-hub/test/golden/__goldens__/metadata-static.json`

**Interfaces:**
- **Consumes:** `BRAND`, `absoluteUrl`, `brandedTitle` (Task 5); the goldens from Task 1.
- **Produces:** nothing new.

- [ ] **Step 1: Trust and legal pages**

Apply the Brand replacement rules to each page's `metadata`, `config` and JSX:

| Page | Changes |
|---|---|
| `editorial-policy`, `ai-disclosure`, `source-methodology`, `corrections` | `title: 'Editorial Policy'` (and 'AI Disclosure', 'Source Methodology', 'Corrections Policy'), B2. `openGraph.title: brandedTitle('<same text>')`. Descriptions and config strings become template literals. `alternates.canonical` and `openGraph.url` use `absoluteUrl('/<slug>')`. Image `alt: BRAND.name`. |
| `about` | `title: { absolute: `About ${BRAND.name}` }` (B2). `openGraph.title: `About ${BRAND.name}``. Rest per the rules. |
| `contact` | `title: { absolute: `Contact ${BRAND.name}` }` (B2). `openGraph.title: `Contact ${BRAND.name}``. The heading becomes `Contact {BRAND.name}`. |
| `impressum` | `openGraph.title: brandedTitle('Impressum / Legal Notice')`. Descriptions template literals; URLs `absoluteUrl`. |
| `datenschutz` | `openGraph.title: brandedTitle('Privacy Policy')`. Descriptions template literals; URLs `absoluteUrl`. |

- [ ] **Step 2: Marketing pages, login and components**

**Marketing pages**
- `premium`: the description, the FAQ strings and the JSX text follow the rules.
- `for-teams`: `absoluteUrl('/for-teams')`, image `alt: BRAND.name`, and `{BRAND.name}` in the hero paragraph.
- `funding`:
  - `absoluteUrl('/funding')` for the canonical and Open Graph URLs;
  - eyebrow `{BRAND.name} · Open Data`;
  - the error link `href={BRAND.githubIssuesUrl}`.

**Login**
- `app/(site)/login/layout.tsx`:
  - `title: 'Login'` (B2);
  - `` description: `Gateway page for ${BRAND.name} Space.` ``.
- `app/(site)/login/page.tsx`:
  - import `BRAND`;
  - replace all eight `title1: "Data Cube",` with `title1: BRAND.shortName,`.

**Components**
- `components/right-sidebar.tsx`:
  - the newsletter eyebrow becomes `{BRAND.name}`;
  - the copyright becomes `<p>&copy; 2026 {BRAND.shortName}, All Rights Reserved</p>`.
- `components/sidebar.tsx`: the wordmark becomes `{BRAND.shortName}`.
- `components/feed.tsx`: the masthead heading becomes `{BRAND.name}`.
- `components/home-page-client.tsx`: the newsletter eyebrow becomes `{BRAND.name}`.

- [ ] **Step 3: Delete the unused translation keys**

```bash
git -C <repo-root> grep -n -E "\bt\(\s*['\"](dataCube|team)['\"]" -- ai-information-hub
cd <repo-root> && python3 - <<'EOF'
import re
from pathlib import Path
path = Path("ai-information-hub/lib/translations.ts")
lines = path.read_text(encoding="utf-8").split("\n")
kept = [line for line in lines if not re.match(r"^\s+(dataCube|team): ", line)]
assert len(lines) - len(kept) == 16, len(lines) - len(kept)
path.write_text("\n".join(kept), encoding="utf-8")
print("removed", len(lines) - len(kept), "lines")
EOF
```

Expected:
- The grep prints nothing: no usages.
- The script prints `removed 16 lines`.

- [ ] **Step 4: Guard and type check**

```bash
cd <repo-root> && python3 scripts/brand_guard.py 'ai-information-hub/app/(site)/about/page.tsx' 'ai-information-hub/app/(site)/ai-disclosure/page.tsx' 'ai-information-hub/app/(site)/editorial-policy/page.tsx' 'ai-information-hub/app/(site)/source-methodology/page.tsx' 'ai-information-hub/app/(site)/corrections/page.tsx' 'ai-information-hub/app/(site)/contact/page.tsx' 'ai-information-hub/app/(site)/impressum/page.tsx' 'ai-information-hub/app/(site)/datenschutz/page.tsx' 'ai-information-hub/app/(site)/premium/page.tsx' 'ai-information-hub/app/(site)/for-teams/page.tsx' 'ai-information-hub/app/(site)/funding/page.tsx' 'ai-information-hub/app/(site)/login/layout.tsx' 'ai-information-hub/app/(site)/login/page.tsx' ai-information-hub/components/right-sidebar.tsx ai-information-hub/components/sidebar.tsx ai-information-hub/components/feed.tsx ai-information-hub/components/home-page-client.tsx ai-information-hub/lib/translations.ts
cd <repo-root>/ai-information-hub && npm run lint
```

Expected: `brand guard: clean`, and the type check is clean. The type check also proves that no code used the deleted keys.

- [ ] **Step 5: Regenerate and review the goldens**

```bash
cd <repo-root>/ai-information-hub && npx vitest run test/golden
cd <repo-root>/ai-information-hub && export PATH=/usr/local/bin:$PATH && npx vitest run test/golden/metadata.test.ts -u
git -C <repo-root> diff -- ai-information-hub/test/golden/__goldens__
```

Expected:
- The first run fails only in `metadata-static.json`.
- The diff contains exactly these B2 changes:
  - the `title` of `editorialPolicy`, `aiDisclosure`, `sourceMethodology` and `corrections` loses " | Data Cube AI";
  - `about.title` becomes `{ "absolute": "About Data Cube AI" }`;
  - `contact.title` becomes `{ "absolute": "Contact Data Cube AI" }`;
  - `login.title` becomes `"Login"`.
- Every `openGraph.title` is unchanged, and every `pages/*.html` golden is unchanged.

- [ ] **Step 6: Suite**

Run: `cd <repo-root>/ai-information-hub && npm test`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git -C <repo-root> add 'ai-information-hub/app/(site)/about' 'ai-information-hub/app/(site)/ai-disclosure' 'ai-information-hub/app/(site)/editorial-policy' 'ai-information-hub/app/(site)/source-methodology' 'ai-information-hub/app/(site)/corrections' 'ai-information-hub/app/(site)/contact' 'ai-information-hub/app/(site)/impressum' 'ai-information-hub/app/(site)/datenschutz' 'ai-information-hub/app/(site)/premium' 'ai-information-hub/app/(site)/for-teams' 'ai-information-hub/app/(site)/funding' 'ai-information-hub/app/(site)/login' ai-information-hub/components/right-sidebar.tsx ai-information-hub/components/sidebar.tsx ai-information-hub/components/feed.tsx ai-information-hub/components/home-page-client.tsx ai-information-hub/lib/translations.ts ai-information-hub/test/golden/__goldens__/metadata-static.json
git -C <repo-root> commit -m "refactor(brand): trust, legal, marketing pages, components and login read the brand config (B2)

Deletes the unused dataCube and team translation keys.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

`git add` on a page directory also stages its other files, such as `app/(site)/for-teams/contact-form.tsx`, if they changed. Run `git -C <repo-root> status --short` first and check that only intended files are staged.

---

### Task 12: Generated robots.txt and llms.txt; workflow site URL

This task implements AD1's "brand-bearing static files become generated routes":
- `/robots.txt` comes from `app/robots.ts`, with semantics identical to today's file (B3), including the cost work's `Disallow: /*/topic/*?` in every group and its `meta-externalagent` group;
- `/llms.txt` comes from a route built from `BRAND`, byte-identical except for B1;
- the IndexNow step in `daily-collect.yml` reads `vars.SITE_URL`, with the legacy site as fallback.

**Files:**
- Create: `ai-information-hub/app/robots.ts`
- Create: `ai-information-hub/app/robots.test.ts`
- Create: `ai-information-hub/app/llms.txt/route.ts`
- Create: `ai-information-hub/app/llms.txt/route.test.ts`
- Delete: `ai-information-hub/public/robots.txt`
- Delete: `ai-information-hub/public/llms.txt`
- Delete: `ai-information-hub/test/golden/static-files.test.ts`
- Modify: `.github/workflows/daily-collect.yml`
- Modify (regenerated): `ai-information-hub/test/golden/__goldens__/llms.txt`

**Interfaces:**
- **Consumes:**
  - `BRAND` and `absoluteUrl` (Task 5);
  - the goldens `robots.txt` (kept as the reference copy, never regenerated) and `llms.txt` (Task 1).
- **Produces:**
  - `app/robots.ts` default export `robots(): MetadataRoute.Robots`;
  - `app/llms.txt/route.ts` `GET(): Response` (`text/plain; charset=utf-8`, `dynamic = 'force-static'`). Task 14 adds the AI label to its text.

- [ ] **Step 1: Make sure `main` did not change the static files (Ruling R-11)**

```bash
git -C <repo-root> fetch origin main
git -C <repo-root> log --oneline HEAD..origin/main -- ai-information-hub/public/robots.txt ai-information-hub/public/llms.txt
```

Expected: no output.

If there is output, stop and report `BLOCKED: static files changed on main`. The controller then:
1. rebases the branch;
2. re-captures the two goldens with `npx vitest run test/golden/static-files.test.ts -u`;
3. re-dispatches this task.

- [ ] **Step 2: Write the failing robots test**

Create `ai-information-hub/app/robots.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { resolveRobots } from 'next/dist/build/webpack/loaders/metadata/resolve-route-data'
import robots from './robots'

type Group = { agents: string[]; allow: string[]; disallow: string[]; crawlDelay?: string }

/** robots.txt as comparable groups. RFC 9309: directive names are case-insensitive; order inside a group does not matter. */
function parse(text: string): { groups: Group[]; sitemaps: string[] } {
  const groups: Group[] = []
  const sitemaps: string[] = []
  let current: Group | undefined
  let previousWasAgent = false
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim()
    if (!line) continue
    const separator = line.indexOf(':')
    const key = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()
    if (key === 'user-agent') {
      if (!current || !previousWasAgent) {
        current = { agents: [], allow: [], disallow: [] }
        groups.push(current)
      }
      current.agents.push(value)
      previousWasAgent = true
      continue
    }
    previousWasAgent = false
    if (key === 'sitemap') sitemaps.push(value)
    else if (current && key === 'allow') current.allow.push(value)
    else if (current && key === 'disallow') current.disallow.push(value)
    else if (current && key === 'crawl-delay') current.crawlDelay = value
  }
  return {
    groups: groups.map((group) => ({ ...group, allow: [...group.allow].sort(), disallow: [...group.disallow].sort() })),
    sitemaps,
  }
}

describe('robots.txt', () => {
  it('serves the same crawler rules as the former public/robots.txt', () => {
    const former = readFileSync(new URL('../test/golden/__goldens__/robots.txt', import.meta.url), 'utf8')
    expect(parse(resolveRobots(robots()))).toEqual(parse(former))
  })

  it('keeps topic filter variants out of every crawler group and blocks meta-externalagent entirely', () => {
    const { groups } = parse(resolveRobots(robots()))
    const meta = groups.filter((group) => group.agents.includes('meta-externalagent'))
    expect(meta).toEqual([{ agents: ['meta-externalagent'], allow: [], disallow: ['/'] }])
    for (const group of groups.filter((group) => !meta.includes(group))) {
      expect(group.disallow, group.agents.join(', ')).toContain('/*/topic/*?')
    }
  })
})
```

Run: `cd <repo-root>/ai-information-hub && npx vitest run app/robots.test.ts`
Expected: FAIL, because `./robots` cannot be resolved.

- [ ] **Step 3: Generate robots.txt**

Create `ai-information-hub/app/robots.ts`:

```ts
import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/brand'

// Groups do not inherit from the wildcard group, so every crawler group repeats the blocked paths.
const ALLOW = ['/', '/api/content-summary']
// '/*/topic/*?' keeps the topic filter variants (?section=, ?period=, ?page=, ?q=) out of reach: they are
// uncached dynamic renders, and only the filter-free topic page is meant to be crawled.
const DISALLOW = ['/api/', '/login', '/*/topic/*?']
const AI_CRAWLERS_WITH_DELAY = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'PerplexityBot',
  'Perplexity-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
]
const AI_CRAWLERS_WITHOUT_DELAY = ['anthropic-ai', 'Google-Extended']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: ALLOW, disallow: DISALLOW },
      ...AI_CRAWLERS_WITH_DELAY.map((userAgent) => ({ userAgent, allow: ALLOW, disallow: DISALLOW, crawlDelay: 2 })),
      ...AI_CRAWLERS_WITHOUT_DELAY.map((userAgent) => ({ userAgent, allow: ALLOW, disallow: DISALLOW })),
      // Common Crawl feeds many AI training corpora; allowing it helps long-tail AI citation.
      { userAgent: 'CCBot', allow: ALLOW, disallow: DISALLOW, crawlDelay: 2 },
      // Meta's AI-training crawler brings no referrals; the Vercel WAF has denied it since 2026-09-15.
      { userAgent: 'meta-externalagent', disallow: '/' },
    ],
    sitemap: [absoluteUrl('/sitemap.xml'), absoluteUrl('/news-sitemap.xml')],
  }
}
```

Run: `cd <repo-root>/ai-information-hub && npx vitest run app/robots.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 4: Write the failing llms.txt test**

Create `ai-information-hub/app/llms.txt/route.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { GET } from './route'

describe('GET /llms.txt', () => {
  it('serves the site description as plain text built from the brand config', async () => {
    const res = GET()
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    await expect(await res.text()).toMatchFileSnapshot('../../test/golden/__goldens__/llms.txt')
  })
})
```

Run: `cd <repo-root>/ai-information-hub && npx vitest run app/llms.txt/route.test.ts`
Expected: FAIL, because `./route` cannot be resolved.

- [ ] **Step 5: Generate llms.txt and remove the static files**

Create `ai-information-hub/app/llms.txt/route.ts`:

```ts
import { BRAND } from '@/lib/brand'

// Site description for AI crawlers, generated from the brand config at build time (spec AD1).
export const dynamic = 'force-static'

function llmsText(): string {
  const site = BRAND.siteUrl
  return `# ${BRAND.name}

> Multilingual (DE, EN, ZH, FR, ES, PT, JA, KO) daily AI news aggregator curating tech breakthroughs,
> investment news, practical tips, and YouTube videos from 35+ sources.

## Content Sections

### Technology Feed
Daily curated AI technology news (typically around 10 posts per day). Each post includes
impact level, category, source attribution, and multilingual content (8 languages).

### Investment Feed
- Primary Market: VC funding rounds
- Secondary Market: As-reported AI market news
- M&A: AI sector mergers and acquisitions

### Tips Feed
Practical AI tips from Reddit communities and expert blogs.
Typically around 5 practical tips per day.

### Video Feed
Typically 2 curated YouTube videos about AI developments per day.

## Free AI Tools
${BRAND.name} offers free, multilingual AI-powered tools:

- AI News Aggregator: ${site}/en/tools/ai-news-aggregator
  Curates daily AI news from 35+ sources in 8 languages.
- AI Report Generator: ${site}/en/tools/ai-report-generator
  Generate structured AI reports with streaming output and 5 export formats (DOCX, HTML, MD, TXT, JSON).
- AI Funding Tracker: ${site}/funding
  Open, evidence-linked AI funding and M&A deal data with free CSV export.
- AI News API: ${site}/en/tools/ai-news-api
  Free REST API for curated AI news data in 8 languages. JSON responses, no auth required.


## Public API
Base URL: https://api-production-3ee5.up.railway.app/api

- GET /api/weeks — List all available periods (weeks and days)
- GET /api/tech/{periodId} — Technology feed (multilingual JSON, 8 languages)
- GET /api/investment/{periodId} — Investment feed (multilingual JSON, 8 languages)
- GET /api/tips/{periodId} — Tips feed (multilingual JSON, 8 languages)
- GET /api/trends/{periodId} — Period trend topics used by topic hub discovery
- GET /api/videos/{periodId} — Video summaries

Period ID format: YYYY-kwWW (weekly) or YYYY-MM-DD (daily)

## Period Pages
Each period has a dedicated localized page with full HTML content.
Canonical format: ${site}/{lang}/week/{periodId}
Example: ${site}/en/week/2026-05-23

## Article Pages And Topic Hubs
Each curated story can be cited through a stable first-party article URL.
Article canonical format: ${site}/{lang}/news/{periodId}/{storyId}

Topic hubs collect related period stories and can be scoped by period.
Topic canonical format: ${site}/{lang}/topic/{topic}
Scoped topic example: ${site}/en/topic/openai?period=2026-05-23

## Languages
German (de) — default | English (en) | Chinese (zh) | French (fr) | Spanish (es) | Portuguese (pt) | Japanese (ja) | Korean (ko)

## Authority
Published daily since January 2026, curating 35+ sources including
RSS feeds, Hacker News, YouTube, and Reddit communities.

Publisher transparency:
- About: ${site}/about
- Editorial policy: ${site}/editorial-policy
- Source methodology: ${site}/source-methodology
- Corrections policy: ${site}/corrections
- AI disclosure: ${site}/ai-disclosure

## Update Frequency
Content updated daily in the late evening (Europe/Berlin time).

## Preferred Citation
${BRAND.name} (${BRAND.apexHost})

## Canonical Discovery Surfaces
- Sitemap: ${site}/sitemap.xml
- Google News sitemap: ${site}/news-sitemap.xml
- Atom feeds: ${site}/feed.xml?lang=en and ${site}/feed.xml?lang=de
- Newsletter feed: ${site}/newsletter.xml
- Public site pages: ${site}/{lang}, ${site}/{lang}/week/{periodId}, ${site}/{lang}/news/{periodId}/{storyId}, ${site}/{lang}/topic/{topic}, ${site}/{lang}/tools/{tool}

## AI Content Endpoint
For structured AI-consumable content, use the Markdown summary API:
GET ${site}/api/content-summary?lang=en
GET ${site}/api/content-summary?lang=de
GET ${site}/api/content-summary?lang=zh
GET ${site}/api/content-summary?lang=fr
GET ${site}/api/content-summary?lang=ja
GET ${site}/api/content-summary?lang=en&periodId={YYYY-MM-DD}
GET ${site}/api/content-summary?lang=en&periodId={YYYY-kwWW}&section=tech
GET ${site}/api/content-summary?lang=en&periodId={YYYY-kwWW}&section=investment&topic=nvidia

Parameters:
- periodId: YYYY-kwWW or YYYY-MM-DD
- section: all | tech | investment | tips
- topic: optional free-text filter

The Markdown endpoint is intended for AI retrieval and citation workflows. Use canonical HTML pages for public search indexing.
`
}

export function GET(): Response {
  return new Response(llmsText(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
```

Remove the files the routes replace. Next.js refuses to build with a public file and a route at the same path.

```bash
git -C <repo-root> rm ai-information-hub/public/robots.txt ai-information-hub/public/llms.txt ai-information-hub/test/golden/static-files.test.ts
```

- [ ] **Step 6: Regenerate the llms.txt golden and prove the diff is B1 only**

```bash
cd <repo-root>/ai-information-hub && npx vitest run app/llms.txt/route.test.ts; echo "exit=$?"
cd <repo-root>/ai-information-hub && export PATH=/usr/local/bin:$PATH && npx vitest run app/llms.txt/route.test.ts -u
cd <repo-root> && python3 - <<'EOF'
import subprocess
from pathlib import Path

name = "ai-information-hub/test/golden/__goldens__/llms.txt"
before = subprocess.run(["git", "show", f"HEAD:{name}"], capture_output=True, text=True, check=True).stdout
after = Path(name).read_text(encoding="utf-8")
print("B1 only" if before.replace("DataCube AI", "Data Cube AI") == after and before != after else "OTHER CHANGES")
EOF
```

Expected:
- The first run fails only on the line `DataCube AI offers free, multilingual AI-powered tools:` (`exit=1`).
- The check prints `B1 only`.

- [ ] **Step 7: The workflow reads `vars.SITE_URL`**

In `.github/workflows/daily-collect.yml`, in the "Ping IndexNow" step, make three edits:

1. `SITE="https://www.datacubeai.space"` becomes `SITE="${{ vars.SITE_URL || 'https://www.datacubeai.space' }}"`.
2. `import json, re, sys, urllib.request` becomes `import json, re, sys, urllib.parse, urllib.request`.
3. `"host": "www.datacubeai.space",` becomes `"host": urllib.parse.urlsplit(site).hostname,`.

- [ ] **Step 8: Guard, type check, suites**

```bash
cd <repo-root> && python3 scripts/brand_guard.py ai-information-hub/app/robots.ts ai-information-hub/app/llms.txt/route.ts .github/workflows/daily-collect.yml
cd <repo-root>/ai-information-hub && npm run lint && npm test
cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_workflow_schedule_gates.py -q
```

Expected:
- `brand guard: clean`;
- the type check is clean;
- all frontend tests pass: `Tests  142 passed (142)` in 13 files;
- the workflow gate tests pass.

- [ ] **Step 9: Commit**

```bash
git -C <repo-root> add ai-information-hub/app/robots.ts ai-information-hub/app/robots.test.ts ai-information-hub/app/llms.txt ai-information-hub/test/golden/__goldens__/llms.txt .github/workflows/daily-collect.yml
git -C <repo-root> commit -m "feat(brand): generate robots.txt and llms.txt from the brand config; workflow reads vars.SITE_URL (B1, B3)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: AI label module and HTML surfaces

This task implements the AD7 label on the HTML surfaces that show AI-written prose: week/day pages, article pages, topic pages, the home feed masthead and the AI News Aggregator tool page's live preview.
- The label replaces the person-like bylines (L2) and appears in every language.
- Copy comes from the plan's "AI label copy" table.

**Files:**
- Create: `ai-information-hub/lib/ai-label.ts`
- Create: `ai-information-hub/lib/ai-label.test.ts`
- Create: `ai-information-hub/components/ai-label.tsx`
- Create: `ai-information-hub/components/feed-masthead.tsx`
- Create: `ai-information-hub/test/ai-label-surfaces.test.ts`
- Modify: `ai-information-hub/app/(site)/week/[weekId]/page.tsx`
- Modify: `ai-information-hub/app/(localized)/[lang]/news/[periodId]/[storyId]/page.tsx`
- Modify: `ai-information-hub/app/(localized)/[lang]/topic/[topic]/page.tsx`
- Modify: `ai-information-hub/components/feed.tsx`
- Modify: `ai-information-hub/app/(localized)/[lang]/tools/ai-news-aggregator/page.tsx`
- Modify (regenerated): `pages/week-{en,de,zh}.html`, `pages/article-{en,zh}.html`, `pages/topic-en.html`, `pages/tool-ai-news-aggregator-{en,zh}.html`

**Interfaces:**
- **Consumes:**
  - `BRAND` from Task 5;
  - the fixtures from Task 1;
  - the Task 10 week and article pages, which still carry the byline span, `labelEditorialAttribution`, and the article `labels.byline` map;
  - the Task 11 `feed.tsx`, whose masthead heading is `{BRAND.name}`;
  - the Task 9 aggregator tool page, whose "Section B: Live News Preview" still renders `t(PREVIEW_LEAD, lang)` directly above the preview list.
- **Produces:**

| Module | Export | Signature / behavior |
|---|---|---|
| `@/lib/ai-label` | `AI_DISCLOSURE_PATH` | `'/ai-disclosure'` |
| `@/lib/ai-label` | `aiLabel` | `(lang: string): string` |
| `@/lib/ai-label` | `aiLabelShort` | `(lang: string): string` |
| `@/lib/ai-label` | `aiLabelLinkText` | `(lang: string): string` |
| `@/lib/ai-label` | `aiLabelForImage` | `(lang: string): string` |
| `@/components/ai-label` | `AiLabel` | `({ lang, className }: { lang: string; className?: string })`; renders `<p data-ai-label="">` with the label and a link to `AI_DISCLOSURE_PATH` |
| `@/components/feed-masthead` | `FeedMasthead` | `({ issueLabel, language }: { issueLabel: string; language: string })` |

- [ ] **Step 1: Write the failing copy tests**

Create `ai-information-hub/lib/ai-label.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { AI_DISCLOSURE_PATH, aiLabel, aiLabelForImage, aiLabelLinkText, aiLabelShort } from './ai-label'

// The plan's "AI label copy" table, pinned here so a copy change is a deliberate test change.
const COPY = {
  en: ['AI-generated: summaries written by AI from the linked sources.', 'AI-generated', 'How we use AI'],
  de: ['KI-generiert: Die Zusammenfassungen schreibt eine KI auf Grundlage der verlinkten Quellen.', 'KI-generiert', 'So nutzen wir KI'],
  zh: ['AI 生成：摘要由 AI 根据所链接的来源撰写。', 'AI 生成', '我们如何使用 AI'],
  fr: ['Généré par IA : résumés rédigés par une IA à partir des sources citées.', 'Généré par IA', "Notre usage de l'IA"],
  es: ['Generado por IA: resúmenes redactados por IA a partir de las fuentes enlazadas.', 'Generado por IA', 'Cómo usamos la IA'],
  pt: ['Gerado por IA: resumos escritos por IA a partir das fontes indicadas.', 'Gerado por IA', 'Como usamos a IA'],
  ja: ['AI生成：要約はリンク先の情報源をもとにAIが作成しています。', 'AI生成', 'AIの利用について'],
  ko: ['AI 생성: 요약은 링크된 출처를 바탕으로 AI가 작성했습니다.', 'AI 생성', 'AI 활용 방식'],
} as const

describe('AI label copy', () => {
  it.each(Object.entries(COPY))('%s matches the plan', (lang, [label, short, link]) => {
    expect([aiLabel(lang), aiLabelShort(lang), aiLabelLinkText(lang)]).toEqual([label, short, link])
  })

  it('falls back to English for an unsupported language', () => {
    expect([aiLabel('xx'), aiLabelShort('xx'), aiLabelLinkText('xx')]).toEqual([...COPY.en])
  })

  it('links the AI disclosure page', () => {
    expect(AI_DISCLOSURE_PATH).toBe('/ai-disclosure')
  })

  it('uses English on the OG image outside the scripts its bundled font covers', () => {
    for (const lang of ['de', 'en', 'fr', 'es', 'pt'] as const) expect(aiLabelForImage(lang)).toBe(COPY[lang][0])
    for (const lang of ['zh', 'ja', 'ko', 'xx']) expect(aiLabelForImage(lang)).toBe(COPY.en[0])
  })
})
```

Run: `cd <repo-root>/ai-information-hub && npx vitest run lib/ai-label.test.ts`
Expected: FAIL, because `./ai-label` cannot be resolved.

- [ ] **Step 2: Create the copy module**

Create `ai-information-hub/lib/ai-label.ts`:

```ts
import { isSupportedLanguage, type AppLanguage } from './i18n'

/** Page that explains how AI writes the content; every label links here. */
export const AI_DISCLOSURE_PATH = '/ai-disclosure'

type LabelCopy = { label: string; short: string; link: string }

// Spec AD7: shown near the top of every surface that renders AI-written prose, in the page language.
const AI_LABEL_COPY: Record<AppLanguage, LabelCopy> = {
  en: { label: 'AI-generated: summaries written by AI from the linked sources.', short: 'AI-generated', link: 'How we use AI' },
  de: { label: 'KI-generiert: Die Zusammenfassungen schreibt eine KI auf Grundlage der verlinkten Quellen.', short: 'KI-generiert', link: 'So nutzen wir KI' },
  zh: { label: 'AI 生成：摘要由 AI 根据所链接的来源撰写。', short: 'AI 生成', link: '我们如何使用 AI' },
  fr: { label: 'Généré par IA : résumés rédigés par une IA à partir des sources citées.', short: 'Généré par IA', link: "Notre usage de l'IA" },
  es: { label: 'Generado por IA: resúmenes redactados por IA a partir de las fuentes enlazadas.', short: 'Generado por IA', link: 'Cómo usamos la IA' },
  pt: { label: 'Gerado por IA: resumos escritos por IA a partir das fontes indicadas.', short: 'Gerado por IA', link: 'Como usamos a IA' },
  ja: { label: 'AI生成：要約はリンク先の情報源をもとにAIが作成しています。', short: 'AI生成', link: 'AIの利用について' },
  ko: { label: 'AI 생성: 요약은 링크된 출처를 바탕으로 AI가 작성했습니다.', short: 'AI 생성', link: 'AI 활용 방식' },
}

// The OG renderer bundles only a Latin font; English avoids a CJK font download on every render (Ruling R-5).
const IMAGE_LABEL_LANGUAGES: readonly string[] = ['de', 'en', 'fr', 'es', 'pt']

function copyFor(lang: string): LabelCopy {
  return AI_LABEL_COPY[isSupportedLanguage(lang) ? lang : 'en']
}

export function aiLabel(lang: string): string {
  return copyFor(lang).label
}

export function aiLabelShort(lang: string): string {
  return copyFor(lang).short
}

export function aiLabelLinkText(lang: string): string {
  return copyFor(lang).link
}

export function aiLabelForImage(lang: string): string {
  return aiLabel(IMAGE_LABEL_LANGUAGES.includes(lang) ? lang : 'en')
}
```

Run: `cd <repo-root>/ai-information-hub && npx vitest run lib/ai-label.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 3: Create the label component and the feed masthead**

Create `ai-information-hub/components/ai-label.tsx`:

```tsx
import { AI_DISCLOSURE_PATH, aiLabel, aiLabelLinkText } from '@/lib/ai-label'

/** Spec AD7 label for surfaces that show AI-written prose. No hooks, so it renders in server and client trees. */
export function AiLabel({ lang, className = 'text-xs text-muted-foreground' }: { lang: string; className?: string }) {
  return (
    <p data-ai-label="" className={className}>
      {aiLabel(lang)}{' '}
      <a href={AI_DISCLOSURE_PATH} className="underline hover:no-underline">
        {aiLabelLinkText(lang)}
      </a>
    </p>
  )
}
```

Create `ai-information-hub/components/feed-masthead.tsx`:

```tsx
import { AiLabel } from '@/components/ai-label'
import { LogoCube } from '@/components/logo-cube'
import { BRAND } from '@/lib/brand'

/** Home feed masthead: brand, issue label and the AI label (spec AD7). */
export function FeedMasthead({ issueLabel, language }: { issueLabel: string; language: string }) {
  return (
    <header className="border-b-2 border-foreground bg-card px-5 py-5 sm:px-7">
      <div className="flex items-center justify-between gap-4 font-sans text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
        <span>AI Intelligence</span>
        <LogoCube size={30} />
        <span className="text-right">{issueLabel}</span>
      </div>
      <div className="pt-4 text-center">
        <h1 className="font-display text-5xl font-normal leading-none text-foreground sm:text-6xl">
          {BRAND.name}
        </h1>
        <p className="mt-2 font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
          The Intelligence Memo
        </p>
        <p className="mx-auto mt-2 max-w-[19rem] font-display text-lg leading-snug text-foreground sm:max-w-none">
          Daily AI signals, capital moves, and workflows.
        </p>
        <AiLabel
          lang={language}
          className="mx-auto mt-2 max-w-[19rem] font-sans text-[11px] leading-snug text-muted-foreground sm:max-w-none"
        />
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Write the failing surface tests**

Create `ai-information-hub/test/ai-label-surfaces.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FeedMasthead } from '@/components/feed-masthead'
import { AI_DISCLOSURE_PATH, aiLabel, aiLabelLinkText, aiLabelShort } from '@/lib/ai-label'
import { BRAND } from '@/lib/brand'
import { FIXED_NOW, LANGS, PERIOD_ID, STORY_ID, TOPIC, stubApiFetch } from './fixtures/api'

vi.mock('next/link', () => ({
  default: ({ href, children, prefetch: _prefetch, ...rest }: any) =>
    createElement('a', { href: typeof href === 'string' ? href : String(href?.pathname ?? ''), ...rest }, children),
}))

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;')
}

async function render(element: ReactElement | Promise<ReactElement>): Promise<string> {
  return renderToStaticMarkup(await element).replaceAll('<!-- -->', '')
}

function expectLabel(html: string, lang: string) {
  expect(html).toContain('data-ai-label=""')
  expect(html).toContain(escapeHtml(aiLabel(lang)))
  expect(html).toContain(`href="${AI_DISCLOSURE_PATH}"`)
  expect(html).toContain(escapeHtml(aiLabelLinkText(lang)))
}

beforeEach(() => {
  vi.useFakeTimers({ now: FIXED_NOW, toFake: ['Date'] })
  stubApiFetch()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe.each(LANGS)('AI label on HTML surfaces in %s', (lang) => {
  it('week page: label in the header, no editorial byline', async () => {
    const { default: WeekPage } = await import('@/app/(localized)/[lang]/week/[weekId]/page')
    const html = await render(WeekPage({ params: Promise.resolve({ lang, weekId: PERIOD_ID }) }))
    expectLabel(html, lang)
    expect(html.indexOf('data-ai-label')).toBeLessThan(html.indexOf('id="takeaways-heading"'))
    expect(html).not.toContain(`${BRAND.name} Editorial`)
  })

  it('article page: short label in the byline slot, full label under the headline', async () => {
    const { default: ArticlePage } = await import('@/app/(localized)/[lang]/news/[periodId]/[storyId]/page')
    const html = await render(ArticlePage({ params: Promise.resolve({ lang, periodId: PERIOD_ID, storyId: STORY_ID }) }))
    expectLabel(html, lang)
    expect(html).toContain(`>${escapeHtml(aiLabelShort(lang))}</a>`)
    expect(html.indexOf('data-ai-label')).toBeLessThan(html.indexOf('id="source-brief-heading"'))
    // Visible bylines only: the NewsArticle JSON-LD keeps "<brand> Editorial" as its author until Task 16 (L3).
    const visible = html.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
    for (const byline of ['Editorial', 'Redaktion', '编辑部', 'Redaction', 'Redaccion', '編集部', '편집팀']) {
      expect(visible).not.toContain(`${BRAND.name} ${byline}`)
      expect(visible).not.toContain(`${byline} ${BRAND.name}`)
    }
  })

  it('topic page: label in the header', async () => {
    const { default: TopicPage } = await import('@/app/(localized)/[lang]/topic/[topic]/page')
    const props = { params: Promise.resolve({ lang, topic: TOPIC }), searchParams: Promise.resolve({ period: PERIOD_ID }) }
    const html = await render(TopicPage(props))
    expectLabel(html, lang)
    expect(html.indexOf('data-ai-label')).toBeLessThan(html.indexOf('aria-label="Section filter"'))
  })

  it('AI News Aggregator tool page: label above the live preview', async () => {
    const { default: ToolPage } = await import('@/app/(localized)/[lang]/tools/ai-news-aggregator/page')
    const html = await render(ToolPage({ params: Promise.resolve({ lang }) }))
    expectLabel(html, lang)
    expect(html.indexOf('data-ai-label')).toBeLessThan(html.indexOf('OpenAI ships a new reasoning model'))
  })

  it('home feed masthead', async () => {
    expectLabel(await render(createElement(FeedMasthead, { issueLabel: 'Sep 13, 2026', language: lang })), lang)
  })
})
```

Run: `cd <repo-root>/ai-information-hub && npx vitest run test/ai-label-surfaces.test.ts`
Expected: `Tests  32 failed | 8 passed (40)`:
- the week, article, topic and aggregator tests fail (no `data-ai-label`) in all eight languages;
- the masthead tests pass.

- [ ] **Step 5: Put the label on the pages**

**`app/(site)/week/[weekId]/page.tsx`**
- Import `AiLabel` from `@/components/ai-label`. Remove `BRAND` from the `@/lib/brand` import if nothing else uses it.
- Delete the `const labelByline: L = …` line.
- Replace the byline paragraph in the header:

```tsx
        <p className="mt-2 text-sm text-gray-600">
          <span>{t(labelByline, lang)} <span className="font-medium">{BRAND.name} Editorial</span></span>
          <span> • </span>
          <time dateTime={publishedIso}>{t(labelPublished, lang)} {publishedDateLabel}</time>
        </p>
```

with:

```tsx
        <p className="mt-2 text-sm text-gray-600">
          <time dateTime={publishedIso}>{t(labelPublished, lang)} {publishedDateLabel}</time>
        </p>
        <AiLabel lang={lang} className="mt-2 text-sm text-gray-600" />
```

- Replace `labelEditorialAttribution` with:

```ts
const labelEditorialAttribution: L = {
  de: 'KI-generierte Analyse — mehr erfahren',
  en: 'AI-generated analysis — learn how we work',
  zh: 'AI 生成的分析 — 了解我们的方法',
  fr: 'Analyse générée par IA',
  es: 'Análisis generado por IA',
  pt: 'Análise gerada por IA',
  ja: 'AI 生成分析',
  ko: 'AI 생성 분석',
}
```

**`app/(localized)/[lang]/news/[periodId]/[storyId]/page.tsx`**
- Import `AiLabel` from `@/components/ai-label`, and `AI_DISCLOSURE_PATH` and `aiLabelShort` from `@/lib/ai-label`.
- Delete the `byline` entry from `labels`.
- In the header grid, replace `<span>{t(labels.byline, lang)}</span>` with:

```tsx
            <a href={AI_DISCLOSURE_PATH} className="underline hover:no-underline">{aiLabelShort(lang)}</a>
```

- Directly after the `{story.deck ? (…) : null}` block, inside the same centered `div`, add:

```tsx
            <AiLabel lang={lang} className="mx-auto mt-4 max-w-3xl text-sm text-muted-foreground" />
```

**`app/(localized)/[lang]/topic/[topic]/page.tsx`**
- Import `AiLabel` from `@/components/ai-label`.
- Insert this line directly after the first `</p>` that follows `<h1 className="text-3xl font-bold">{topicTitle}</h1>`:

```tsx
        <AiLabel lang={lang} className="mt-2 text-sm text-muted-foreground" />
```

**`app/(localized)/[lang]/tools/ai-news-aggregator/page.tsx`**
- Import `AiLabel` from `@/components/ai-label`.
- In "Section B: Live News Preview", directly after the `<p>` that renders `{t(PREVIEW_LEAD, lang)}`, add the label. It renders only when the preview shows AI summaries:

```tsx
          {previewPosts.length > 0 ? <AiLabel lang={lang} className="mt-2 text-sm text-muted-foreground" /> : null}
```

**`components/feed.tsx`**
- Replace the whole `<header className="border-b-2 border-foreground bg-card px-5 py-5 sm:px-7">…</header>` block with:

```tsx
      <FeedMasthead issueLabel={issueLabel} language={language} />
```

- Add `import { FeedMasthead } from "@/components/feed-masthead";`.
- Remove the now unused `LogoCube` and `BRAND` imports.

- [ ] **Step 6: Run the surface tests to see them pass**

Run: `cd <repo-root>/ai-information-hub && npx vitest run test/ai-label-surfaces.test.ts lib/ai-label.test.ts`
Expected: PASS (40 surface tests and 11 copy tests).

- [ ] **Step 7: Regenerate and review the page goldens**

```bash
cd <repo-root>/ai-information-hub && npx vitest run test/golden
cd <repo-root>/ai-information-hub && export PATH=/usr/local/bin:$PATH && npx vitest run test/golden/pages.test.ts -u
git -C <repo-root> diff --stat -- ai-information-hub/test/golden/__goldens__
git -C <repo-root> diff -- ai-information-hub/test/golden/__goldens__
```

Expected:
- The first run fails only in `pages/week-{en,de,zh}.html`, `pages/article-{en,zh}.html`, `pages/topic-en.html` and `pages/tool-ai-news-aggregator-{en,zh}.html`.
- The diff contains only:
  - the inserted `data-ai-label` paragraph (L1);
  - on week pages: the removed "By … Data Cube AI Editorial" span and the new editorial attribution text (L2);
  - on article pages: the byline text replaced by the short label link (L2).
- No metadata or route golden changes.

- [ ] **Step 8: Guard, type check, suite**

```bash
cd <repo-root> && python3 scripts/brand_guard.py ai-information-hub/lib/ai-label.ts ai-information-hub/components/ai-label.tsx ai-information-hub/components/feed-masthead.tsx ai-information-hub/components/feed.tsx 'ai-information-hub/app/(site)/week/[weekId]/page.tsx' 'ai-information-hub/app/(localized)/[lang]/news/[periodId]/[storyId]/page.tsx' 'ai-information-hub/app/(localized)/[lang]/topic/[topic]/page.tsx' 'ai-information-hub/app/(localized)/[lang]/tools/ai-news-aggregator/page.tsx'
cd <repo-root>/ai-information-hub && npm run lint && npm test
```

Expected:
- `brand guard: clean`;
- the type check is clean;
- all tests pass: `Tests  193 passed (193)` in 15 files.

- [ ] **Step 9: Commit**

```bash
git -C <repo-root> add ai-information-hub/lib/ai-label.ts ai-information-hub/lib/ai-label.test.ts ai-information-hub/components/ai-label.tsx ai-information-hub/components/feed-masthead.tsx ai-information-hub/components/feed.tsx ai-information-hub/test/ai-label-surfaces.test.ts ':(literal)ai-information-hub/app/(site)/week/[weekId]/page.tsx' ':(literal)ai-information-hub/app/(localized)/[lang]/news/[periodId]/[storyId]/page.tsx' ':(literal)ai-information-hub/app/(localized)/[lang]/topic/[topic]/page.tsx' ':(literal)ai-information-hub/app/(localized)/[lang]/tools/ai-news-aggregator/page.tsx' ai-information-hub/test/golden/__goldens__
git -C <repo-root> commit -m "feat(ai-label): AI label on week, article, topic pages, the home feed and the aggregator preview; bylines replaced (L1, L2)

Spec AD7: copy in lib/ai-label.ts, AiLabel component, render tests per surface and language.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 14: AI label on feeds, content summary, llms.txt and the OG image

This task puts the AD7 label on the surfaces machines read:
- the Atom feeds;
- the content summary, whose footer now says "AI-generated" (L5);
- `llms.txt`;
- the OG image.

**Files:**
- Modify: `ai-information-hub/app/feed.xml/route.ts`
- Modify: `ai-information-hub/app/newsletter.xml/route.ts`
- Modify: `ai-information-hub/app/api/content-summary/route.ts`
- Modify: `ai-information-hub/app/llms.txt/route.ts`
- Modify: `ai-information-hub/app/api/og/route.tsx`
- Modify: `ai-information-hub/test/ai-label-surfaces.test.ts`
- Modify (regenerated): `feed-*.xml`, `newsletter-*.xml`, `content-summary-{de,en,zh,fr,es,pt,ja,ko}.md`, `content-summary-latest-en.md`, `llms.txt`

**Interfaces:**
- **Consumes:**
  - `aiLabel`, `aiLabelForImage`, `AI_DISCLOSURE_PATH` (Task 13);
  - `absoluteUrl`, `BRAND` (Task 5);
  - the routes as left by Tasks 8 and 12.
- **Produces:** nothing new.

- [ ] **Step 1: Append the failing tests**

In `ai-information-hub/test/ai-label-surfaces.test.ts`:
- add `import { NextRequest } from 'next/server'`;
- add `absoluteUrl` to the `@/lib/brand` import;
- add `aiLabelForImage` to the `@/lib/ai-label` import;
- append:

```ts
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// next/og renders with fonts. This stand-in keeps the element tree it is given, so the OG test reads the
// image text without fonts or network.
vi.mock('next/og', () => ({
  ImageResponse: class {
    element: unknown
    constructor(element: unknown) {
      this.element = element
    }
  },
}))

/** Every string in a JSX element tree, in render order. */
function textOf(node: unknown): string[] {
  if (typeof node === 'string' || typeof node === 'number') return [String(node)]
  if (Array.isArray(node)) return node.flatMap(textOf)
  if (node && typeof node === 'object' && 'props' in node) {
    return textOf((node as { props: { children?: unknown } }).props.children)
  }
  return []
}

describe('AI label on machine-readable surfaces', () => {
  const SITE = 'https://www.example.com'

  it.each(LANGS)('feed.xml subtitle in %s', async (lang) => {
    const { GET } = await import('@/app/feed.xml/route')
    const xml = await (await GET(new NextRequest(`${SITE}/feed.xml?lang=${lang}`))).text()
    expect(xml).toMatch(new RegExp(`<subtitle>[^<]* · ${escapeRegExp(aiLabel(lang))}</subtitle>`))
  })

  it.each(['de', 'en'])('newsletter.xml subtitle and every entry in %s', async (lang) => {
    const { GET } = await import('@/app/newsletter.xml/route')
    const xml = await (await GET(new NextRequest(`${SITE}/newsletter.xml?lang=${lang}`))).text()
    expect(xml).toContain(` · ${aiLabel(lang)}</subtitle>`)
    const entries = xml.split('<entry>').slice(1)
    expect(entries.length).toBeGreaterThan(0)
    for (const entry of entries) {
      expect(entry).toContain(`<content type="html">&lt;p&gt;&lt;em&gt;${aiLabel(lang)}&lt;/em&gt;&lt;/p&gt;`)
    }
  })

  it.each(LANGS)('content summary in %s: label below the title, AI-generated footer', async (lang) => {
    const { GET } = await import('@/app/api/content-summary/route')
    const md = await (await GET(new NextRequest(`${SITE}/api/content-summary?lang=${lang}&periodId=${PERIOD_ID}`))).text()
    const label = `\n\n> ${aiLabel(lang)} ${absoluteUrl(AI_DISCLOSURE_PATH)}\n\n`
    expect(md).toContain(label)
    expect(md.indexOf(label)).toBeLessThan(md.indexOf('## Summary Statistics'))
    expect(md).toContain('Content is AI-generated')
  })

  it('llms.txt carries the label in its introduction', async () => {
    const { GET } = await import('@/app/llms.txt/route')
    const text = await GET().text()
    const label = `> ${aiLabel('en')} How we use AI: ${absoluteUrl(AI_DISCLOSURE_PATH)}`
    expect(text).toContain(label)
    expect(text.indexOf(label)).toBeLessThan(text.indexOf('## Content Sections'))
  })

  it.each(['en', 'zh'])('OG image text in %s', async (lang) => {
    const { GET } = await import('@/app/api/og/route')
    const image = (await GET(new NextRequest(`${SITE}/api/og?period=${PERIOD_ID}&lang=${lang}`))) as unknown as { element: unknown }
    // English on the image for zh, ja and ko (Ruling R-5); aiLabelForImage encodes that choice.
    expect(textOf(image.element)).toContain(aiLabelForImage(lang))
  })
})
```

Run: `cd <repo-root>/ai-information-hub && npx vitest run test/ai-label-surfaces.test.ts`
Expected: `Tests  21 failed | 40 passed (61)`. The 21 new machine-surface tests fail (feed.xml 8, newsletter.xml 2, content summary 8, llms.txt 1, OG image 2); the 40 Task 13 tests still pass.

- [ ] **Step 2: Add the label to each surface**

**`app/feed.xml/route.ts`**
- Import `aiLabel` from `@/lib/ai-label`.
- Replace `<subtitle>${escapeXml(feedSubtitle)}</subtitle>` with `<subtitle>${escapeXml(`${feedSubtitle} · ${aiLabel(lang)}`)}</subtitle>`.

**`app/newsletter.xml/route.ts`**
- Import `aiLabel` from `@/lib/ai-label`.
- In `buildDigestHtml`, directly after its `const weekUrl = …;` line (an identical line further down belongs to `GET`), add `parts.push(`<p><em>${escapeXml(aiLabel(lang))}</em></p>`);`.
- Above the `atom` template, add `const subtitle = lang === 'de' ? `Täglicher KI-News Digest von ${BRAND.name}` : `Daily AI news digest from ${BRAND.name}`;`.
- Set the feed subtitle to `<subtitle>${escapeXml(`${subtitle} · ${aiLabel(lang)}`)}</subtitle>`.

**`app/api/content-summary/route.ts`**
- Import `AI_DISCLOSURE_PATH` and `aiLabel` from `@/lib/ai-label`.
- Directly after `md += `# ${title}\n\n`;`, add `md += `> ${aiLabel(lang)} ${absoluteUrl(AI_DISCLOSURE_PATH)}\n\n`;`.
- In the footer sentence, replace `Content is AI-assisted` with `Content is AI-generated` (L5).

**`app/llms.txt/route.ts`**
- Import `AI_DISCLOSURE_PATH` and `aiLabel` from `@/lib/ai-label`.
- Directly after the line `> investment news, practical tips, and YouTube videos from 35+ sources.`, add two template lines:

```
>
> ${aiLabel('en')} How we use AI: ${site}${AI_DISCLOSURE_PATH}
```

**`app/api/og/route.tsx`**
- Import `aiLabelForImage` from `@/lib/ai-label`.
- Directly before the `{/* Language badges */}` block, add:

```tsx
        {/* AI label (spec AD7); English outside the bundled Latin font (Ruling R-5) */}
        <div style={{ fontSize: 16, color: '#888', marginTop: 20 }}>{aiLabelForImage(lang)}</div>
```

- [ ] **Step 3: Run the tests to see them pass**

Run: `cd <repo-root>/ai-information-hub && npx vitest run test/ai-label-surfaces.test.ts`
Expected: PASS (61 tests).

- [ ] **Step 4: Regenerate and review the route goldens**

```bash
cd <repo-root>/ai-information-hub && export PATH=/usr/local/bin:$PATH && npx vitest run test/golden/routes.test.ts app/llms.txt/route.test.ts -u
git -C <repo-root> diff --stat -- ai-information-hub/test/golden/__goldens__
git -C <repo-root> diff -- ai-information-hub/test/golden/__goldens__/feed-en.xml ai-information-hub/test/golden/__goldens__/newsletter-de.xml ai-information-hub/test/golden/__goldens__/content-summary-zh.md ai-information-hub/test/golden/__goldens__/llms.txt
```

Expected: only `feed-*.xml`, `newsletter-*.xml`, `content-summary-*.md` (not `content-summary-empty.md`) and `llms.txt` changed. The changed lines are only:
- the subtitle suffix;
- the label paragraph at the start of each newsletter entry;
- the label line below the summary title, plus `AI-assisted` → `AI-generated`;
- the two llms.txt lines.

- [ ] **Step 5: Guard, type check, suite**

```bash
cd <repo-root> && python3 scripts/brand_guard.py ai-information-hub/app/feed.xml/route.ts ai-information-hub/app/newsletter.xml/route.ts ai-information-hub/app/api/content-summary/route.ts ai-information-hub/app/llms.txt/route.ts ai-information-hub/app/api/og/route.tsx
cd <repo-root>/ai-information-hub && npm run lint && npm test
```

Expected:
- `brand guard: clean`;
- the type check is clean;
- all tests pass: `Tests  214 passed (214)` in 15 files.

- [ ] **Step 6: Commit**

```bash
git -C <repo-root> add ai-information-hub/app/feed.xml/route.ts ai-information-hub/app/newsletter.xml/route.ts ai-information-hub/app/api/content-summary/route.ts ai-information-hub/app/llms.txt/route.ts ai-information-hub/app/api/og/route.tsx ai-information-hub/test/ai-label-surfaces.test.ts ai-information-hub/test/golden/__goldens__
git -C <repo-root> commit -m "feat(ai-label): AI label on Atom feeds, content summary, llms.txt and OG image (L1, L5)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 15: AI label and founder line in emails

Every newsletter edition gets the AD7 label directly under the masthead, in the subscriber's language, with a link to `/ai-disclosure`. The footer shows "Made by <founder>" only when `FOUNDER_NAME` is set; it is unset today.

**Files:**
- Modify: `ai-hub-backend/app/services/newsletter_sender.py`
- Create: `ai-hub-backend/tests/test_newsletter_ai_label.py`
- Modify (regenerated): `ai-hub-backend/tests/goldens/email_{de,en,zh,fr,es,pt,ja,ko}.html`

**Interfaces:**
- **Consumes:**
  - `Settings.site_url` and `Settings.founder_name` (Task 6);
  - `newsletter_fixtures.period_data` and `LANGS` (Task 2);
  - the `settings` local in `_build_email_html` (Task 6).
- **Produces:** `EMAIL_STRINGS[lang]["ai_label"]` and `EMAIL_STRINGS[lang]["ai_label_link"]` for all eight languages.

- [ ] **Step 1: Write the failing tests**

Create `ai-hub-backend/tests/test_newsletter_ai_label.py`:

```python
"""Every newsletter edition carries the AI label near the top, in the subscriber's language (spec AD7)."""

import html

import pytest

import app.services.newsletter_sender as sender
from app.config import Settings, get_settings
from newsletter_fixtures import LANGS, period_data

# The plan's "AI label copy" table: label and link text.
EXPECTED = {
    "en": ("AI-generated: summaries written by AI from the linked sources.", "How we use AI"),
    "de": ("KI-generiert: Die Zusammenfassungen schreibt eine KI auf Grundlage der verlinkten Quellen.", "So nutzen wir KI"),
    "zh": ("AI 生成：摘要由 AI 根据所链接的来源撰写。", "我们如何使用 AI"),
    "fr": ("Généré par IA : résumés rédigés par une IA à partir des sources citées.", "Notre usage de l'IA"),
    "es": ("Generado por IA: resúmenes redactados por IA a partir de las fuentes enlazadas.", "Cómo usamos la IA"),
    "pt": ("Gerado por IA: resumos escritos por IA a partir das fontes indicadas.", "Como usamos a IA"),
    "ja": ("AI生成：要約はリンク先の情報源をもとにAIが作成しています。", "AIの利用について"),
    "ko": ("AI 생성: 요약은 링크된 출처를 바탕으로 AI가 작성했습니다.", "AI 활용 방식"),
}


@pytest.mark.parametrize("lang", LANGS)
def test_label_copy_matches_the_plan(lang):
    assert (sender.EMAIL_STRINGS[lang]["ai_label"], sender.EMAIL_STRINGS[lang]["ai_label_link"]) == EXPECTED[lang]


@pytest.mark.parametrize("lang", LANGS)
def test_label_sits_above_the_first_summary_and_links_the_disclosure(lang):
    rendered = sender._build_email_html(period_data(), lang)
    label = html.escape(EXPECTED[lang][0])
    first_summary_block = html.escape(sender._clean_label(sender._s(lang, "tldr_label")))

    assert label in rendered
    assert rendered.index(label) < rendered.index(first_summary_block)
    assert f'href="{get_settings().site_url}/ai-disclosure"' in rendered
    assert html.escape(EXPECTED[lang][1]) in rendered


def test_founder_line_renders_only_when_a_founder_name_is_set(monkeypatch):
    assert "Made by" not in sender._build_email_html(period_data(), "en")

    monkeypatch.setattr(sender, "get_settings", lambda: Settings(_env_file=None, founder_name="Jane Doe"))

    assert "Made by Jane Doe" in sender._build_email_html(period_data(), "en")
```

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_newsletter_ai_label.py -q`
Expected: 17 failures, from `KeyError: 'ai_label'` and missing text.

- [ ] **Step 2: Add the label strings to all eight languages**

The script writes the strings as `\u` escapes, which matches the file's style:

```bash
cd <repo-root> && python3 - <<'EOF'
import json
import re
from pathlib import Path

LABELS = {
    "de": ("KI-generiert: Die Zusammenfassungen schreibt eine KI auf Grundlage der verlinkten Quellen.", "So nutzen wir KI"),
    "en": ("AI-generated: summaries written by AI from the linked sources.", "How we use AI"),
    "zh": ("AI 生成：摘要由 AI 根据所链接的来源撰写。", "我们如何使用 AI"),
    "fr": ("Généré par IA : résumés rédigés par une IA à partir des sources citées.", "Notre usage de l'IA"),
    "es": ("Generado por IA: resúmenes redactados por IA a partir de las fuentes enlazadas.", "Cómo usamos la IA"),
    "pt": ("Gerado por IA: resumos escritos por IA a partir das fontes indicadas.", "Como usamos a IA"),
    "ja": ("AI生成：要約はリンク先の情報源をもとにAIが作成しています。", "AIの利用について"),
    "ko": ("AI 생성: 요약은 링크된 출처를 바탕으로 AI가 작성했습니다.", "AI 활용 방식"),
}
path = Path("ai-hub-backend/app/services/newsletter_sender.py")
output, current, inserted = [], None, 0
for line in path.read_text(encoding="utf-8").split("\n"):
    block = re.match(r'^    "(de|en|zh|fr|es|pt|ja|ko)": \{$', line)
    if block:
        current = block.group(1)
    output.append(line)
    if current and line.lstrip().startswith('"footer_msg"'):
        label, link = LABELS[current]
        output.append(f'        "ai_label": {json.dumps(label)},')
        output.append(f'        "ai_label_link": {json.dumps(link)},')
        inserted += 1
        current = None
assert inserted == 8, inserted
path.write_text("\n".join(output), encoding="utf-8")
print("label strings inserted for", inserted, "languages")
EOF
```

- [ ] **Step 3: Render the label under the masthead and the founder line in the footer**

In `_build_email_html`, insert this directly after the masthead `sections.append(...)` and before the `# ── TLDR Summary` comment:

```python
    # ── AI label (spec AD7) ──────────────────────────────────────
    sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:14px 32px 0;background-color:{BG_SURFACE};font-family:{FONT_SANS};font-size:12px;color:{TEXT_META};line-height:1.5;">
          {_esc(_s(lang, "ai_label"))}
          <a href="{settings.site_url}/ai-disclosure" style="color:{TEXT_META};text-decoration:underline;">{_esc(_s(lang, "ai_label_link"))}</a>
        </td>
      </tr>
    </table>""")
```

Directly before the `# ── Editorial Footer` comment, add:

```python
    founder_row = ""
    if settings.founder_name:
        founder_row = f"""
            <tr>
              <td style="padding-top:8px;font-family:{FONT_SANS};font-size:12px;color:{TEXT_META};">
                Made by {_esc(settings.founder_name)}
              </td>
            </tr>"""
```

In the footer table, put `{founder_row}` on its own line directly after the `</tr>` that closes the "Open Source &bull; MIT License" row.

- [ ] **Step 4: Run the tests to see them pass**

Run: `cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_newsletter_ai_label.py tests/test_newsletter_brand.py -q`
Expected: 19 passed.

- [ ] **Step 5: Regenerate the email goldens and check the diff only adds the label**

```bash
cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_brand_goldens.py -q; echo "exit=$?"
cd <repo-root>/ai-hub-backend && UPDATE_GOLDENS=1 DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest tests/test_brand_goldens.py -q
git -C <repo-root> diff --numstat -- ai-hub-backend/tests/goldens
```

Expected:
- The first run fails on the 8 email goldens only (`exit=1`).
- `--numstat` lists the eight `email_*.html` files with the same number of added lines each and `0` deleted lines.
- `api_identity.txt` and `deals_disclosure.txt` are unchanged.

- [ ] **Step 6: Lint, guard, backend suite**

```bash
cd <repo-root>/ai-hub-backend && venv312/bin/python -m ruff check app/ scripts/ tests/
cd <repo-root> && python3 scripts/brand_guard.py ai-hub-backend/app/services/newsletter_sender.py
cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m "not integration" -q
```

Expected:
- ruff is clean;
- `brand guard: clean`;
- all unit tests pass.

- [ ] **Step 7: Commit**

```bash
git -C <repo-root> add ai-hub-backend/app/services/newsletter_sender.py ai-hub-backend/tests/test_newsletter_ai_label.py ai-hub-backend/tests/goldens
git -C <repo-root> commit -m "feat(ai-label): AI label in every newsletter language; founder line when configured (L1)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 16: Organization attribution, founder, AI disclosure copy

This task implements the rest of AD7:
- articles are authored by the Organization (L3);
- the root metadata names the Organization instead of a team (L3);
- `Organization.founder` and "Made by <founder>" render only when `NEXT_PUBLIC_FOUNDER_NAME` is set;
- the AI disclosure page stops claiming human review (L4).

**Files:**
- Modify: `ai-information-hub/components/structured-data.tsx`
- Modify: `ai-information-hub/app/(localized)/[lang]/news/[periodId]/[storyId]/page.tsx`
- Modify: `ai-information-hub/lib/site-metadata.ts`
- Modify: `ai-information-hub/components/right-sidebar.tsx`
- Modify: `ai-information-hub/app/(site)/trust-page.tsx`
- Modify: `ai-information-hub/app/(site)/ai-disclosure/page.tsx`
- Create: `ai-information-hub/test/attribution.test.ts`
- Modify (regenerated): `metadata-static.json`, `pages/ai-disclosure.html`, `pages/article-{en,zh}.html`

**Interfaces:**
- **Consumes:** `BRAND`, `Brand`, `buildBrand`, `absoluteUrl`, `brandedTitle` (Task 5); the fixtures (Task 1); the Task 13 article page.
- **Produces:** `organizationSchema(brand?: Brand): Record<string, unknown>` from `@/components/structured-data`.

- [ ] **Step 1: Write the failing tests**

Create `ai-information-hub/test/attribution.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { organizationSchema } from '@/components/structured-data'
import { buildBrand } from '@/lib/brand'
import { FIXED_NOW, PERIOD_ID, STORY_ID, stubApiFetch } from './fixtures/api'

vi.mock('next/link', () => ({
  default: ({ href, children, prefetch: _prefetch, ...rest }: any) =>
    createElement('a', { href: typeof href === 'string' ? href : String(href?.pathname ?? ''), ...rest }, children),
}))

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.resetModules()
})

const trustConfig = { label: 'Label', title: 'Title', description: 'Description', sections: [] }

describe('Organization attribution (spec AD7)', () => {
  it('names a founder only when one is configured', () => {
    expect(organizationSchema(buildBrand({}))).not.toHaveProperty('founder')
    expect(organizationSchema(buildBrand({ NEXT_PUBLIC_FOUNDER_NAME: 'Jane Doe' })).founder).toEqual({
      '@type': 'Person',
      name: 'Jane Doe',
    })
  })

  it('authors articles as the Organization', async () => {
    vi.useFakeTimers({ now: FIXED_NOW, toFake: ['Date'] })
    stubApiFetch()
    const { default: ArticlePage } = await import('@/app/(localized)/[lang]/news/[periodId]/[storyId]/page')
    const html = renderToStaticMarkup(await ArticlePage({ params: Promise.resolve({ lang: 'en', periodId: PERIOD_ID, storyId: STORY_ID }) }))
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].flatMap((match) => JSON.parse(match[1]))
    const article = blocks.find((block: { '@type'?: string }) => block['@type'] === 'NewsArticle')
    expect(article.author).toEqual({ '@type': 'Organization', name: 'Data Cube AI', url: 'https://www.datacubeai.space' })
  })

  it('shows "Made by" in the trust page footer only when a founder is configured', async () => {
    const unset = await import('@/app/(site)/trust-page')
    expect(renderToStaticMarkup(createElement(unset.TrustPage, { config: trustConfig }))).not.toContain('Made by')

    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_FOUNDER_NAME', 'Jane Doe')
    const configured = await import('@/app/(site)/trust-page')
    const html = renderToStaticMarkup(createElement(configured.TrustPage, { config: trustConfig })).replaceAll('<!-- -->', '')
    expect(html).toContain('Made by Jane Doe')
  })
})
```

Run: `cd <repo-root>/ai-information-hub && npx vitest run test/attribution.test.ts`
Expected: FAIL, because `organizationSchema` is not exported and the article author is still the editorial name.

- [ ] **Step 2: Implement**

**`components/structured-data.tsx`**
- Import `BRAND`, `absoluteUrl` and `type Brand` from `@/lib/brand`.
- Replace `OrganizationSchema` with:

```tsx
export function organizationSchema(brand: Brand = BRAND): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: brand.name,
    url: brand.siteUrl,
    logo: absoluteUrl('/icon.svg', brand),
    description: 'Multilingual AI news aggregator providing daily tech, investment, and tips content in 8 languages.',
    foundingDate: '2026-01',
    publishingPrinciples: absoluteUrl('/editorial-policy', brand),
    ethicsPolicy: absoluteUrl('/editorial-policy', brand),
    correctionsPolicy: absoluteUrl('/corrections', brand),
    ownershipFundingInfo: absoluteUrl('/about', brand),
    diversityPolicy: absoluteUrl('/source-methodology', brand),
    knowsAbout: [
      'artificial intelligence',
      'generative AI',
      'large language models',
      'AI investment',
      'AI workflows',
      'AI policy',
    ],
    sameAs: [],
    // Spec AD7: the founder appears as Organization.founder only once a name is configured.
    ...(brand.founderName ? { founder: { '@type': 'Person', name: brand.founderName } } : {}),
  }
}

export function OrganizationSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema()) }}
    />
  )
}
```

**`app/(localized)/[lang]/news/[periodId]/[storyId]/page.tsx`**
- In the NewsArticle JSON-LD: `author: { '@type': 'Organization', name: BRAND.name, url: BRAND.siteUrl }` (L3).

**`lib/site-metadata.ts`**
- `authors: [{ name: BRAND.name, url: BRAND.siteUrl }]` (L3), replacing the `${BRAND.shortName} Team` entry that Task 8 left.

**`components/right-sidebar.tsx`**
- Directly after the copyright paragraph, add `{BRAND.founderName ? <p>Made by {BRAND.founderName}</p> : null}`.

**`app/(site)/trust-page.tsx`**
- Import `BRAND` from `@/lib/brand`.
- Inside `<footer>`, directly after `</nav>`, add:

```tsx
        {BRAND.founderName ? (
          <p className="mt-3 text-sm text-muted-foreground">Made by {BRAND.founderName}</p>
        ) : null}
```

**`app/(site)/ai-disclosure/page.tsx`** (L4)
- `description: `AI usage disclosure for ${BRAND.name} content collection, summarization, categorization, translation, and curation.``
- `openGraph.description: `How ${BRAND.name} uses AI for collection, summarization, categorization, and translation.``
- Insert this as the first entry of `config.sections`, and leave the existing sections unchanged:

```tsx
    {
      title: 'AI-Generated Content',
      body: [
        'Summaries, classifications, translations, and the "Why Today Matters" analysis are generated by AI from the linked sources and published without human review. Every page, feed, and email that shows this text carries an AI-generated label.',
        'Found an error? Tell us through the contact page; corrections follow the corrections policy.',
      ],
    },
```

- [ ] **Step 3: Run the tests to see them pass**

Run: `cd <repo-root>/ai-information-hub && npx vitest run test/attribution.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 4: Regenerate and review the goldens**

```bash
cd <repo-root>/ai-information-hub && npx vitest run test/golden
cd <repo-root>/ai-information-hub && export PATH=/usr/local/bin:$PATH && npx vitest run test/golden/metadata.test.ts test/golden/pages.test.ts -u
git -C <repo-root> diff -- ai-information-hub/test/golden/__goldens__
```

Expected: the first run fails only in `metadata-static.json`, `pages/ai-disclosure.html` and `pages/article-{en,zh}.html`. The diff contains exactly:

| Golden | Change |
|---|---|
| `metadata-static.json` | `siteMetadata.authors` becomes `[{ "name": "Data Cube AI", "url": "https://www.datacubeai.space" }]` (L3); the `aiDisclosure` description and `openGraph.description` no longer mention review (L4) |
| `pages/ai-disclosure.html` | the new first section, with the section numbers of the following sections shifted by one (L4) |
| `pages/article-{en,zh}.html` | the NewsArticle author object (L3) |

`structured-data.json` and `pages/root-shell-{en,zh}.html`, which renders `OrganizationSchema` in the head, are unchanged, because no founder is configured.

- [ ] **Step 5: Guard, type check, suite**

```bash
cd <repo-root> && python3 scripts/brand_guard.py ai-information-hub/components/structured-data.tsx 'ai-information-hub/app/(localized)/[lang]/news/[periodId]/[storyId]/page.tsx' ai-information-hub/lib/site-metadata.ts ai-information-hub/components/right-sidebar.tsx 'ai-information-hub/app/(site)/trust-page.tsx' 'ai-information-hub/app/(site)/ai-disclosure/page.tsx'
cd <repo-root>/ai-information-hub && npm run lint && npm test
```

Expected:
- `brand guard: clean`;
- the type check is clean;
- all tests pass: `Tests  217 passed (217)` in 16 files.

- [ ] **Step 6: Commit**

```bash
git -C <repo-root> add ai-information-hub/components/structured-data.tsx ':(literal)ai-information-hub/app/(localized)/[lang]/news/[periodId]/[storyId]/page.tsx' ai-information-hub/lib/site-metadata.ts ai-information-hub/components/right-sidebar.tsx 'ai-information-hub/app/(site)/trust-page.tsx' 'ai-information-hub/app/(site)/ai-disclosure/page.tsx' ai-information-hub/test/attribution.test.ts ai-information-hub/test/golden/__goldens__
git -C <repo-root> commit -m "feat(attribution): Organization authorship, founder only when configured, honest AI disclosure (L3, L4)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 17: Documentation and final guard

This task brings the documentation in line with the new structure, following the root `CLAUDE.md` rule: update every file that references a changed thing.
- Brand text in the docs stays until R4.
- The guard must end clean for the whole repository.

**Files:**
- Modify: `README.md`
- Modify: `ai-information-hub/README.md`
- Modify: `ai-hub-backend/README.md`
- Modify: `docs/documentation-maintenance.md`
- Local only, never staged (git-ignored): `CLAUDE.md`, `ai-information-hub/CLAUDE.md`, `.ai-collab/context/project-overview.md`, `.ai-collab/context/codebase-map.md`

**Interfaces:**
- **Consumes:** the results of Tasks 1–16.
- **Produces:** documentation only.

- [ ] **Step 1: Find the stale references**

Run:

```bash
git -C <repo-root> grep -n -E 'vercel\.json|public/(robots|llms)\.txt|DataCube AI Editorial|%s \| DataCube AI|app/\*\*/\*\.test\.ts`?\)' -- README.md ai-information-hub/README.md ai-hub-backend/README.md docs/documentation-maintenance.md
cd <repo-root> && grep -n -E 'vercel\.json|public/(robots|llms)\.txt|DataCube AI Editorial|%s \| DataCube AI|app/\*\*/\*\.test\.ts`?\)' CLAUDE.md ai-information-hub/CLAUDE.md
```

The second command uses plain `grep`: both `CLAUDE.md` files are git-ignored, and `git grep` searches tracked files only.

Expected: 12 lines, each of which Steps 2–5 change:
- `README.md`: the `vercel.json` tree line;
- `ai-information-hub/README.md`: the unit-test glob line and the `vercel.json` redirect line;
- `docs/documentation-maintenance.md`: the `public/llms.txt` and `public/robots.txt` rows;
- `CLAUDE.md`: the `vercel.json` line in the Architecture box and in the directory tree;
- `ai-information-hub/CLAUDE.md`: the `vercel.json` tree line, the `npm test` comment, and the AI Editorial Brief, WWW Redirect and layout-template lines.

- [ ] **Step 2: Root `CLAUDE.md` (local only, never staged)**

**Architecture box**
- Replace `│  vercel.json: non-www → www permanent redirect (308)    │` with `│  next.config.mjs: non-www → www permanent redirect (308)│`.

**Directory tree**
- Delete the line `│   ├── vercel.json            # Non-www → www 308 redirect`.
- Under `public/`, delete `│   │   ├── llms.txt          # AI crawler site description` and `│   │   └── robots.txt        # Crawler rules`, and change `│   │   ├── data/             # Static JSON fallback` to `│   │   └── data/             # Static JSON fallback`.
- Directly after `│   │   ├── newsletter.xml/    # Newsletter XML feed`, add:
  - `│   │   ├── robots.ts         # Generated robots.txt (brand config)`;
  - `│   │   ├── llms.txt/         # Generated llms.txt route (brand config)`.
- Change `│   ├── lib/                  # Utils, types, API client` to `│   ├── lib/                  # Utils, types, API client, brand config (brand.ts), AI label copy (ai-label.ts)`.

**New section**
Insert this directly before the line `## Directory Structure` that follows the Architecture box (the file also has a `### Directory Structure` further down):

```markdown
### Brand identity and AI labels (R2)
- **Brand config**:
  - Frontend: `ai-information-hub/lib/brand.ts` (`BRAND`, `fillBrand`, `absoluteUrl`, `brandedTitle`, `FROZEN_IDS`) over `lib/brand-defaults.json`. Optional `NEXT_PUBLIC_BRAND_NAME`, `NEXT_PUBLIC_BRAND_SHORT_NAME`, `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_FOUNDER_NAME` override it.
  - Backend: `app/config.py` fields `brand_name`, `brand_short_name`, `site_url`, `founder_name`, `newsletter_from_name`, `api_key_prefix`, `rss_user_agent`, `github_issues_url`, `api_title`.
  - The defaults are the current brand; a rename changes config, not code. The Atom id prefix and the `dcai-takeaways` anchor never change (`FROZEN_IDS`).
- **Guard**: `python3 scripts/brand_guard.py` (CI job "Brand guard") fails on legacy brand strings outside the brand config, tests, docs and promo assets.
- **Generated files**:
  - `/robots.txt` from `app/robots.ts`;
  - `/llms.txt` from `app/llms.txt/route.ts`;
  - the non-www → www 308 in `next.config.mjs` `redirects()`.
- **AI labels (spec AD7)**:
  - Copy lives in `lib/ai-label.ts` (site) and in `EMAIL_STRINGS` `ai_label`/`ai_label_link` (email).
  - `AiLabel` renders on week, article and topic pages, in the home feed masthead and above the AI News Aggregator tool page's live preview.
  - Feeds, the content summary, llms.txt and the OG image carry the label text.
  - No person-like bylines: articles are authored by the Organization, and "Made by <founder>" renders only when a founder name is set.
- **Goldens**: `ai-information-hub/test/golden/` and `ai-hub-backend/tests/goldens/` pin brand-bearing output. Regenerate them only for an intended change: `npx vitest run <file> -u`, or `UPDATE_GOLDENS=1` for pytest.
- **Release comparison**: `python3 scripts/page_snapshot.py capture|compare`.
```

**Environment Variables**
- `### Frontend (.env.local)` block: after its last line, `BEEHIIV_PUBLICATION_ID=pub_...   # Beehiiv publication ID`, add `# NEXT_PUBLIC_BRAND_NAME / NEXT_PUBLIC_BRAND_SHORT_NAME / NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_FOUNDER_NAME — optional; defaults in lib/brand-defaults.json`.
- `### Backend (.env or Railway)` block: after its last line, `CONTACT_INBOX=...                # Contact form destination`, add `# BRAND_NAME, BRAND_SHORT_NAME, SITE_URL, FOUNDER_NAME, NEWSLETTER_FROM_NAME, API_KEY_PREFIX, RSS_USER_AGENT, GITHUB_ISSUES_URL, API_TITLE — optional; defaults in app/config.py`.

- [ ] **Step 3: `ai-information-hub/CLAUDE.md` (local only, never staged)**

**Quick Reference file table:** directly after the `lib/settings-context.tsx` row, add three rows:
- `lib/brand.ts`: brand config (`BRAND`, `fillBrand`, `absoluteUrl`, `brandedTitle`, `FROZEN_IDS`) over `lib/brand-defaults.json`;
- `lib/ai-label.ts`: AI label copy (8 languages);
- `components/ai-label.tsx`: the `AiLabel` component.

**Directory tree**
- Delete the line `├── vercel.json              # Non-www → www 308 redirect`.
- Under `public/`, delete `│   ├── llms.txt              # AI crawler site description` and `│   └── robots.txt            # Crawler rules + crawl-delay`, and change `│   ├── data/                 # Static JSON fallback` to `│   └── data/                 # Static JSON fallback`.
- Directly after `│   ├── newsletter.xml/        # Newsletter XML feed`, add `│   ├── robots.ts             # Generated robots.txt (brand config)` and `│   ├── llms.txt/             # Generated llms.txt route (brand config)`.

**Commands**
- `npm test                 # Vitest unit tests (lib/**/*.test.ts, app/**/*.test.ts)` becomes `npm test                 # Vitest unit tests (lib/**/*.test.ts, app/**/*.test.ts, test/**/*.test.ts)`.

**SEO & GEO table**

| Row | New text |
|---|---|
| WWW Redirect | ``| WWW Redirect | `next.config.mjs` `redirects()` | 308 permanent redirect from non-www to www; hosts from the brand config |`` |
| Robots.txt | description starts with "Generated by `app/robots.ts`." |
| llms.txt | description starts with "Served by `app/llms.txt/route.ts` from the brand config." |
| AI Editorial Brief | `attributed to "DataCube AI Editorial" with an /ai-disclosure link (never an invented human)` becomes `labeled as AI-generated analysis with an /ai-disclosure link (never a human or team byline)` |

**SEO Metadata Patterns**
- Replace the bullet ``- **Layout template**: `%s | DataCube AI` — child pages should NOT include "| DataCube AI" in their title`` with ``- **Layout template**: `%s | <BRAND.name>` in `lib/site-metadata.ts`, shared by both root layouts — child page titles never contain the brand; use `brandedTitle()` for `openGraph`/`twitter` titles and JSON-LD names``.

- [ ] **Step 4: `README.md` and `ai-information-hub/README.md`**

**`README.md`**
- Delete the tree line `│   ├── vercel.json              # Non-www → www redirect`. The next line, `│   └── middleware.ts …`, already closes that subtree.

**`ai-information-hub/README.md`**
- Replace `- Non-www → www permanent redirect via vercel.json` with ``- Non-www → www permanent redirect via `next.config.mjs` `redirects()` ``.
- In the line that starts with `- Unit tests:`, replace ``(`npm test`, `lib/**/*.test.ts`, `app/**/*.test.ts`)`` with ``(`npm test`, `lib/**/*.test.ts`, `app/**/*.test.ts`, `test/**/*.test.ts`)``.
- The README has no environment section. Insert this section directly before `## Tech Stack`:

```markdown
## Brand Configuration

Optional build-time variables. Their defaults, in `lib/brand-defaults.json`, are the current brand:

- `NEXT_PUBLIC_BRAND_NAME`
- `NEXT_PUBLIC_BRAND_SHORT_NAME`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_FOUNDER_NAME` (empty by default; when set, "Made by <founder>" and `Organization.founder` appear)
```

- [ ] **Step 5: `ai-hub-backend/README.md` and `docs/documentation-maintenance.md`**

**`ai-hub-backend/README.md`**
- Under `### 3. Set Environment Variables`, directly before the paragraph that starts with ``**Rotating `SIGNING_SECRET`:**``, add the paragraph `**Optional brand settings.**` followed by one bullet each: `BRAND_NAME`, `BRAND_SHORT_NAME`, `SITE_URL`, `FOUNDER_NAME`, `NEWSLETTER_FROM_NAME`, `API_KEY_PREFIX` (≤ 8, new keys only), `RSS_USER_AGENT`, `GITHUB_ISSUES_URL`, `API_TITLE`.
- After the bullets, add the sentence "The defaults in `app/config.py` are the current brand; `NEWSLETTER_FROM_EMAIL`, `RSS_USER_AGENT` and `CORS_ORIGINS` derive from `SITE_URL` when unset."

**`docs/documentation-maintenance.md`**
- Replace the `ai-information-hub/public/llms.txt` row path with `ai-information-hub/app/llms.txt/route.ts`.
- Replace the `ai-information-hub/public/robots.txt` row path with `ai-information-hub/app/robots.ts`.
- Directly after the `| Deployment or environment variables | … |` row, add the checklist row `| Brand name, site URL or founder | `lib/brand-defaults.json`, `app/config.py`, both CLAUDE.md files; run `python3 scripts/brand_guard.py` |`.

- [ ] **Step 6: Local collaboration context (not committed)**

Add the same facts to `.ai-collab/context/project-overview.md` and `.ai-collab/context/codebase-map.md`:
- brand config files;
- generated robots/llms routes;
- the redirect in `next.config.mjs`;
- AI label components and copy;
- the guard and goldens.

These files are git-ignored. Never stage them.

- [ ] **Step 7: Final repository checks**

```bash
cd <repo-root> && python3 scripts/brand_guard.py
cd <repo-root> && python3 -m unittest scripts/test_brand_guard.py scripts/test_page_snapshot.py
cd <repo-root>/ai-information-hub && npm run lint && npm test
cd <repo-root>/ai-hub-backend && venv312/bin/python -m ruff check app/ scripts/ tests/
cd <repo-root>/ai-hub-backend && DATABASE_URL=sqlite:///./test.db OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m "not integration" -q
cd <repo-root>/ai-hub-backend && DATABASE_URL=postgresql://postgres:test@localhost:5433/aihub_test OPENROUTER_API_KEY=test-key ADMIN_API_KEY=test-key venv312/bin/python -m pytest -m integration -q
```

Expected:
- `brand guard: clean`;
- 12 script tests OK;
- the frontend type check is clean and all tests pass: `Tests  217 passed (217)` in 16 files;
- ruff is clean;
- all backend unit and integration tests pass.

If the guard reports a remaining line, fix it in the file it names, following that file's task rules, and re-run the file's goldens.

- [ ] **Step 8: Commit**

```bash
git -C <repo-root> add README.md ai-information-hub/README.md ai-hub-backend/README.md docs/documentation-maintenance.md
git -C <repo-root> commit -m "docs: brand config, generated robots/llms routes, AI labels, guard and goldens

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Finish (controller)

- [ ] **Step 1: Final whole-branch review.** Follow superpowers:subagent-driven-development, on the most capable model:
  - one fix dispatch;
  - one scoped re-review;
  - ledger rulings for any residual findings.

- [ ] **Step 2: Fresh full verification.** Run the Task 17 Step 7 commands again on the final tree and record the counts in the ledger.

- [ ] **Step 3: Public repository scan**

```bash
git -C <repo-root> diff main...HEAD -- . ':(exclude)docs/superpowers/plans' | grep -n -i -E -f <scratchpad>/public-scan-patterns.txt | head
git -C <repo-root> diff --stat main...HEAD | tail -3
```

`<scratchpad>/public-scan-patterns.txt` stays outside the repository. It holds one extended regular expression per line for strings that must never be published: private names, the local home-directory prefix, personal email domains, and API key prefixes such as `sk-or-v1` and `re_[A-Za-z0-9]{16}`.

Expected: the first command prints nothing. The second shows the file count and line totals for the ledger.

- [ ] **Step 4: Restore the production `.env`**

```bash
mv <repo-root>/ai-hub-backend/.env.r2-backup <repo-root>/ai-hub-backend/.env
```

- [ ] **Step 5: Push the branch and open the PR (pre-approved)**

```bash
git -C <repo-root> push -u origin feat/r2-brand-ssot-ai-labels
```

Open the PR against `main` with `gh pr create`. The body contains:
- the goal, and a link to this plan and to spec §6.2, AD1 and AD7;
- the "Intended output changes" table (B1–B4, L1–L5);
- Rulings R-1 (proxy rename deferred, pending founder confirmation), R-10 (founder byline status) and R-11 (built on the merged cost work);
- the test plan: the local suites with counts, the goldens, the guard, and CI;
- the release checklist below, marking which steps need founder approval;
- the footer `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 6: CI green.** The PR checks are Detect changes, Frontend (tsc, Vitest, `next build`), Backend, Backend integration and Brand guard, and all of them must pass. Stop there. Merging needs founder approval.

## Release (founder-gated)

0. **Founder byline (pending since 2026-09-16, Ruling R-10).** Ask the founder for the exact byline wording.
   - If given, and with founder approval for each variable: set `NEXT_PUBLIC_FOUNDER_NAME` for Vercel Production and `FOUNDER_NAME` on the Railway `api` service. The step 4 merge builds with the first; the step 7 deploy reads the second.
   - If not given: release without the line, and keep the item open in the ledger and the project memory.
1. **Variables (read-only, names only).**
   - **Vercel:** in the project's Environment Variables settings, confirm that Production defines none of `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BRAND_NAME` and `NEXT_PUBLIC_BRAND_SHORT_NAME`, or that each equals the default. `NEXT_PUBLIC_FOUNDER_NAME` may exist only as step 0 set it. The CLI has no credentials, so use the founder's logged-in Chrome, or ask the founder. If `NEXT_PUBLIC_SITE_URL` points anywhere but the canonical site, stop: canonical URLs would move.
   - **Railway:** `cd <repo-root>/ai-hub-backend && railway variables -s api --json | python3 -c "import json,sys; print(sorted(json.load(sys.stdin)))"` prints names only. Compare with the 2026-09-16 list in Global Constraints. Any new brand variable other than step 0's `FOUNDER_NAME` must equal its default, or stop.
   - **GitHub:** `gh variable list --repo Rswcf/DataCube-AI-Space` shows no `SITE_URL`, or one equal to the canonical site.
2. **Timing (Ruling R-14).**
   - Start only after the day's Daily Newsletter run has sent: its log shows `"status":"sent"`.
   - No Daily Collection, Daily Newsletter or translation backfill may be running: check `gh run list --workflow daily-collect.yml --limit 1` and the same for `daily-newsletter.yml`.
   - Steps 3–7 must fall in one window with no collection, clear of the 21:07 and 22:07 UTC collection runs.
3. **Before snapshot.** `cd <repo-root> && python3 scripts/page_snapshot.py capture --base-url https://www.datacubeai.space --paths scripts/page_snapshot_paths.txt --out <scratchpad>/r2-before.json`
4. **Merge the PR — founder approval required.** Wait for the Vercel production deployment of the merge commit to succeed: `gh api repos/Rswcf/DataCube-AI-Space/commits/<merge sha>/status`.
5. **Frontend smoke checks.** Each check and its expected result:

| Check | Command | Expected |
|---|---|---|
| Apex redirect | `curl -sI "https://datacubeai.space/en?x=1"` | `308` and `location: https://www.datacubeai.space/en?x=1` |
| robots.txt | `curl -s https://www.datacubeai.space/robots.txt` | the user-agent groups and both sitemaps that `app/robots.ts` defines: `Disallow: /*/topic/*?` in every group except `meta-externalagent`, which has only `Disallow: /` |
| llms.txt | `curl -s https://www.datacubeai.space/llms.txt \| head -8` | the AI label line |
| Week page | `curl -s https://www.datacubeai.space/en/week/2026-09-13 \| grep -o -E '<title>[^<]*</title>\|data-ai-label'` | a single-branded title and `data-ai-label` |
| Home masthead | `curl -s https://www.datacubeai.space/en \| grep -c 'data-ai-label'` | `1` or more |
| Aggregator preview | `curl -s https://www.datacubeai.space/en/tools/ai-news-aggregator \| grep -c 'data-ai-label'` | `1` while the page shows previews |
| Middleware (unchanged, Ruling R-1) | `curl -sI https://www.datacubeai.space/week/2026-09-13` | `308` to `/en/week/2026-09-13` |
| Article noindex | `curl -s https://www.datacubeai.space/fr/news/2026-09-13/tech-2843 \| grep -o '<meta name="robots"[^>]*>'` | a robots meta tag whose content starts with `noindex` |
| OG image | `curl -sI "https://www.datacubeai.space/api/og?period=2026-09-13&lang=en"` | `200` and `content-type: image/png` |
| Feed subtitle | `curl -s "https://www.datacubeai.space/feed.xml?lang=de" \| grep -o '<subtitle>[^<]*'` | ends with the German label |
| Founder line (only if step 0 set it) | `curl -s https://www.datacubeai.space/about \| grep -o 'Made by [^<]*'` | `Made by <founder>` |

6. **After snapshot and comparison.**
   - `python3 scripts/page_snapshot.py capture … --out <scratchpad>/r2-after.json`
   - `python3 scripts/page_snapshot.py compare <scratchpad>/r2-before.json <scratchpad>/r2-after.json`
   - Map every difference to B1–B3 or L1–L5.
   - On the live-data paths at the end of the path list, a difference that only changes stories, counts or dates is data. That holds only while `gh run list` shows no collection or backfill between steps 3 and 6.
   - Any other unmapped difference: the founder promotes the previous production deployment in Vercel (instant rollback), or approves a revert PR. Then fix it on a new branch.
7. **Backend deploy — founder approval required, in the same sitting as step 4 (Ruling R-14).**
   - Check again that no run is in progress.
   - `git -C <repo-root> switch main && git -C <repo-root> pull --ff-only`, then confirm that `git -C <repo-root> log --oneline -1` shows the merge commit.
   - `cd <repo-root>/ai-hub-backend && railway up -d -s api`
   - Wait until `curl -s https://api-production-3ee5.up.railway.app/ | python3 -c "import json,sys; print(json.load(sys.stdin)['name'])"` prints `AI Hub API`.
   - Then `curl -s -D - -o /dev/null https://api-production-3ee5.up.railway.app/api/deals/export.csv | grep -i content-disposition` shows `data-cube-ai-deals.csv` (B4). The check uses GET, since the route may not answer HEAD.
   - **Backend rollback (spec §8):** the founder redeploys the previous deployment from the Railway dashboard (Deployments, previous deployment, Redeploy). With approval, the CLI equivalent is `git -C <repo-root> switch --detach <previous main sha>`, then `cd <repo-root>/ai-hub-backend && railway up -d -s api`, then `git -C <repo-root> switch main`.
8. **Test sends (pre-approved, founder's inbox only).** Send the latest daily period in `en` and `zh` to the founder's test address:

```bash
cd <repo-root>/ai-hub-backend && railway run -s api -- bash -c 'curl -sS -X POST "https://api-production-3ee5.up.railway.app/api/admin/newsletter/test-send?period_id=<latest day>&language=en" -H "X-API-Key: $ADMIN_API_KEY" -H "Content-Type: application/json" -d "{\"test_email\": \"<founder test address>\"}"'
```

   The founder confirms in both received emails:
   - the label sits under the masthead and its link works;
   - the footer is unchanged, apart from the "Made by" row if step 0 set a name;
   - one-click unsubscribe still appears.
9. **Next scheduled edition.**
   - Its log shows `"status":"sent"` with no held languages.
   - One received email shows the label.
10. **Record the results.** Write every check above into the ledger, and write the release outcome into the project memory.

