# DataCube AI Information Hub

Bilingual (DE/EN) daily + weekly AI news aggregator for internal teams — curates tech breakthroughs, investment news, practical tips, and **YouTube videos** from RSS feeds + Hacker News + YouTube. Built with Next.js 16 + React 19 + Tailwind CSS 4 + Shadcn/ui, deployed on Vercel.

**Status**: Core app complete with Railway backend integration. Supports 3 feed types + YouTube videos, bilingual, daily + weekly navigation, dark/light theme, AI report generator (streaming + multi-format export), accessibility audited (Web Interface Guidelines), design overhauled with distinctive visual identity (Instrument Serif display font, section-specific accents, staggered animations, shimmer skeletons), UI/UX quality audit applied, Extended FAB buttons for discoverability. **No authentication required**.

---

## Quick Reference for AI Assistants

**Most important files to understand the codebase:**

| File | Purpose |
|------|---------|
| `lib/types.ts` | All TypeScript interfaces (includes video fields) |
| `lib/api.ts` | API client with static JSON fallback |
| `lib/period-utils.ts` | Period ID utilities (daily/weekly detection, labels) |
| `lib/settings-context.tsx` | Theme + language state, `t()` translation function |
| `components/feeds/tech-feed.tsx` | Reference implementation (API + video support) |
| `components/video-embed.tsx` | YouTube embed component (uses `next/image`) |
| `components/structured-data.tsx` | JSON-LD schemas (NewsArticle, Video, NewsMediaOrganization, FAQ, Breadcrumb) |
| `components/chat-widget.tsx` | Chat UI + API-first week data fetching |
| `app/api/chat/route.ts` | Chat assistant API (uses aurora-alpha) |
| `app/api/report/route.ts` | AI report generator API (uses aurora-alpha, streams structured report) |
| `components/report-generator.tsx` | Report UI: Extended FAB button, overlay, streaming Markdown + GFM tables (remark-gfm), export (DOCX/HTML/MD/TXT/JSON) |
| `app/week/[weekId]/page.tsx` | SSR week page (Server Component, SEO) |
| `app/feed.xml/route.ts` | Atom 1.0 feed (bilingual) |
| `app/api/content-summary/route.ts` | Markdown summary API (GEO) |
| `middleware.ts` | Login gate with crawler UA bypass |
| `app/impressum/page.tsx` | Legal notice / Impressum (DDG §5, **placeholders need filling**) |
| `app/datenschutz/page.tsx` | Privacy policy / Datenschutzerklärung (GDPR, **placeholders need filling**) |
| `../ai-hub-backend/` | FastAPI backend (Railway deployment) |

**Key patterns:**
- SPA components use `"use client"` — client-side rendering
- SSR page (`/week/[weekId]`) is a **Server Component** — full HTML for crawlers
- Data loading: API first (`NEXT_PUBLIC_API_URL`), fallback to static JSON
- Translation: `const { t } = useSettings(); t("keyName")`
- Period ID format: weekly `YYYY-kwWW` (e.g., `2026-kw05`) or daily `YYYY-MM-DD` (e.g., `2026-02-07`)
- **Login gate** — first-time visitors see welcome page; crawlers bypass via UA detection

---

## Architecture

```
┌─────────────────── Railway Backend ─────────────────────┐
│                                                          │
│  ai-hub-backend/ (FastAPI + PostgreSQL)                  │
│       ↓                                                  │
│  Data Sources:                                           │
│    • RSS Feeds (22 sources)                              │
│    • Hacker News (Algolia API)                           │
│    • YouTube (Data API v3)                               │
│       ↓                                                  │
│  LLM Processing (OpenRouter):                            │
│    • Classifier: glm-4.5-air:free                        │
│    • Processor: deepseek-v3.2                            │
│       ↓                                                  │
│  REST API: /api/tech/{periodId}, /api/tips/{periodId}... │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌─────────────────── Frontend (Vercel) ───────────────────┐
│                                                          │
│  Middleware: crawler UA detection → bypass login gate     │
│       ↓                                                  │
│  SPA (main page, "use client"):                          │
│    • Feed components (tech, investment, tips)             │
│    • Chat widget + Chat API (aurora-alpha)                │
│    • AI Report generator (aurora-alpha → DOCX/HTML/MD)   │
│       ↓                                                  │
│  SSR Pages (Server Components, SEO/GEO):                 │
│    • /week/[weekId] — HTML + JSON-LD (ISR 1h)            │
│    • /feed.xml — Atom 1.0 (DE/EN)                        │
│    • /api/content-summary — Markdown summary             │
│    • /llms.txt — AI crawler site description              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Content Distribution

| Section | Source | Per Week | Per Day |
|---------|--------|----------|---------|
| **Tech** | HN + RSS | ~20-25 posts + 5 videos | 10 posts + 2 videos |
| **Investment** | RSS feeds | Primary/Secondary/M&A | 5 entries |
| **Tips** | Reddit + Simon Willison | 10 DE + 10 EN | 5 tips |

---

## Directory Structure

```
ai-information-hub/           # Frontend (Next.js)
├── app/
│   ├── api/
│   │   ├── auth/             # Auth API (disabled)
│   │   ├── chat/             # Chat assistant (aurora-alpha)
│   │   ├── report/           # AI report generator (aurora-alpha)
│   │   └── content-summary/  # Markdown summary API (GEO)
│   ├── feed.xml/             # Atom 1.0 feed route (DE/EN)
│   ├── week/[weekId]/        # SSR week pages (Server Component)
│   ├── login/                # Welcome gate page
│   ├── page.tsx              # Main SPA page
│   ├── layout.tsx            # Root layout (feed discovery links)
│   └── sitemap.ts            # Dynamic sitemap (/week/ routes)
├── components/
│   ├── feeds/
│   │   ├── tech-feed.tsx     # With video support
│   │   ├── investment-feed.tsx
│   │   └── tips-feed.tsx
│   ├── video-embed.tsx       # YouTube player (next/image)
│   ├── report-generator.tsx  # AI report UI + export (DOCX/HTML/MD/TXT/JSON)
│   ├── structured-data.tsx   # JSON-LD schemas
│   └── ...
├── lib/
│   ├── api.ts                # API client with fallback
│   ├── types.ts              # Includes video fields
│   └── ...
├── middleware.ts             # Login gate + crawler UA bypass
├── public/
│   ├── data/                 # Static JSON fallback
│   ├── llms.txt              # AI crawler site description
│   └── robots.txt            # Crawler rules + crawl-delay
└── .env.local                # API keys

ai-hub-backend/               # Backend (FastAPI)
├── app/
│   ├── main.py               # FastAPI entry
│   ├── config.py             # Environment config
│   ├── database.py           # PostgreSQL
│   ├── models/               # SQLAlchemy models
│   │   └── raw.py            # Raw article/video storage
│   ├── routers/              # API endpoints
│   │   └── admin.py          # Collection triggers
│   └── services/
│       ├── collector.py      # 4-stage pipeline
│       ├── rss_fetcher.py
│       ├── hn_fetcher.py
│       ├── youtube_fetcher.py
│       └── llm_processor.py  # Two-model approach
├── alembic/                  # DB migrations
├── scripts/
│   ├── init_db.py            # Database setup
│   ├── daily_collect.py      # Daily cron script
│   └── weekly_collect.py     # Weekly collection script
├── Dockerfile
├── railway.toml
└── requirements.txt
```

---

## LLM Models

| Purpose | Model | Notes |
|---------|-------|-------|
| **Classification** | `z-ai/glm-4.5-air:free` | Free tier, classifies articles |
| **Content Processing** | `deepseek/deepseek-v3.2` | Tech, investment, tips, videos |
| **Chat Assistant** | `openrouter/aurora-alpha` | OpenRouter |
| **Report Generator** | `openrouter/aurora-alpha` | OpenRouter |

---

## Data Collection Pipeline

The backend uses a 4-stage pipeline:

```
Stage 1: Fetch raw data (RSS, HN, YouTube) + ISO week boundary filter
    ↓
Stage 2: Classify articles (LLM: glm-4.5-air:free)
    • Tips sources (Reddit, Simon Willison) → skip classification
    • Tech/Investment sources → LLM classification with relevance score
    ↓
Stage 3: Parallel LLM processing (deepseek-v3.2)
    • Tech articles → 20 posts (select from top 40 by relevance)
    • Investment articles → primary/secondary/M&A (max 7 each)
    • Tips articles → 10 tips per language
    • Videos → 5 video summaries
    ↓
Stage 4: Save to PostgreSQL (videos interspersed at positions 3,8,13,18,23)
```

> 📖 **For complete data pipeline documentation with detailed flow diagrams**, see [ai-hub-backend/README.md](../ai-hub-backend/README.md#complete-data-pipeline-deep-dive)

---

## API Endpoints (Railway Backend)

**Production URL**: `https://api-production-3ee5.up.railway.app`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/weeks` | GET | List periods (weeks with nested days) |
| `/api/weeks/current` | GET | Current period |
| `/api/tech/{periodId}` | GET | Tech feed (with videos) |
| `/api/investment/{periodId}` | GET | Investment feed |
| `/api/tips/{periodId}` | GET | Tips feed |
| `/api/trends/{periodId}` | GET | Trends |
| `/api/videos/{periodId}` | GET | Videos only |
| `/api/admin/collect` | POST | Full collection (requires API key) |
| `/api/admin/collect/fetch` | POST | Stage 1 only |
| `/api/admin/collect/process` | POST | Stages 2-4 only |

---

## Commands

### Frontend
```bash
npm run dev              # Dev server at localhost:3000
npm run build            # Production build
vercel --prod            # Deploy to Vercel
```

### Backend (Local Development)
```bash
cd ../ai-hub-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Initialize database
python -m scripts.init_db --migrate-all

# Run server
uvicorn app.main:app --reload   # http://localhost:8000/docs
```

### Data Collection
```bash
# Full collection
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect?period_id=2026-02-07" \
  -H "X-API-Key: $ADMIN_API_KEY"

# Process only (reuse existing raw data)
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect/process?period_id=2026-kw05" \
  -H "X-API-Key: $ADMIN_API_KEY"
```

---

## Environment Variables

### Frontend (.env.local)
```bash
OPENROUTER_API_KEY=sk-or-v1-...
YOUTUBE_API_KEY=AIza...
NEXT_PUBLIC_API_URL=https://api-production-3ee5.up.railway.app/api
```

### Backend (Railway)
```bash
DATABASE_URL=postgresql://...  # Set by Railway
OPENROUTER_API_KEY=sk-or-v1-...
YOUTUBE_API_KEY=AIza...
ADMIN_API_KEY=<set-in-railway-dashboard>
CORS_ORIGINS=["http://localhost:3000","https://www.datacubeai.space","https://ai-information-hub.vercel.app"]
PORT=8080
```

---

## Common Development Tasks

### Add video support to a component
1. Import `VideoEmbed` from `@/components/video-embed`
2. Check `post.isVideo && post.videoId`
3. Render `<VideoEmbed videoId={post.videoId} ... />`

### Switch from static JSON to API
1. Set `NEXT_PUBLIC_API_URL` environment variable
2. Components automatically use API with fallback (feeds + chat widget)

### Deploy to production
```bash
# Frontend (Vercel)
vercel --prod

# Backend (Railway)
cd ../ai-hub-backend
railway up
```

---

## Backward Compatibility

The frontend works in two modes:
1. **With API**: Set `NEXT_PUBLIC_API_URL` → fetches from Railway
2. **Without API**: Falls back to static `/data/{weekId}/*.json`

Video posts only appear when using the new backend (static JSON doesn't include videos).

---

## Landing Page Gate

First-time visitors are redirected to `/login` (welcome page). After clicking "Enter", a `visited` cookie is set (30-day expiration) and users can access the main content.

**Flow:**
1. User visits `/` → redirected to `/login` (if no `visited` cookie)
2. User clicks "Enter" → cookie set, redirected to `/`
3. Subsequent visits → direct access to main page

**Crawler bypass:** Search engine bots (Googlebot, Bingbot, etc.), AI crawlers (GPTBot, ClaudeBot, PerplexityBot), and social media preview bots (Facebook, Twitter, Slack, etc.) are detected via User-Agent and bypass the login gate entirely.

**No password required** - this is a welcome gate, not authentication.

---

## SEO & GEO

The site includes dedicated SEO and Generative Engine Optimization features:

| Feature | Path | Purpose |
|---------|------|---------|
| SSR Week Pages | `/[lang]/week/[weekId]` | Full HTML + JSON-LD for crawlers (ISR 1h) |
| Topic Pages | `/[lang]/topic/[topic]` | Language-specific slugs, SSR for crawlers only |
| Atom Feed | `/feed.xml?lang=de\|en` | Atom 1.0 feed, latest 2 weeks of tech posts |
| Content Summary | `/api/content-summary?lang=de\|en` | Markdown summary for AI systems |
| llms.txt | `/llms.txt` | AI crawler site description + authority info + citation format |
| Sitemap | `/sitemap.xml` | Pruned (~80 URLs): core pages + top 30 topics/lang + period pages |
| Structured Data | On SSR pages | NewsArticle + VideoSchema + BreadcrumbList + NewsMediaOrganization |
| Localized Meta | Homepage + all pages | Title, description, OG tags localized per language (DE/EN) |
| Hreflang | Homepage + week pages | DE/EN + x-default (topic pages use self-referencing canonical) |
| Prev/Next Nav | `/[lang]/week/[weekId]` | Internal linking between adjacent weeks/days |
| Preconnect | Layout head | Resource hints for Railway API + YouTube |
| Image Optimization | `next/image` | YouTube thumbnails, first video fetchPriority="high" |
| Impressum | `/impressum` | Legal notice (DDG §5) — **placeholders need filling** |
| Datenschutz | `/datenschutz` | Privacy policy (GDPR) — **placeholders need filling** |

### Accessibility (Web Interface Guidelines)

All page components pass a Web Interface Guidelines audit (2026-02-10), with UI/UX quality fixes applied (2026-02-11):

- **Focus-visible**: All interactive elements (links, buttons) have `focus-visible:ring-2` styles
- **aria-hidden**: All decorative icons (Lucide) marked `aria-hidden="true"` — including video-embed stats icons and chat widget FAB/spinner
- **prefers-reduced-motion**: Login page animations and FAB expand/collapse respect `prefers-reduced-motion: reduce`
- **No transition-all**: Explicit transition properties only (e.g. `transition-opacity`, `transition-[color,background-color,border-color,transform]`)
- **Image dimensions**: `<img>` tags include explicit `width`/`height` to prevent CLS
- **tabular-nums**: Financial tables AND stock data cards (prices, changes, market cap) use `tabular-nums`
- **scroll-margin-top**: Topic page anchor targets use `scroll-mt-20` for hash navigation
- **Touch targets**: All navigation buttons meet 44px minimum (week nav prev/next, chat widget controls)
- **Skip link**: `#main-content` target on main content container, skip link in layout
- **Mobile bottom padding**: `pb-16 md:pb-0` prevents mobile bottom nav from overlapping feed content
- **cursor-pointer**: All hoverable feed cards have `cursor-pointer` for interaction feedback

### Design System (2026-02-10, refined 2026-02-11)

The frontend uses a distinctive visual identity with section-specific theming:

- **Typography**: Instrument Serif (`font-display`) for all section headers, week nav title, chat title, and trends heading; Geist for body; Geist Mono for code
- **Section accents**: Each feed type has a unique color — tech (blue/primary), investment (amber `--invest-accent`), tips (emerald `--tips-accent`), video (coral `--video-accent`)
- **Section headers**: Gradient backgrounds via `.section-header-tech/invest/tips` CSS classes with `border-l-4` accent borders, `font-display` serif headings
- **Card hover**: Section-colored hover states — `hover:bg-tech-accent/5`, `hover:bg-invest-accent/5`, `hover:bg-tips-accent/5` (consistent across all feeds)
- **Card entrance**: Staggered `animate-fade-up` with 50ms delay per card (max 10)
- **Loading skeletons**: Shimmer effect via `animate-shimmer` class (replaces `animate-pulse` everywhere)
- **Impact borders**: Tech cards have left borders colored by impact level (critical=red, high=orange, medium=blue)
- **Trend rankings**: Right sidebar shows numbered (1-10) rankings with large semi-transparent index numbers (display only, non-clickable)
- **Mobile nav**: Active tab has scale animation + colored dot indicator
- **Ambient gradient**: Subtle brand color wash (`from-primary/[0.02]`) at top of main app for login→app visual continuity
- **Sidebar**: Active nav items have `border-l-[3px]` indicator; combined `transition-[color,background-color,border-color,transform]` for smooth animations; logo uses `from-primary to-accent` gradient
- **Share**: `active:scale-95` press animation; right-aligned popup menu to prevent viewport overflow
- **Week nav**: Fade edge masks on scrollable area, enhanced current-period highlighting
- **Extended FABs**: Report (bottom-left) and Chat (bottom-right) buttons use Material Design Extended FAB pattern — pill-shaped with icon + text label on first visit, auto-collapse to 56px circles after 4s, re-expand on desktop hover. Shared `localStorage("fab-seen")` key. Mobile capped at `max-w-[140px]`, desktop `max-w-[180px]`. Chat FAB uses `flex-row-reverse` for text-left/icon-right layout

### SEO Metadata Patterns

- **Layout template**: `%s | DataCube AI` — child pages should NOT include "| DataCube AI" in their title
- **Homepage**: Uses `title: { absolute: '...' }` to bypass template (includes brand in title itself)
- **Week pages**: Localized titles — `KI-News KW 06` (DE) / `AI News KW 06` (EN)
- **Topic pages**: Language-specific slugs — `/de/topic/nvidia-trainiert-roboter` vs `/en/topic/nvidia-trains-robots` (SSR for crawlers only)
- **Sitemap**: No parameterized URLs (`?section=`, `?period=`), no `feed.xml`, top 30 topics per language
