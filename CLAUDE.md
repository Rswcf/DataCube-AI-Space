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
│  API fetch (with static JSON fallback)                   │
│       ↓                                                  │
│  Chat Assistant: glm-4.5-air:free                        │
│       ↓                                                  │
│  Tech Feed: 20 posts + 5 YouTube videos (interspersed)   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
DataCube_AI_Space/
├── ai-information-hub/       # Frontend (Next.js)
│   ├── app/                  # Pages + API routes
│   │   └── api/chat/         # Chat assistant (glm-4.5-air:free)
│   ├── components/           # React components
│   │   ├── feeds/            # Feed components
│   │   └── video-embed.tsx   # YouTube player
│   ├── lib/                  # Utils, types, API client
│   ├── public/data/          # Static JSON fallback
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
# Via API
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect?week_id=2026-kw05" \
  -H "X-API-Key: REDACTED_ADMIN_KEY"

# Process only (reuse raw data)
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect/process?week_id=2026-kw05" \
  -H "X-API-Key: REDACTED_ADMIN_KEY"
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
ADMIN_API_KEY=REDACTED_ADMIN_KEY
CORS_ORIGINS=["http://localhost:3000","https://www.datacubeai.space","https://ai-information-hub.vercel.app"]
```

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/weeks` | List weeks |
| `GET /api/tech/{weekId}` | Tech + videos |
| `GET /api/investment/{weekId}` | Investment |
| `GET /api/tips/{weekId}` | Tips (10 DE + 10 EN) |
| `GET /api/videos/{weekId}` | Videos only |
| `POST /api/admin/collect` | Full collection |
| `POST /api/admin/collect/process` | Reprocess raw data |

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
