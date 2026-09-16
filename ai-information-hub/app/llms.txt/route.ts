import { AI_DISCLOSURE_PATH, aiLabel } from '@/lib/ai-label'
import { BRAND } from '@/lib/brand'

// Site description for AI crawlers, generated from the brand config at build time (spec AD1).
export const dynamic = 'force-static'

function llmsText(): string {
  const site = BRAND.siteUrl
  return `# ${BRAND.name}

> Multilingual (DE, EN, ZH, FR, ES, PT, JA, KO) daily AI news aggregator curating tech breakthroughs,
> investment news, practical tips, and YouTube videos from 35+ sources.
>
> ${aiLabel('en')} How we use AI: ${site}${AI_DISCLOSURE_PATH}

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

Topic hubs collect related period stories.
Topic canonical format: ${site}/{lang}/topic/{topic}
Filtered variants (?period=, ?section=, ?page=, ?q=) are views of that canonical
page: excluded in robots.txt and marked noindex — cite the canonical URL.

## Languages
English (en) — default | German (de) | Chinese (zh) | French (fr) | Spanish (es) | Portuguese (pt) | Japanese (ja) | Korean (ko)

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
