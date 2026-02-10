# DataCube AI Space

This repository contains multiple projects:

- **[ai-information-hub/CLAUDE.md](./ai-information-hub/CLAUDE.md)** - Frontend (Next.js + Vercel)
- **[ai-hub-backend/README.md](./ai-hub-backend/README.md)** - Backend API (FastAPI + Railway)

---

## Documentation Guidelines

When asked to "update documentation", this means **all** relevant documentation files across the entire repository — not just `CLAUDE.md`. Always check and update:

| File | Purpose |
|------|---------|
| `CLAUDE.md` (root) | Root project instructions for AI assistants |
| `ai-information-hub/CLAUDE.md` | Frontend-specific instructions |
| `README.md` (root) | Project overview for humans |
| `ai-information-hub/README.md` | Frontend README |
| `ai-hub-backend/README.md` | Backend README with pipeline docs |
| `.ai-collab/context/project-overview.md` | Shared AI collaboration context |
| `.ai-collab/context/codebase-map.md` | Repository structure map |

Keep all documentation in sync. When a feature changes (e.g., weekly → daily, new endpoints, new scripts), propagate the update to **every** file that references it.

---

## AI Information Hub (Quick Reference)

Bilingual (DE/EN) daily + weekly AI news aggregator with **YouTube video integration**. Curates tech breakthroughs, investment news, practical tips, and videos from RSS feeds + Hacker News + YouTube.

**Stack**: Next.js 16 + React 19 + Tailwind CSS 4 + Shadcn/ui (Frontend) | FastAPI + PostgreSQL (Backend)

**Status**: Full-stack implementation complete with Railway backend. SEO/GEO optimized, legal pages added, engagement UI (newsletter, Ko-fi, share), accessibility audited (Web Interface Guidelines). **No authentication required**.

---

## Architecture

```
┌─────────────────── Backend (Railway) ───────────────────┐
│                                                          │
│  ai-hub-backend/ (FastAPI + PostgreSQL)                  │
│       ↓                                                  │
│  Data Sources:                                           │
│    • RSS Feeds (22 sources)                              │
│    • Hacker News (Algolia API)                           │
│    • YouTube (Data API v3)                               │
│       ↓                                                  │
│  LLM Processing (OpenRouter):                            │
│    • Classifier: glm-4.5-air:free (classification)       │
│    • Processor: deepseek-v3.2 (content generation)       │
│       ↓                                                  │
│  PostgreSQL Database                                     │
│       ↓                                                  │
│  REST API: /api/tech, /api/investment, /api/tips...      │
│                                                          │
└──────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────── Frontend (Vercel) ───────────────────┐
│                                                          │
│  ai-information-hub/ (Next.js)                           │
│       ↓                                                  │
│  SPA (main page):                                        │
│    • Feed components (tech, investment, tips)             │
│    • Chat widget (week context for LLM)                  │
│    • Chat Assistant: glm-4.5-air:free                    │
│       ↓                                                  │
│  SSR pages (SEO/GEO):                                    │
│    • /week/[weekId] — full HTML + JSON-LD structured data│
│    • /feed.xml — Atom 1.0 feed (DE/EN)                   │
│    • /api/content-summary — Markdown for AI consumption  │
│    • /llms.txt — AI crawler site description              │
│    • /impressum — Legal notice (DDG §5)                  │
│    • /datenschutz — Privacy policy (GDPR)                │
│                                                          │
│  Middleware: crawlers bypass login gate via UA detection  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
DataCube_AI_Space/
├── ai-information-hub/       # Frontend (Next.js)
│   ├── app/                  # Pages + API routes
│   │   ├── api/
│   │   │   ├── chat/         # Chat assistant (glm-4.5-air:free)
│   │   │   └── content-summary/  # Markdown summary API (GEO)
│   │   ├── [lang]/            # Localized routes (DE/EN)
│   │   │   ├── page.tsx       # Localized homepage (meta tags per language)
│   │   │   ├── week/[weekId]/ # Localized week pages
│   │   │   └── topic/[topic]/ # Topic pages (lang-specific slugs)
│   │   ├── feed.xml/         # Atom 1.0 feed route
│   │   ├── impressum/        # Legal notice (DDG §5)
│   │   ├── datenschutz/      # Privacy policy (GDPR)
│   │   └── week/[weekId]/    # SSR week pages (SEO)
│   ├── components/           # React components
│   │   ├── feeds/            # Feed components
│   │   └── video-embed.tsx   # YouTube player (next/image)
│   ├── lib/                  # Utils, types, API client
│   ├── middleware.ts         # Login gate + crawler bypass
│   ├── public/
│   │   ├── data/             # Static JSON fallback
│   │   ├── llms.txt          # AI crawler site description
│   │   └── robots.txt        # Crawler rules
│   └── .env.local            # API keys
│
└── ai-hub-backend/           # Backend (FastAPI)
    ├── app/
    │   ├── models/           # SQLAlchemy models
    │   ├── routers/          # API endpoints
    │   └── services/         # Business logic
    │       ├── collector.py  # 4-stage pipeline
    │       ├── youtube_fetcher.py
    │       └── llm_processor.py
    ├── alembic/              # DB migrations
    ├── scripts/              # CLI tools
    ├── Dockerfile
    └── railway.toml
```

---

## Data Collection Pipeline

The backend uses a 4-stage pipeline:

| Stage | Description |
|-------|-------------|
| **Stage 1** | Fetch raw data (RSS, HN, YouTube) + period boundary filter (daily or weekly) |
| **Stage 2** | Classify articles (tips sources skip classification) |
| **Stage 3** | Parallel LLM processing (tech, investment, tips, videos) |
| **Stage 4** | Save to PostgreSQL |

**Tips sources** (14 Reddit communities + 2 blogs) bypass LLM classification and are processed directly as tips.

> 📖 **For detailed data pipeline documentation with complete flow diagrams**, see [ai-hub-backend/README.md](./ai-hub-backend/README.md#complete-data-pipeline-deep-dive)

---

## Quick Commands

### Frontend
```bash
cd ai-information-hub
npm run dev                   # Dev server :3000
vercel --prod                 # Deploy to production
```

### Backend (Local)
```bash
cd ai-hub-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m scripts.init_db --migrate-all
uvicorn app.main:app --reload   # API docs: :8000/docs
```

### Data Collection
```bash
# Daily collection (automated via Railway cron at 22:00 UTC)
python -m scripts.daily_collect              # Collect today
python -m scripts.daily_collect --date 2026-02-07  # Specific date

# Weekly collection (full week at once)
python -m scripts.weekly_collect             # Current week
python -m scripts.weekly_collect --week 2026-kw05   # Specific week

# Via API (set ADMIN_API_KEY env var or use Railway dashboard value)
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect?period_id=2026-02-07" \
  -H "X-API-Key: $ADMIN_API_KEY"

# Process only (reuse raw data)
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect/process?period_id=2026-kw05" \
  -H "X-API-Key: $ADMIN_API_KEY"

# M&A only (reprocess M&A without affecting other sections)
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect/ma?period_id=2026-kw05" \
  -H "X-API-Key: $ADMIN_API_KEY"
```

### Period ID Format
- **Daily**: `YYYY-MM-DD` (e.g., `2026-02-07`)
- **Weekly**: `YYYY-kwWW` (e.g., `2026-kw05`)

Daily collections produce reduced output counts (10 tech, 5 tips, 5 investment, 2 videos) compared to weekly.

---

## Environment Variables

### Frontend (.env.local)
```bash
OPENROUTER_API_KEY=sk-or-v1-...
YOUTUBE_API_KEY=AIza...
NEXT_PUBLIC_API_URL=https://api-production-3ee5.up.railway.app/api
```

### Backend (.env or Railway)
```bash
DATABASE_URL=postgresql://...
OPENROUTER_API_KEY=sk-or-v1-...
YOUTUBE_API_KEY=AIza...
POLYGON_API_KEY=...              # Polygon.io API for real-time stock data
ADMIN_API_KEY=<set-in-railway-dashboard>
CORS_ORIGINS=["http://localhost:3000","https://www.datacubeai.space","https://ai-information-hub.vercel.app"]
```

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/weeks` | List periods (weeks with nested days) |
| `GET /api/tech/{periodId}` | Tech + videos |
| `GET /api/investment/{periodId}` | Investment |
| `GET /api/tips/{periodId}` | Tips |
| `GET /api/videos/{periodId}` | Videos only |
| `GET /api/stock/{ticker}` | Real-time stock data (Polygon.io) |
| `GET /api/stock/batch/?tickers=AAPL,NVDA` | Batch stock data |
| `GET /api/stock/formatted/{ticker}?language=en` | Pre-formatted stock data |
| `POST /api/admin/collect` | Full collection |
| `POST /api/admin/collect/process` | Reprocess raw data |
| `POST /api/admin/collect/ma` | M&A-only reprocessing |

---

## Deployment

**Frontend**: Vercel
- Production: https://www.datacubeai.space
- Deploy: `vercel --prod`

**Backend**: Railway
- Production: https://api-production-3ee5.up.railway.app
- Deploy: `railway up`

---

## LLM Models

| Purpose | Model | Provider |
|---------|-------|----------|
| Classification | `z-ai/glm-4.5-air:free` | OpenRouter (free) |
| Content Processing | `deepseek/deepseek-v3.2` | OpenRouter |
| Chat Assistant | `z-ai/glm-4.5-air:free` | OpenRouter (free) |

---

## Claude-Codex Collaboration Protocol

### Overview
`.ai-collab/` is an interaction platform for asynchronous collaboration between Claude and Codex CLI.

### Directory Structure
```
.ai-collab/
├── requests/     # Claude → Codex task requests
├── responses/    # Codex → Claude task responses
├── context/      # Shared project context
└── archive/      # Completed task archives
```

### Usage

**1. Create Request File**:
Filename format: `YYYYMMDD-HHMMSS-{type}-{brief}.md`

Types: `review` | `fix` | `explore` | `generate` | `refactor` | `test`

```markdown
# Request: Review collector.py error handling

**Type**: review
**Priority**: High
**Status**: PENDING

## Task Description
Review error handling in collector.py stage1_fetch_and_store function.

## Target Files
- `ai-hub-backend/app/services/collector.py`

## Expected Output
List of issues with line numbers and severity.
```

**2. Execute with Codex**:
```bash
codex exec --skip-git-repo-check -s read-only \
  -o .ai-collab/responses/20260203-143000-review-collector-response.md \
  "Read .ai-collab/requests/20260203-143000-review-collector.md and execute the task."
```

**3. Read Response**:
Response file will be created at `.ai-collab/responses/`

### Response Statuses
- `COMPLETED` - Task finished successfully
- `NEEDS_INPUT` - Codex needs more information from Claude
- `FAILED` - Task could not be completed

### Best Practices
- Check `context/` files for shared project knowledge
- Keep requests focused on single tasks
- Archive completed request/response pairs to `archive/`

See `.ai-collab/README.md` for full protocol documentation.

---

## Growth Strategy & Manual Action Items

Detailed strategy reports and a manual action checklist are in `.ai-collab/context/`:

| File | Description |
|------|-------------|
| `manual-action-checklist.md` | **Prioritized TODO list** of manual tasks (legal, monetization, social media, newsletter) |
| `seo-geo-strategy.md` | SEO & GEO optimization strategy with 25 actions |
| `traffic-growth-strategy.md` | Channel-by-channel traffic growth plan |
| `monetization-strategy.md` | 4-phase revenue roadmap (EUR 50/mo → EUR 8,500/mo) |
| `feature-roadmap.md` | 25 features across 3 phases with tech architecture |

**Next manual steps** (see `manual-action-checklist.md` for full list):
1. Fill Impressum + Datenschutz placeholder values (`[brackets]`)
2. Register EthicalAds, Ko-fi, affiliate programs (Notion AI, Jasper, Copy.ai)
3. Create Beehiiv newsletter account, replace localStorage form with API
4. Set up LinkedIn personal brand + Twitter/X + Telegram channel
5. Submit "Show HN" post (month 2)
