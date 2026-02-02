# DataCube AI Information Hub

Bilingual (DE/EN) weekly AI news aggregator for internal teams — curates tech breakthroughs, investment news, practical tips, and **YouTube videos** from RSS feeds + Hacker News + YouTube. Built with Next.js 16 + React 19 + Tailwind CSS 4 + Shadcn/ui, deployed on Vercel.

**Status**: Core app complete with Railway backend integration. Supports 3 feed types + YouTube videos, bilingual, week navigation, dark/light theme. **No authentication required**.

---

## Quick Reference for AI Assistants

**Most important files to understand the codebase:**

| File | Purpose |
|------|---------|
| `lib/types.ts` | All TypeScript interfaces (includes video fields) |
| `lib/api.ts` | API client with static JSON fallback |
| `lib/settings-context.tsx` | Theme + language state, `t()` translation function |
| `components/feeds/tech-feed.tsx` | Reference implementation (API + video support) |
| `components/video-embed.tsx` | YouTube embed component |
| `app/api/chat/route.ts` | Chat assistant API (uses glm-4.5-air:free) |
| `middleware.ts` | Auth middleware (currently disabled) |
| `../ai-hub-backend/` | FastAPI backend (Railway deployment) |

**Key patterns:**
- All components use `"use client"` — pure client-side rendering
- Data loading: API first (`NEXT_PUBLIC_API_URL`), fallback to static JSON
- Translation: `const { t } = useSettings(); t("keyName")`
- Week ID format: `YYYY-kwWW` (e.g., `2026-kw05`)
- **Authentication is disabled** — all routes are public

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
│  REST API: /api/tech/{weekId}, /api/tips/{weekId}...     │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌─────────────────── Frontend (Vercel) ───────────────────┐
│                                                          │
│  NEXT_PUBLIC_API_URL set?                                │
│    YES → fetch from Railway API                          │
│    NO  → fetch from /data/{weekId}/*.json (fallback)     │
│       ↓                                                  │
│  React components (all "use client")                     │
│       ↓                                                  │
│  Chat API: /api/chat (glm-4.5-air:free)                  │
│       ↓                                                  │
│  Tech Feed: 20 posts + 5 videos (interspersed)           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Content Distribution

| Section | Source | Per Week |
|---------|--------|----------|
| **Tech** | HN + RSS | ~20-25 posts + 5 videos |
| **Investment** | RSS feeds | Primary/Secondary/M&A |
| **Tips** | Reddit + Simon Willison | 10 DE + 10 EN |

---

## Directory Structure

```
ai-information-hub/           # Frontend (Next.js)
├── app/
│   ├── api/
│   │   ├── auth/             # Auth API (disabled)
│   │   └── chat/             # Chat assistant (glm-4.5-air:free)
│   ├── login/                # Login page (disabled)
│   └── page.tsx              # Main page
├── components/
│   ├── feeds/
│   │   ├── tech-feed.tsx     # With video support
│   │   ├── investment-feed.tsx
│   │   └── tips-feed.tsx
│   ├── video-embed.tsx       # YouTube player component
│   └── ...
├── lib/
│   ├── api.ts                # API client with fallback
│   ├── types.ts              # Includes video fields
│   └── ...
├── middleware.ts             # Auth (disabled - allows all)
├── public/data/              # Static JSON fallback
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
│   └── weekly_collect.py     # Cron script
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
| **Chat Assistant** | `z-ai/glm-4.5-air:free` | Same as classifier (free) |

---

## Data Collection Pipeline

The backend uses a 4-stage pipeline:

```
Stage 1: Fetch raw data (RSS, HN, YouTube)
    ↓
Stage 2: Classify articles
    • Tips sources (Reddit, Simon Willison) → skip classification
    • Tech/Investment sources → LLM classification
    ↓
Stage 3: Parallel LLM processing
    • Tech articles → tech posts
    • Investment articles → primary/secondary/M&A
    • Tips articles → 10 tips per language
    • Videos → video summaries
    ↓
Stage 4: Save to PostgreSQL
```

---

## API Endpoints (Railway Backend)

**Production URL**: `https://api-production-3ee5.up.railway.app`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/weeks` | GET | List all weeks |
| `/api/weeks/current` | GET | Current week |
| `/api/tech/{weekId}` | GET | Tech feed (with videos) |
| `/api/investment/{weekId}` | GET | Investment feed |
| `/api/tips/{weekId}` | GET | Tips feed (10 DE + 10 EN) |
| `/api/trends/{weekId}` | GET | Trends |
| `/api/videos/{weekId}` | GET | Videos only |
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
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect?week_id=2026-kw05" \
  -H "X-API-Key: REDACTED_ADMIN_KEY"

# Process only (reuse existing raw data)
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

### Backend (Railway)
```bash
DATABASE_URL=postgresql://...  # Set by Railway
OPENROUTER_API_KEY=sk-or-v1-...
YOUTUBE_API_KEY=AIza...
ADMIN_API_KEY=REDACTED_ADMIN_KEY
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
2. Components automatically use API with fallback

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

## Authentication

**Authentication is currently disabled.** The middleware allows all requests without password.

To re-enable authentication:
1. Update `middleware.ts` to check for auth cookie
2. Set `ACCESS_PASSWORD` in `.env.local`
3. Redeploy to Vercel
