# AI Hub Backend

FastAPI backend for the AI Information Hub - bilingual AI news aggregator with YouTube video integration.

## Features

- RESTful API for tech news, investment data, tips, trends
- YouTube video integration (5 videos/week interspersed in tech feed)
- PostgreSQL database with SQLAlchemy ORM
- 4-stage data collection pipeline
- Two-model LLM approach (classifier + processor)
- Tips sources bypass classification (Reddit, Simon Willison)
- Bilingual content support (DE/EN)

## LLM Models

| Purpose | Model | Notes |
|---------|-------|-------|
| **Classification** | `z-ai/glm-4.5-air:free` | Free tier, classifies tech/investment |
| **Content Processing** | `deepseek/deepseek-v3.2` | Generates bilingual content |

## Data Collection Pipeline

```
Stage 1: Fetch raw data
    • RSS Feeds (22 sources)
    • Hacker News (Algolia API)
    • YouTube (Data API v3)
    ↓
Stage 2: Classify articles
    • Tips sources → skip classification (direct to tips)
    • Other sources → LLM classification (tech/investment)
    ↓
Stage 3: Parallel LLM processing
    • Tech: 20-25 posts
    • Investment: primary/secondary/M&A
    • Tips: 10 per language
    • Videos: 5 summaries
    ↓
Stage 4: Save to PostgreSQL
```

## Setup

### Prerequisites

- Python 3.11+
- PostgreSQL database
- API keys:
  - OpenRouter (for LLM)
  - YouTube Data API v3

### Local Development

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Initialize database:
```bash
python -m scripts.init_db --migrate-all
```

5. Run the server:
```bash
uvicorn app.main:app --reload
```

6. Access API docs at http://localhost:8000/docs

### Database Migrations

Using Alembic for schema migrations:

```bash
# Apply all migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"

# Rollback one migration
alembic downgrade -1
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/weeks` | GET | List all available weeks |
| `/api/weeks/current` | GET | Get current week |
| `/api/tech/{weekId}` | GET | Tech feed (with videos) |
| `/api/investment/{weekId}` | GET | Investment feed |
| `/api/tips/{weekId}` | GET | Tips feed (10 DE + 10 EN) |
| `/api/trends/{weekId}` | GET | Trends feed |
| `/api/videos/{weekId}` | GET | YouTube videos only |
| `/api/admin/collect` | POST | Full collection (all stages) |
| `/api/admin/collect/fetch` | POST | Stage 1 only |
| `/api/admin/collect/process` | POST | Stages 2-4 only |
| `/api/admin/migrate` | POST | Migrate JSON data |
| `/health` | GET | Health check |

## Deployment to Railway

### 1. Create Railway Project

```bash
railway login
railway init
```

### 2. Add PostgreSQL Service

In Railway dashboard: **Add Service** → **PostgreSQL**

### 3. Set Environment Variables

```bash
railway variables set DATABASE_URL=$RAILWAY_DATABASE_URL
railway variables set OPENROUTER_API_KEY=sk-or-v1-xxxxx
railway variables set YOUTUBE_API_KEY=AIzaSyxxxxx
railway variables set ADMIN_API_KEY=REDACTED_ADMIN_KEY
railway variables set CORS_ORIGINS='["http://localhost:3000","https://www.datacubeai.space","https://ai-information-hub.vercel.app"]'
```

### 4. Deploy

```bash
railway up
```

### 5. Initialize Database

After first deployment:
```bash
railway run python -m scripts.init_db --migrate-all
```

## Data Collection

### Full Collection (All Stages)

```bash
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect?week_id=2026-kw05" \
  -H "X-API-Key: REDACTED_ADMIN_KEY"
```

### Process Only (Reuse Raw Data)

Useful when you want to re-run LLM processing without re-fetching data:

```bash
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect/process?week_id=2026-kw05" \
  -H "X-API-Key: REDACTED_ADMIN_KEY"
```

### Fetch Only (No LLM Processing)

```bash
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect/fetch?week_id=2026-kw05" \
  -H "X-API-Key: REDACTED_ADMIN_KEY"
```

### Local Collection

```bash
python -m scripts.weekly_collect
python -m scripts.weekly_collect --week 2026-kw05
```

## Tips Processing

Tips sources (Reddit r/ChatGPT, Reddit r/ClaudeAI, Simon Willison) bypass LLM classification in Stage 2:

- These sources are inherently tips content
- They skip classification and retain `section="tips"`
- This ensures tips appear in the Tips feed

## Project Structure

```
ai-hub-backend/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Environment config
│   ├── database.py          # DB connection
│   ├── models/              # SQLAlchemy models
│   │   ├── __init__.py      # All models
│   │   └── raw.py           # Raw article/video storage
│   ├── schemas/             # Pydantic schemas
│   ├── routers/             # API routes
│   │   ├── admin.py         # Collection endpoints
│   │   └── ...
│   └── services/            # Business logic
│       ├── collector.py     # 4-stage pipeline
│       ├── rss_fetcher.py   # RSS feeds
│       ├── hn_fetcher.py    # Hacker News
│       ├── youtube_fetcher.py  # YouTube API
│       ├── llm_processor.py # Two-model LLM
│       └── migrator.py      # JSON migration
├── alembic/                 # DB migrations
├── scripts/                 # CLI scripts
├── Dockerfile
├── railway.toml
└── requirements.txt
```

## Frontend Configuration

Set environment variable in Vercel:

```
NEXT_PUBLIC_API_URL=https://api-production-3ee5.up.railway.app/api
```

The frontend will automatically use the API when configured, with fallback to static JSON files.
