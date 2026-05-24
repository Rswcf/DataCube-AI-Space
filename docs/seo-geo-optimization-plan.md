# Data Cube AI SEO/GEO Optimization Plan

Last audited: 2026-05-24
Site: https://www.datacubeai.space
Scope: Next.js frontend, public routes, crawler access, structured data, feeds, sitemap, llms.txt, AI-search citation readiness.

## Implementation Log

### 2026-05-24 - P0/P1 Execution Pass 1

Completed in the Next.js frontend without changing the upstream data model:

- Made public SEO routes available to normal browser traffic, not only crawlers.
- Added AI search crawler coverage for `OAI-SearchBot`, `Claude-SearchBot`, `Claude-User`, and `Perplexity-User`.
- Added a noop route/rewrite for malformed `Next-Router-Prefetch` requests without `RSC`, returning `204` instead of triggering the Next.js prefetch error path.
- Rebuilt `news-sitemap.xml` to emit one roundup URL per language/period instead of many different titles pointing at the same URL.
- Rebuilt `feed.xml` to consume recent day periods, use first-party canonical story fragments, and expose external sources as source links rather than the primary alternate URL.
- Added stable `#story-tech-{id}` anchors and per-item `NewsArticle` schema URLs on period pages.
- Added `X-Robots-Tag: noindex, follow` to the Markdown content-summary endpoint.
- Added Twitter Card image metadata to localized home, period, and tool pages.
- Updated `llms.txt` with canonical discovery surfaces and non-stale endpoint examples.

Local verification:

```bash
npm run lint
npm run build
curl -I -A 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36' http://localhost:3010/de
curl -I -H 'Next-Router-Prefetch: 1' http://localhost:3010/de
curl -I -H 'Next-Router-Prefetch: 1' -H 'RSC: 1' http://localhost:3010/de
curl -s 'http://localhost:3010/feed.xml?lang=en' | rg -c '<entry>'
curl -s http://localhost:3010/news-sitemap.xml | rg '<loc>' | sort | uniq -d
curl -I 'http://localhost:3010/api/content-summary?lang=en&periodId=2026-05-23'
```

Expected local results after this pass:

- Chrome-like `/de`: `200`
- malformed prefetch: `204`
- real RSC prefetch: `200`
- English Atom feed entries: `50`
- News sitemap duplicate `<loc>` output: empty
- content summary includes `X-Robots-Tag: noindex, follow`

### 2026-05-24 - P2 Trust Infrastructure Pass

Completed in the frontend without changing the upstream data model:

- Added public trust pages: `/about`, `/editorial-policy`, `/source-methodology`, `/corrections`, and `/ai-disclosure`.
- Added these trust pages, plus `/for-teams`, to `sitemap.xml`.
- Updated `NewsMediaOrganization` schema to point at real publishing principles, corrections policy, ownership/about, and source methodology URLs.
- Added trust links to the desktop sidebar footer.
- Added trust links to `llms.txt` for AI retrieval systems.
- Added the new trust routes to the middleware public allowlist.

Local verification:

```bash
npm run lint
npm run build
curl -I -A 'Mozilla/5.0 Chrome/131 Safari/537.36' http://localhost:3010/about
curl -I -A 'Mozilla/5.0 Chrome/131 Safari/537.36' http://localhost:3010/editorial-policy
curl -s http://localhost:3010/sitemap.xml | rg 'about|editorial-policy|source-methodology|corrections|ai-disclosure|for-teams'
```

Expected local results after this pass:

- `/about`: `200`
- `/editorial-policy`: `200`
- Sitemap includes all trust URLs.

### 2026-05-24 - Article Pages, Topic Hubs, And Trend Discovery Pass

Completed in the frontend without changing the upstream data model:

- Added stable first-party article pages at `/{lang}/news/{periodId}/{storyId}`.
- Connected feed, news-sitemap, and story links to first-party article URLs where story IDs are available.
- Added topic hubs at `/{lang}/topic/{topic}` with period-aware story discovery.
- Updated the homepage trend index to link trend items into topic hubs using the current period and display query.
- Preserved the existing feed data shape; all changes are routing, metadata, and presentation-layer additions.

This file is the execution base for future SEO and GEO work. It combines:

- local codebase review of `ai-information-hub`
- live crawl checks against production
- `squirrel` surface audit
- agent-team findings from code, live technical SEO, and GEO best-practice research
- official documentation and research sources listed at the end

## Executive Summary

Data Cube AI already has a solid SEO foundation: SSR pages, localized metadata, hreflang on main route families, article pages, topic hubs, JSON-LD, sitemap, News sitemap, Atom feeds, `llms.txt`, and an AI-oriented Markdown summary endpoint.

The current opportunity is not "add more keywords". The highest-leverage work is to keep the site consistently crawlable for humans, bots, AI search crawlers, and framework prefetch requests; then make each item more uniquely citeable through stable first-party URLs, source-backed factual blocks, and stronger publisher trust signals.

Current strongest assets:

- 8-language route architecture: `de`, `en`, `zh`, `fr`, `es`, `pt`, `ja`, `ko`
- localized home, week, article, topic, and tool metadata
- `robots.txt`, `sitemap.xml`, `news-sitemap.xml`, `feed.xml`, `newsletter.xml`, `llms.txt`
- `Organization`, `WebSite`, `FAQPage`, `CollectionPage`, `NewsArticle`, `VideoObject`, `SoftwareApplication`, `BreadcrumbList`, `ItemList` schema support in code
- public Markdown content API at `/api/content-summary`
- public trust pages for about, editorial policy, source methodology, corrections, AI disclosure, and contact

Resolved or partially mitigated from the original audit baseline:

- Public SEO routes now bypass the login gate for humans and crawlers.
- Malformed `Next-Router-Prefetch` requests are handled with a noop response.
- News sitemap strategy now uses first-party article/period URLs instead of many titles pointing at the same week URL.
- Atom feeds are populated from recent day periods and use first-party links.
- AI crawler policy includes newer search/user agents such as `OAI-SearchBot`, `Claude-SearchBot`, `Claude-User`, and `Perplexity-User`.
- Trust pages now exist and are linked from schema and discovery surfaces.

Current remaining risks:

- Topic canonical/hreflang is improved by topic hubs but still needs a canonical topic-entity model with localized slugs.
- A localized tools index at `/{lang}/tools` is still missing while individual tool pages exist.
- Legal pages still require real business/contact placeholder values before high-trust ad/search review.
- Author/editor attribution remains publisher-level; person/team pages would improve E-E-A-T.

## Audit Baseline

### Live Technical Checks

Production checks run on 2026-05-24:

- `https://www.datacubeai.space/` returns `200`.
- `https://datacubeai.space/` redirects to `https://www.datacubeai.space/`.
- `robots.txt`, `sitemap.xml`, `news-sitemap.xml`, `feed.xml`, and `llms.txt` return `200`.
- `sitemap.xml` contains 1282 unique URLs; live auditor reported all returned `HEAD 200`.
- Googlebot and OAI-SearchBot user agents receive content for `/de`.
- Chrome-like first-visit user agent receives `307 -> /login` for `/de`.
- `Next-Router-Prefetch: 1` against `/de` returns `500`.

### Squirrel Surface Audit

Command:

```bash
squirrel audit https://www.datacubeai.space --coverage surface --max-pages 40 --format llm --output /tmp/datacube-squirrel-seo-geo-audit.llm --project-name datacube-ai-space --refresh
```

Baseline score:

- Overall: `52`, grade `F`
- Accessibility: `91`
- Content: `45`
- Crawlability: `79`
- Core SEO: `77`
- Links: `80`
- Performance: `91`
- Images: `93`
- E-E-A-T: `44`
- Security: `90`
- Legal Compliance: `44`
- Internationalization: `100`
- Mobile: `100`
- Structured Data: `100`
- Social Media: `100`
- URL Structure: `100`

Important caveat: many Squirrel errors are downstream effects of the login gate because its browser-like crawl is redirected to `/login`. Fixing the public/gated routing decision should clear many duplicate title, duplicate description, noindex, thin-content, internal-link, and landmark findings.

## Strategic Decisions Before Implementation

These decisions should be made before code work starts.

| Decision | Recommended Default | Why It Matters |
| --- | --- | --- |
| Public SEO content vs login gate | Make SEO routes public to humans and crawlers. Gate only premium/account features. | Avoids crawler/user mismatch and lets organic traffic land on the content it searched for. |
| News article granularity | Stable first-party article URLs are now implemented at `/{lang}/news/{periodId}/{storyId}`. Continue using fragments only as fallback. | Google News sitemap should not list many titles against the same `<loc>`. |
| AI training crawler policy | Allow search/retrieval bots; decide separately on training bots. | `OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot` affect AI search visibility; `GPTBot`, `ClaudeBot`, `Google-Extended`, `CCBot` are training/grounding policy choices. |
| API summary indexation | Keep API crawlable for AI tools but add traditional-search `X-Robots-Tag: noindex, follow`, then create selected static AI summary pages if needed. | Avoids parameterized duplicate Markdown in Google while preserving GEO utility. |
| Google News positioning | Treat Data Cube as an intelligence/briefing publisher unless unique article pages and editorial trust policies are ready. | News surfaces require stronger publisher transparency and article-level URL hygiene. |

## Priority Backlog

### P0 - Routing, Crawlability, And Cloaking Risk

#### SEO-001: Resolve login gate mismatch

Status: implemented for public SEO, trust, and marketing routes on 2026-05-24. Keep this section as regression guidance.

Current files:

- `ai-information-hub/middleware.ts`
- `ai-information-hub/app/login/page.tsx`
- `ai-information-hub/app/login/layout.tsx`
- `ai-information-hub/app/sitemap.ts`

Problem:

- Human browser first visits to public SEO routes can be redirected to `/login`.
- Crawlers and automation are allowed through.
- This creates a visible mismatch between indexed content and user landing experience.

Recommendation:

- Make `/`, `/{lang}`, `/{lang}/week/{periodId}`, `/{lang}/topic/{topic}`, and `/{lang}/tools/{tool}` public to all visitors.
- Keep login only for account, premium, or explicit private routes.
- If business requires the gate, remove gated routes from `sitemap.xml`, set `noindex`, and do not expose them as public SEO targets.

Acceptance criteria:

- Chrome-like first-visit UA gets `200` on `/de`, `/en`, `/en/week/{latest}`, and `/en/tools/ai-news-api`.
- Googlebot, OAI-SearchBot, and ordinary Chrome receive materially the same main content.
- `squirrel audit` no longer reports all sitemap pages resolving to login metadata.

Validation commands:

```bash
curl -I -A 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36' https://www.datacubeai.space/de
curl -I -A 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' https://www.datacubeai.space/de
curl -I -A 'Mozilla/5.0 (compatible; OAI-SearchBot/1.3; +https://openai.com/searchbot)' https://www.datacubeai.space/de
```

#### SEO-002: Fix Next prefetch 500

Status: implemented on 2026-05-24 with a malformed-prefetch noop route/response. Keep this section as regression guidance.

Current files:

- `ai-information-hub/middleware.ts`
- route layouts/pages under `ai-information-hub/app`

Problem:

- `curl -H 'Next-Router-Prefetch: 1' https://www.datacubeai.space/de` returns `500`.
- This can affect in-app navigation, framework prefetch, crawlers that send framework headers, and monitoring tools.

Recommendation:

- Reproduce locally and in production.
- Ensure middleware handles prefetch headers without calling route logic in an invalid context.
- Add a smoke check for localized home with `Next-Router-Prefetch`.

Acceptance criteria:

- `Next-Router-Prefetch: 1` returns non-500 for public SEO routes.
- No redirect to `/login` for public SEO routes.

Validation command:

```bash
curl -I -H 'Next-Router-Prefetch: 1' https://www.datacubeai.space/de
```

### P1 - Indexation And URL Hygiene

#### SEO-003: Rebuild News sitemap strategy

Status: partially implemented. First-party article pages now exist; continue validating that every News sitemap entry uses a unique, visible, first-party URL.

Current files:

- `ai-information-hub/app/news-sitemap.xml/route.ts`
- potentially `ai-information-hub/app/[lang]/week/[weekId]/page.tsx`
- potentially story components and IDs

Problem:

- Live auditor found `news-sitemap.xml` has 160 entries but only 16 unique `<loc>` URLs.
- Many entries reuse the same week page URL with different `news:title`.
- Many titles are truncated with ellipses.

Recommendation options:

1. Preferred: create stable first-party story anchors or story pages, then emit one News sitemap entry per story URL.
2. Short-term: emit one entry per localized period roundup URL, with a roundup title.
3. If neither is ready: stop advertising `news-sitemap.xml` in `robots.txt` until the sitemap is semantically correct.

Acceptance criteria:

- No duplicate `<loc>` entries with different news titles.
- `news:title` matches the visible page title or story headline and is not artificially truncated.
- News sitemap includes only recent eligible news content.

Validation commands:

```bash
curl -s https://www.datacubeai.space/news-sitemap.xml
```

#### SEO-004: Fix Atom feed output and first-party permalinks

Status: partially implemented. Atom feeds now pull recent daily periods and use first-party links; continue monitoring non-empty entries across all 8 languages.

Current files:

- `ai-information-hub/app/feed.xml/route.ts`
- `ai-information-hub/app/newsletter.xml/route.ts`

Problem:

- `feed.xml?lang=en` returned an Atom feed with zero entries during audit.
- `feed.xml` uses external `sourceUrl` as entry alternate link when available.
- Fallback permalink uses `weekIds[0]`, not necessarily the entry period.

Recommendation:

- Build feeds from latest daily period IDs and include actual entries.
- Use first-party URLs as canonical feed entry links: `/{lang}/week/{periodId}#story-{id}` or future article URL.
- Keep external source URLs inside entry content/source fields, not as the main alternate.

Acceptance criteria:

- Each supported language feed has nonzero entries when recent content exists.
- Each entry alternate link points to a Data Cube AI URL.
- Entry IDs are stable across rebuilds.

#### SEO-005: Repair topic canonical/hreflang behavior

Status: partially mitigated. Topic hubs now exist and trend links route into them, but the canonical topic entity model is still open.

Current files:

- `ai-information-hub/app/[lang]/topic/[topic]/page.tsx`
- `ai-information-hub/app/topic/[topic]/page.tsx`
- `ai-information-hub/lib/topic-utils.ts`
- `ai-information-hub/app/sitemap.ts`

Problem:

- Alternate URLs can point to the same slug across all languages even when the translated language has a different canonical topic slug.
- Non-canonical language/slug combinations can return `200` and self-canonical.
- This creates duplicate, orphaned, and semantically mismatched topic pages.

Recommendation:

- Define a canonical topic entity model: one stable topic ID with localized display labels and localized slugs.
- If only `de` and `en` topic data is reliable, do not generate hreflang for unsupported localized equivalents.
- Redirect non-canonical slug variants to canonical slug variants, or canonicalize them to the correct URL.

Acceptance criteria:

- hreflang alternates point to real equivalent topic pages.
- Non-equivalent slug/language pairs do not self-canonical as unique pages.
- Sitemap only includes topic URLs that resolve to meaningful content.

#### SEO-006: Add missing `/[lang]/tools` index page or remove links to it

Status: open. Individual localized tool pages exist, but the parent `/{lang}/tools` route is still missing.

Current files:

- `ai-information-hub/app/[lang]/tools/*/page.tsx`
- new `ai-information-hub/app/[lang]/tools/page.tsx`, if implemented

Problem:

- Tool pages reference `/en/tools`, `/de/tools`, etc. in breadcrumbs/CTAs.
- No matching route is present in the app tree.

Recommendation:

- Add a localized tools index page with all four tools and proper metadata.
- Include it in sitemap.
- Or remove `/[lang]/tools` from breadcrumbs and replace with localized home.

Acceptance criteria:

- `/{lang}/tools` returns `200`.
- Breadcrumb JSON-LD does not point to missing pages.

#### SEO-007: Align sitemap with indexability

Current files:

- `ai-information-hub/app/sitemap.ts`
- `ai-information-hub/app/impressum/page.tsx`
- `ai-information-hub/app/datenschutz/page.tsx`

Problem:

- Legal pages are in sitemap but have noindex-style intent or thin metadata.

Recommendation:

- If legal pages should not rank: remove from sitemap, keep `noindex, follow`.
- If they should rank for trust/legal queries: add full metadata, canonical, and internal footer links.

Acceptance criteria:

- No noindex page appears in `sitemap.xml`.
- Privacy/legal routes have a clear indexation decision.

### P1 - AI Crawler Policy And GEO Access

#### GEO-001: Update robots.txt for current AI search crawlers

Current file:

- `ai-information-hub/public/robots.txt`

Problem:

- Current file includes `GPTBot`, `ChatGPT-User`, `PerplexityBot`, `ClaudeBot`, `anthropic-ai`, `Google-Extended`, `CCBot`.
- It does not include search-specific or user-request agents now documented by OpenAI, Anthropic, and Perplexity.

Recommendation:

- Explicitly allow search/retrieval bots:
  - `OAI-SearchBot`
  - `ChatGPT-User`
  - `PerplexityBot`
  - `Perplexity-User`
  - `Claude-SearchBot`
  - `Claude-User`
  - `Googlebot`
  - `Bingbot`
- Decide separately whether to allow or disallow training/grounding/data crawlers:
  - `GPTBot`
  - `ClaudeBot`
  - `Google-Extended`
  - `CCBot`
  - `anthropic-ai` legacy

Recommended initial policy for visibility:

| Agent | Use | Suggested Rule |
| --- | --- | --- |
| Googlebot | Google Search / AI Overviews discovery | Allow |
| Bingbot | Bing / Copilot ecosystem discovery | Allow |
| OAI-SearchBot | ChatGPT search results | Allow |
| ChatGPT-User | user-triggered ChatGPT fetches | Allow |
| PerplexityBot | Perplexity search/citation index | Allow |
| Perplexity-User | user-triggered Perplexity fetches | Allow |
| Claude-SearchBot | Claude search indexing | Allow |
| Claude-User | user-triggered Claude fetches | Allow |
| GPTBot | OpenAI training | Business decision |
| ClaudeBot | Anthropic training | Business decision |
| Google-Extended | Google Gemini/Vertex training and related controls, not Search indexing | Business decision |
| CCBot | Common Crawl dataset | Business decision |

Acceptance criteria:

- `robots.txt` has explicit groups for search/retrieval bots.
- Each group repeats `/api/`, `/login`, and content-summary policy because robots groups do not inherit from `User-agent: *`.
- `llms.txt` is referenced and reachable.

#### GEO-002: Make `/api/content-summary` useful but not a duplicate-index trap

Current files:

- `ai-information-hub/app/api/content-summary/route.ts`
- `ai-information-hub/next.config.mjs`
- `ai-information-hub/public/robots.txt`
- `ai-information-hub/public/llms.txt`

Problem:

- The endpoint is useful for AI agents.
- It is parameterized and can create many duplicate/thin Markdown URL variants.
- Current `next.config.mjs` reportedly excludes API routes from global noindex behavior for this endpoint.

Recommendation:

- Add `X-Robots-Tag: noindex, follow` for `/api/content-summary`.
- Keep it allowed in `robots.txt` for AI/user agents that fetch direct answers.
- Create selected first-party static/SSR pages if we want AI summary content indexed by Google.

Acceptance criteria:

- Search crawlers can fetch but should not index arbitrary parameterized API responses.
- `llms.txt` examples all use canonical localized URLs and valid current period examples.
- `content-summary` returns useful non-empty content for latest periods.

### P1 - Structured Data And Entity Resolution

#### GEO-003: Give every story a stable first-party identity

Status: implemented at the route layer with `/{lang}/news/{periodId}/{storyId}`. Remaining work is to verify stable story IDs across regenerations and every feed/news sitemap path.

Current files:

- `ai-information-hub/app/[lang]/week/[weekId]/page.tsx`
- `ai-information-hub/app/week/[weekId]/page.tsx`
- `ai-information-hub/components/structured-data.tsx`
- feed and news sitemap routes

Problem:

- Several `NewsArticle` items can share the same week URL.
- AI and search systems need stable item identity to cite a specific story.

Recommendation:

- Prefer the implemented article URLs: `/{lang}/news/{periodId}/{storyId}`.
- Keep stable week-page fragment IDs as fallback anchors: `/{lang}/week/{periodId}#story-tech-{id}`, `#story-investment-{id}`, `#story-tip-{id}`, `#story-video-{id}`.
- Use these IDs in feed, ItemList, NewsArticle `url`, `mainEntityOfPage`, and internal links.

Acceptance criteria:

- Each visible story has a stable `id` attribute.
- JSON-LD item URL matches the visible anchor.
- Feed and future News sitemap use first-party stable links.

#### GEO-004: Strengthen structured data by page type

Current files:

- `ai-information-hub/components/structured-data.tsx`
- `ai-information-hub/app/[lang]/topic/[topic]/page.tsx`
- `ai-information-hub/app/[lang]/week/[weekId]/page.tsx`
- tool pages

Recommendation:

- Week pages:
  - `CollectionPage`
  - `BreadcrumbList`
  - `ItemList`
  - item-level `NewsArticle`/`Article` with stable URLs
  - `VideoObject` for videos
- Topic pages:
  - `CollectionPage`
  - `BreadcrumbList`
  - `ItemList`
  - `about` and `mentions` entities
- Tool pages:
  - `SoftwareApplication`
  - `FAQPage`
  - `BreadcrumbList`
- Organization:
  - point `publishingPrinciples`, `ethicsPolicy`, and future corrections policy to real pages, not homepage
  - add `contactPoint` after contact page exists

Acceptance criteria:

- Rich Results Test / Schema Markup Validator passes with no invalid required fields.
- JSON-LD matches visible content.
- No fake authors, fake reviews, or invisible FAQ content.

### P2 - Publisher Trust, E-E-A-T, And Legal

#### TRUST-001: Add publisher trust pages

Status: mostly implemented. `/about`, `/editorial-policy`, `/source-methodology`, `/corrections`, `/contact`, and `/ai-disclosure` exist; legal placeholder values still need final business data.

Recommended new routes:

- `/about`
- `/editorial-policy`
- `/corrections`
- `/source-methodology`
- `/contact`
- `/ai-disclosure`

Problem:

- Squirrel reports no About page, no Contact page, and weak privacy/legal discovery.
- Current `OrganizationSchema` points `publishingPrinciples` and `ethicsPolicy` to homepage.

Recommendation:

- Create concise trust pages with internal footer links.
- Make them visible from all public pages.
- Reference them in `OrganizationSchema`.

Acceptance criteria:

- Footer links include About, Contact, Privacy, Imprint, Editorial Policy, Corrections.
- `OrganizationSchema.publishingPrinciples` points to `/editorial-policy`.
- `OrganizationSchema.ethicsPolicy` points to `/ai-disclosure` or `/editorial-policy`.
- Privacy/legal pages have either full metadata or intentional noindex and are removed from sitemap.

#### TRUST-002: Add author/editor attribution model

Recommendation:

- For now, use `Data Cube AI Editorial Team` as publisher/editor with a real team/about page.
- Add `reviewedBy` or editor attribution when human review exists.
- Add AI-assistance disclosure explaining the LLM pipeline and human oversight boundaries.

Acceptance criteria:

- Pages show who is responsible for the content.
- JSON-LD author/publisher fields match visible site information.

### P2 - Content And GEO Product Strategy

#### CONTENT-001: Introduce a citeable story block template

Each story should be extractable by LLMs without surrounding context.

Recommended visible structure:

- headline
- 40-80 word direct answer / summary
- `Why it matters`
- `Key facts`
- `Source and date`
- `Uncertainty / caveat`
- external source link
- internal topic links

Recommended JSON/content fields for future pipeline work:

- `headline`
- `summary`
- `why_it_matters`
- `facts[]`
- `entities[]`
- `source_name`
- `source_url`
- `source_published_at`
- `confidence`
- `editorial_note`

Acceptance criteria:

- One story can be cited accurately from its own visible block.
- Key claims include sources and dates.
- AI-generated summaries are not merely rewritten source articles; they add curation, classification, and impact framing.

#### CONTENT-002: Build durable intelligence assets

GEO works best when the site has unique facts and structured assets, not only daily summaries.

Recommended assets:

- AI model release tracker
- AI funding and M&A tracker
- AI policy/regulation tracker
- AI benchmark tracker
- enterprise AI workflow library
- weekly executive intelligence memo archive
- dataset/download page for public curated data

Acceptance criteria:

- Each asset has a stable landing page, schema, update cadence, and internal links from home/week/topic pages.
- Data pages use `Dataset` where appropriate.
- Trackers include source methodology and update timestamps.

### P2 - Social/Sharing And Metadata Completeness

#### SEO-008: Add explicit Twitter metadata on dynamic and tool pages

Status: partially implemented. Localized home, period, and tool pages have page-specific Twitter metadata; continue validating topic, premium, and team pages.

Current files:

- `ai-information-hub/app/[lang]/week/[weekId]/page.tsx`
- `ai-information-hub/app/[lang]/topic/[topic]/page.tsx`
- `ai-information-hub/app/[lang]/tools/*/page.tsx`
- `ai-information-hub/app/for-teams/page.tsx`
- `ai-information-hub/app/premium/page.tsx`

Problem:

- Many pages rely on global static Twitter metadata.

Recommendation:

- Add page-specific Twitter title, description, and image mirroring OG.

Acceptance criteria:

- Inspect rendered head for week/topic/tool pages and verify Twitter card matches the page.

#### SEO-009: Fix `/for-teams` and `/premium` metadata and sitemap status

Current files:

- `ai-information-hub/app/for-teams/page.tsx`
- `ai-information-hub/app/premium/page.tsx`
- `ai-information-hub/app/sitemap.ts`

Recommendation:

- If indexable: add canonical, OG, Twitter, and sitemap entries.
- If not indexable: add `robots: noindex, follow` and keep them out of sitemap.

### P3 - Performance And Accessibility

#### PERF-001: Reduce crawl/render overhead

Findings:

- Public HTML responses show `private, no-cache, no-store`.
- CSS bundle warning around 155 KB.
- Large inline SVG reported by Squirrel.

Recommendation:

- Keep frequently changing pages dynamic, but evaluate caching for tool pages, trust pages, and stable archive pages.
- Externalize or optimize repeated large SVG where it materially affects page weight.
- Measure before changing visual assets.

#### A11Y-001: Fix newsletter/sign-up form labels and contrast

Status: partially implemented. Newsletter forms have associated labels/sr-only labels in the current sidebar/mobile flows; contrast still needs periodic visual and automated audit.

Current files:

- likely `ai-information-hub/components/right-sidebar.tsx`
- newsletter/subscription components

Findings:

- Squirrel reports an email input without label.
- Contrast warnings exist on muted text/buttons.

Acceptance criteria:

- Newsletter email input has visible or `sr-only` label associated with `htmlFor`.
- Automated a11y audit no longer flags unlabeled email input.

## Measurement Plan

### Traditional SEO KPIs

- indexed pages by route group
- Search Console impressions/clicks by route group
- sitemap discovered vs indexed counts
- crawl stats by user-agent
- Core Web Vitals
- top queries and landing pages
- duplicate/canonical warnings

### GEO / AI Search KPIs

Track weekly across Google AI Overviews/AI Mode, ChatGPT Search, Perplexity, Claude, Gemini, and Copilot:

- whether Data Cube AI is cited
- cited URL
- query intent
- competitor sources cited
- whether the final answer uses Data Cube facts, not just links
- sentiment/context of mention
- AI referral traffic where identifiable

Initial query set:

- latest AI model releases
- latest AI funding rounds
- AI investment signals this week
- enterprise AI workflow examples
- best AI news aggregator
- AI newsletter for professionals
- OpenAI vs Anthropic latest updates
- AI regulation updates Europe
- AI agents enterprise workflows
- AI stock tracker
- AI news API
- daily AI intelligence memo

### Bot Access Log Review

If server/CDN logs are available, monitor:

- Googlebot
- Bingbot
- OAI-SearchBot
- ChatGPT-User
- PerplexityBot
- Perplexity-User
- Claude-SearchBot
- Claude-User
- GPTBot
- ClaudeBot
- Google-Extended
- CCBot

Key checks:

- status code distribution
- robots.txt fetch frequency
- blocked/challenged responses
- crawl depth by route group
- whether AI bots can fetch `llms.txt` and `content-summary`

## Recommended Implementation Sequence

1. Decide public/gated content policy.
2. Fix middleware so public SEO routes return the same content to humans and crawlers.
3. Fix `Next-Router-Prefetch` 500.
4. Update AI crawler `robots.txt` policy and `llms.txt` canonical examples.
5. Fix Atom feeds to emit first-party entries.
6. Rework or disable News sitemap until URL granularity is correct.
7. Add `/[lang]/tools` index page or remove broken references.
8. Clean sitemap/indexability mismatches.
9. Fix topic canonical/hreflang model.
10. Add stable story anchors and first-party permalinks.
11. Strengthen page-type JSON-LD.
12. Add trust pages and wire them into schema/footer.
13. Add explicit Twitter metadata for dynamic and tool pages.
14. Add GEO story-block content template.
15. Establish weekly AI citation monitoring.

## Validation Checklist Before Shipping Each Batch

Run locally:

```bash
cd ai-information-hub
npm run lint
npm run build
```

Run backend checks if API/newsletter code changes:

```bash
cd ai-hub-backend
venv312/bin/ruff check app/ scripts/
python3 -m py_compile app/services/newsletter_sender.py
```

Run live checks after deploy:

```bash
curl -I https://www.datacubeai.space/de
curl -I -A 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' https://www.datacubeai.space/de
curl -I -A 'Mozilla/5.0 (compatible; OAI-SearchBot/1.3; +https://openai.com/searchbot)' https://www.datacubeai.space/de
curl -I -H 'Next-Router-Prefetch: 1' https://www.datacubeai.space/de
curl -s https://www.datacubeai.space/robots.txt
curl -s https://www.datacubeai.space/sitemap.xml
curl -s https://www.datacubeai.space/news-sitemap.xml
curl -s 'https://www.datacubeai.space/feed.xml?lang=en'
curl -s https://www.datacubeai.space/llms.txt
```

Run audit:

```bash
squirrel audit https://www.datacubeai.space --coverage surface --max-pages 40 --format llm --project-name datacube-ai-space --refresh
```

Target scores:

- after P0/P1 technical fixes: Squirrel overall >= 85
- after trust/content/schema work: Squirrel overall >= 90
- after full SEO/GEO program: Squirrel overall >= 95 on full coverage, with documented exceptions only

## Source Notes

Primary/official sources consulted:

- Google Search Central: [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- Google Search Central Blog: [Top ways to ensure your content performs well in Google's AI experiences on Search](https://developers.google.com/search/blog/2025/05/succeeding-in-ai-search)
- Google Search Central: [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- Google Search Central: [Consolidate duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- Google Search Central: [News sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap)
- Google Search Central: [Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
- OpenAI: [Overview of OpenAI Crawlers](https://developers.openai.com/api/docs/bots)
- Anthropic: [Does Anthropic crawl data from the web?](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
- Perplexity: [Perplexity crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)
- Princeton / KDD 2024: [GEO: Generative Engine Optimization](https://collaborate.princeton.edu/en/publications/geo-generative-engine-optimization/)
- arXiv: [GEO: Generative Engine Optimization](https://arxiv.org/abs/2311.09735)
- arXiv: [From Citation Selection to Citation Absorption](https://arxiv.org/abs/2604.25707)
- arXiv: [Measuring Google AI Overviews](https://arxiv.org/abs/2605.14021)

Research interpretation:

- Google says AI Overviews/AI Mode do not have special technical requirements beyond eligibility for Search and snippets. For Data Cube AI, the practical implication is that crawlability, canonicalization, content quality, and trust still come first.
- GEO research supports adding citations, statistics, clear structure, and source-backed evidence, but it is not a fixed ranking formula. Treat it as a testing framework and monitor actual AI citations over time.
