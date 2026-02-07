# DataCube AI Space

This repository contains multiple projects:

- **[ai-information-hub/CLAUDE.md](./ai-information-hub/CLAUDE.md)** - Frontend (Next.js + Vercel)
- **[ai-hub-backend/README.md](./ai-hub-backend/README.md)** - Backend API (FastAPI + Railway)

---

## AI Information Hub (Quick Reference)

Bilingual (DE/EN) weekly AI news aggregator with **YouTube video integration**. Curates tech breakthroughs, investment news, practical tips, and videos from RSS feeds + Hacker News + YouTube.

**Stack**: Next.js 16 + React 19 + Tailwind CSS 4 + Shadcn/ui (Frontend) | FastAPI + PostgreSQL (Backend)

**Status**: Full-stack implementation complete with Railway backend. **No authentication required**.

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
│   │   ├── feed.xml/         # Atom 1.0 feed route
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
| **Stage 1** | Fetch raw data (RSS, HN, YouTube) + ISO week boundary filter |
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
# Via API (set ADMIN_API_KEY env var or use Railway dashboard value)
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect?week_id=2026-kw05" \
  -H "X-API-Key: $ADMIN_API_KEY"

# Process only (reuse raw data)
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect/process?week_id=2026-kw05" \
  -H "X-API-Key: $ADMIN_API_KEY"

# M&A only (reprocess M&A without affecting other sections)
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect/ma?week_id=2026-kw05" \
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
| `GET /api/weeks` | List weeks |
| `GET /api/tech/{weekId}` | Tech + videos |
| `GET /api/investment/{weekId}` | Investment |
| `GET /api/tips/{weekId}` | Tips (15 DE + 15 EN) |
| `GET /api/videos/{weekId}` | Videos only |
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
