# AI Hub Backend

FastAPI backend for the AI Information Hub - bilingual AI news aggregator with YouTube video integration.

## Features

- RESTful API for tech news, investment data, tips, trends
- YouTube video integration (5 videos/week interspersed in tech feed)
- PostgreSQL database with SQLAlchemy ORM
- Automated weekly data collection via Railway cron
- Data migration from existing JSON files
- Bilingual content support (DE/EN)

## Setup

### Prerequisites

- Python 3.11+
- PostgreSQL database
- API keys:
  - OpenRouter (for DeepSeek LLM)
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
# Create tables and insert default team members
python -m scripts.init_db

# Optionally migrate all existing JSON data
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
| `/api/weeks/{weekId}` | GET | Get specific week |
| `/api/tech/{weekId}` | GET | Tech feed (with videos) |
| `/api/investment/{weekId}` | GET | Investment feed |
| `/api/tips/{weekId}` | GET | Tips feed |
| `/api/trends/{weekId}` | GET | Trends feed |
| `/api/videos/{weekId}` | GET | YouTube videos only |
| `/api/admin/collect` | POST | Trigger collection (requires API key) |
| `/api/admin/migrate` | POST | Migrate JSON data (requires API key) |
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
railway variables set ADMIN_API_KEY=your-secure-key
railway variables set CORS_ORIGINS='["https://your-frontend.vercel.app"]'
```

### 4. Deploy

```bash
railway up
```

### 5. Initialize Database

After first deployment:
```bash
# SSH into Railway or use Railway CLI
railway run python -m scripts.init_db --migrate-all
```

## Data Collection

### Automated (Cron)

The cron job runs every Monday at 08:00 UTC:
- Fetches RSS feeds + Hacker News
- Fetches YouTube videos
- Processes with DeepSeek LLM
- Saves to PostgreSQL

### Manual Trigger

```bash
curl -X POST https://your-api.railway.app/api/admin/collect \
  -H "X-API-Key: your-admin-key"

# Specific week
curl -X POST "https://your-api.railway.app/api/admin/collect?week_id=2025-kw05" \
  -H "X-API-Key: your-admin-key"
```

### Local Collection

```bash
python -m scripts.weekly_collect
python -m scripts.weekly_collect --week 2025-kw05
```

## Migrating Existing Data

To migrate existing JSON data from the frontend:

```bash
# Via API
curl -X POST "https://your-api.railway.app/api/admin/migrate?week_id=2025-kw04" \
  -H "X-API-Key: your-admin-key"

# Via script
python -m scripts.init_db --migrate-all --data-path /path/to/public/data
```

## Project Structure

```
ai-hub-backend/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Environment config
│   ├── database.py          # DB connection
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic schemas
│   ├── routers/             # API routes
│   └── services/            # Business logic
│       ├── collector.py     # Main orchestrator
│       ├── rss_fetcher.py   # RSS feeds
│       ├── hn_fetcher.py    # Hacker News
│       ├── youtube_fetcher.py  # YouTube API
│       ├── llm_processor.py # DeepSeek LLM
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
NEXT_PUBLIC_API_URL=https://your-api.railway.app/api
```

The frontend will automatically use the API when configured, with fallback to static JSON files.
