# DataCube AI Space

This repository contains multiple projects:

- **[ai-information-hub/CLAUDE.md](./ai-information-hub/CLAUDE.md)** - Frontend (Next.js + Vercel)
- **[ai-hub-backend/README.md](./ai-hub-backend/README.md)** - Backend API (FastAPI + Railway)

---

## AI Information Hub (Quick Reference)

Bilingual (DE/EN) weekly AI news aggregator with **YouTube video integration**. Curates tech breakthroughs, investment news, practical tips, and videos from RSS feeds + Hacker News + YouTube via DeepSeek V3.2 (OpenRouter).

**Stack**: Next.js 16 + React 19 + Tailwind CSS 4 + Shadcn/ui (Frontend) | FastAPI + PostgreSQL (Backend)

**Status**: Full-stack implementation complete with Railway backend.

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
│  DeepSeek V3.2 (OpenRouter) → PostgreSQL                 │
│       ↓                                                  │
│  REST API: /api/tech, /api/investment, /api/videos...    │
│                                                          │
└──────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────── Frontend (Vercel) ───────────────────┐
│                                                          │
│  ai-information-hub/ (Next.js)                           │
│       ↓                                                  │
│  API fetch (with static JSON fallback)                   │
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
│   ├── app/                  # Pages
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
    │       ├── collector.py
    │       ├── youtube_fetcher.py
    │       └── llm_processor.py
    ├── alembic/              # DB migrations
    ├── scripts/              # CLI tools
    ├── Dockerfile
    └── railway.toml
```

---

## Quick Commands

### Frontend
```bash
cd ai-information-hub
npm run dev                   # Dev server :3000
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
# Backend script
python -m scripts.weekly_collect --week 2025-kw05

# Via API
curl -X POST https://api.railway.app/api/admin/collect \
  -H "X-API-Key: your-key"
```

---

## Environment Variables

### Frontend (.env.local)
```bash
OPENROUTER_API_KEY=sk-or-v1-...
YOUTUBE_API_KEY=AIza...
NEXT_PUBLIC_API_URL=https://your-api.railway.app/api  # Optional
```

### Backend (.env)
```bash
DATABASE_URL=postgresql://...
OPENROUTER_API_KEY=sk-or-v1-...
YOUTUBE_API_KEY=AIza...
ADMIN_API_KEY=your-secret-key
```

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/weeks` | List weeks |
| `GET /api/tech/{weekId}` | Tech + videos |
| `GET /api/investment/{weekId}` | Investment |
| `GET /api/tips/{weekId}` | Tips |
| `GET /api/videos/{weekId}` | Videos only |
| `POST /api/admin/collect` | Trigger collection |

---

## Deployment

**Frontend**: Vercel (auto-deploy from main branch)

**Backend**: Railway
```bash
cd ai-hub-backend
railway login && railway init
# Add PostgreSQL, set env vars
railway up
```
