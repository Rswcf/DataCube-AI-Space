# DataCube AI Information Hub

Bilingual (DE/EN) weekly AI news aggregator for internal teams — curates tech breakthroughs, investment news, practical tips, and **YouTube videos** from RSS feeds + Hacker News + YouTube via DeepSeek V3.2 (OpenRouter). Built with Next.js 16 + React 19 + Tailwind CSS 4 + Shadcn/ui, deployed on Vercel.

**Status**: Core app complete with Railway backend integration. Supports 3 feed types + YouTube videos, bilingual, week navigation, dark/light theme.

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
| `../ai-hub-backend/` | FastAPI backend (Railway deployment) |

**Key patterns:**
- All components use `"use client"` — pure client-side rendering
- Data loading: API first (`NEXT_PUBLIC_API_URL`), fallback to static JSON
- Translation: `const { t } = useSettings(); t("keyName")`
- Week ID format: `YYYY-kwWW` (e.g., `2025-kw04`)

---

## Architecture

```
┌─────────────────── NEW: Railway Backend ────────────────┐
│                                                          │
│  ai-hub-backend/ (FastAPI + PostgreSQL)                  │
│       ↓                                                  │
│  Railway Cron (Mon 08:00 UTC)                            │
│       ↓                                                  │
│  Data Sources:                                           │
│    • RSS Feeds (22 sources)                              │
│    • Hacker News (Algolia API)                           │
│    • YouTube (Data API v3) ← NEW                         │
│       ↓                                                  │
│  DeepSeek V3.2 (OpenRouter)                              │
│       ↓                                                  │
│  PostgreSQL Database                                     │
│       ↓                                                  │
│  REST API: /api/tech/{weekId}, /api/videos/{weekId}...   │
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
│  Tech Feed: 20 posts + 5 videos (interspersed)           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Tech Feed Content Distribution

| Source | Type | Per Week |
|--------|------|----------|
| **Hacker News** | Algolia API | ~15-20 posts |
| **RSS Feeds** | Various sources | ~10 posts |
| **YouTube** | Data API v3 | **5 videos** |

**Display**: Videos at positions 3, 8, 13, 18, 23 (every 5 posts)

---

## Directory Structure

```
ai-information-hub/           # Frontend (Next.js)
├── app/
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
├── public/data/              # Static JSON fallback
└── .env.local                # API keys

ai-hub-backend/               # Backend (FastAPI)
├── app/
│   ├── main.py               # FastAPI entry
│   ├── config.py             # Environment config
│   ├── database.py           # PostgreSQL
│   ├── models/               # SQLAlchemy models
│   ├── schemas/              # Pydantic schemas
│   ├── routers/              # API endpoints
│   └── services/
│       ├── collector.py      # Main orchestrator
│       ├── rss_fetcher.py
│       ├── hn_fetcher.py
│       ├── youtube_fetcher.py
│       ├── llm_processor.py
│       └── migrator.py
├── alembic/                  # DB migrations
├── scripts/
│   ├── init_db.py            # Database setup
│   └── weekly_collect.py     # Cron script
├── Dockerfile
├── railway.toml
└── requirements.txt
```

---

## Core Data Contracts

### tech.json (with video fields)
```json
{
  "de": [{
    "id": 1,
    "author": { "name": "...", "handle": "...", "avatar": "XX", "verified": true },
    "content": "...",
    "tags": ["..."],
    "category": "...",
    "iconType": "Brain|Server|Zap|Cpu",
    "impact": "critical|high|medium|low",
    "timestamp": "YYYY-MM-DD",
    "metrics": { "comments": 0, "retweets": 0, "likes": 0, "views": "0" },
    "source": "...",
    "sourceUrl": "...",
    "isVideo": false,
    "videoId": null,
    "videoDuration": null,
    "videoViewCount": null,
    "videoThumbnailUrl": null
  }],
  "en": [...]
}
```

**Video post fields** (when `isVideo: true`):
- `videoId`: YouTube video ID (e.g., "dQw4w9WgXcQ")
- `videoDuration`: Formatted duration ("12:34")
- `videoViewCount`: Formatted views ("1.2M")
- `videoThumbnailUrl`: Thumbnail URL

---

## API Endpoints (Railway Backend)

**Production URL**: `https://api-production-3ee5.up.railway.app`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/weeks` | GET | List all weeks |
| `/api/weeks/current` | GET | Current week |
| `/api/tech/{weekId}` | GET | Tech feed (with videos) |
| `/api/investment/{weekId}` | GET | Investment feed |
| `/api/tips/{weekId}` | GET | Tips feed |
| `/api/trends/{weekId}` | GET | Trends |
| `/api/videos/{weekId}` | GET | Videos only |
| `/api/admin/init-db` | POST | Initialize database tables |
| `/api/admin/import-week` | POST | Import week data via JSON |
| `/api/admin/collect` | POST | Trigger data collection |
| `/api/admin/migrate` | POST | Migrate local JSON data |

---

## Commands

### Frontend
```bash
npm run dev              # Dev server at localhost:3000
npm run build            # Production build
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
# Via backend script (local)
python -m scripts.weekly_collect
python -m scripts.weekly_collect --week 2026-kw05

# Via API (requires ADMIN_API_KEY)
curl -X POST https://api-production-3ee5.up.railway.app/api/admin/collect \
  -H "X-API-Key: REDACTED_ADMIN_KEY"

# Upload local data to Railway
python3 scripts/upload_data.py --data-path ../ai-information-hub/public/data --all
```

---

## Environment Variables

### Frontend (.env.local)
```bash
ACCESS_PASSWORD=REDACTED_PASSWORD
OPENROUTER_API_KEY=sk-or-v1-...
YOUTUBE_API_KEY=AIza...
NEXT_PUBLIC_API_URL=https://api-production-3ee5.up.railway.app/api
```

### Backend (Railway Environment Variables)
```bash
DATABASE_URL=postgresql://...  # Set by Railway
OPENROUTER_API_KEY=sk-or-v1-...
YOUTUBE_API_KEY=AIza...
ADMIN_API_KEY=REDACTED_ADMIN_KEY
CORS_ORIGINS=["http://localhost:3000","https://ai-information-hub.vercel.app"]
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

### Deploy backend to Railway
```bash
cd ai-hub-backend
railway login
railway init --name ai-hub-backend
# Add PostgreSQL in Railway Dashboard: + New → Database → PostgreSQL
railway service link api
railway variables set OPENROUTER_API_KEY=... YOUTUBE_API_KEY=... ADMIN_API_KEY=...
railway up

# Initialize database via API
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/init-db" \
  -H "X-API-Key: REDACTED_ADMIN_KEY"
```

---

## Backward Compatibility

The frontend works in two modes:
1. **With API**: Set `NEXT_PUBLIC_API_URL` → fetches from Railway
2. **Without API**: Falls back to static `/data/{weekId}/*.json`

Video posts only appear when using the new backend (static JSON doesn't include videos).
