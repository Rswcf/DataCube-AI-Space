# AI Hub Backend

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)

FastAPI backend for the AI Information Hub — multilingual (8 languages) daily + weekly AI news aggregator with YouTube video integration.

## Features

- RESTful API for tech news, investment data, tips, trends
- **Daily + weekly collection modes** (daily: reduced output; weekly: full output)
- YouTube video integration (interspersed in tech feed)
- **Real-time stock data** via Polygon.io API (Secondary Market)
- PostgreSQL database with SQLAlchemy ORM
- 4.5-stage data collection pipeline
- Two-model LLM approach (classifier + processor)
- Tips sources bypass classification (Reddit, Simon Willison)
- **8-language support** (DE, EN, ZH, FR, ES, PT, JA, KO) with resilient free-model translation pipeline
- Period ID support: daily `YYYY-MM-DD` or weekly `YYYY-kwWW`
- **Automated newsletter** via Resend + Beehiiv with per-subscriber language preference (idempotent send-lock per `(period_id, language)`; safe against dual-cron slots + manual re-triggers)
- **Developer API** with tiered rate limiting (free/premium/business API keys)
- **AI Job Board** for DACH region (job listings CRUD with admin controls)
- **Stripe Premium Subscriptions** (checkout, webhooks, subscription management)

## LLM Models

| Purpose | Model | Notes |
|---------|-------|-------|
| **Classification** | `deepseek/deepseek-v4-flash-0731` → `qwen/qwen3.7-flash` → 3 free fallbacks | Paid-first since 2026-07-31 (5 free models were delisted from OpenRouter) |
| **Content Processing** | `deepseek/deepseek-v4-flash-0731` → `qwen/qwen3.7-flash` → 3 free fallbacks | Generates EN base content (all other languages translated) |
| **Translation** | `deepseek/deepseek-v4-flash-0731` → `qwen/qwen3.7-flash` → 3 free fallbacks | EN → DE, ZH, FR, ES, PT, JA, KO. Short prompts keep cost ~$0.05-0.15/day; paid-first eliminates free-tier 429-cascade wipeouts |

## Data Collection Pipeline (Overview)

```
Stage 1: Fetch raw data
    • RSS Feeds (41 sources — see load_sources())
    • Hacker News (Algolia API)
    • YouTube (Data API v3)
    ↓
Stage 2: Classify articles
    • Tips sources → skip classification (direct to tips)
    • Other sources → LLM classification (tech/investment)
    ↓
Stage 3: Parallel LLM processing
    • Tech: 30 posts (weekly) / 10 posts (daily)
    • Investment: primary/secondary/M&A — 7 each (weekly) / 5 total (daily)
    • Tips: 15 per language (weekly) / 5 (daily)
    • Videos: 5 summaries (weekly) / 2 (daily)
    ↓
Stage 3.5: Translate EN → 7 languages incl. DE (paid-first chain)
    • DE, ZH, FR, ES, PT, JA, KO
    • Resilient: JSON validation retries across the model chain
    • Smaller batch fallback (size=3) on parse failure
    ↓
Stage 4: Save to PostgreSQL (translations in JSONB column)
    • `_nn(value, default)` helper coalesces LLM `null` → default
      at every NOT NULL save site (old `.get("x", default)` only
      fired on missing keys, not explicit `null`)
    • `set_collection_status()` clears stale `error`/`completed_at`
      on transition to `running`, and clears `error` on
      `completed`/`empty`
```

---

## Data Pipeline (Details)

> Docs describe invariants; specifics live in code. Source lists, query
> lists and model chains change often — always check the referenced
> functions rather than trusting numbers written in prose.

### Stage responsibilities & code locations

| Stage | What it does | Code |
|-------|--------------|------|
| 1. Fetch | Pull all RSS feeds (parallel pool + serial Reddit lane with 75s spacing — Reddit limits unauth RSS to ~1 req/min/IP), HN (Algolia), YouTube (channel allowlist via uploads playlists + small discovery search); filter to period boundary; store raw | `collector.stage1_fetch_and_store`, `rss_fetcher.fetch_rss_feeds_parallel`, `hn_fetcher`, `youtube_fetcher.fetch_youtube_videos` |
| 2. Classify | LLM classifies articles into tech/investment (tips sources skip) | `collector.stage2_classify_articles`, `llm_processor.CLASSIFIER_MODELS` |
| 3. Process | Parallel LLM processing, EN-native (global-audience voice); also trends + AI editorial brief ("Why Today Matters") | `collector.stage3_parallel_processing`, `llm_processor.process_*`, `generate_trends`, `generate_editorial` |
| 4a. Save base | Validate (EN counts; refuses to clear existing data on empty output), mirror EN→DE arrays as fallback, save with honest source attribution | `collector.stage4_save_to_database`, `_mirror_de_from_translations`, `_source_author` |
| 3.5 Translate | EN → 7 languages (DE + ZH/FR/ES/PT/JA/KO) via paid-first chain; non-blocking after base save | `collector.stage3_5_translate_content`, `llm_processor.TRANSLATOR_MODELS`, `translate_batch` |
| Backfill | Write German into native `_de` columns, other 6 languages into `translations` JSONB | `collector._backfill_translations_to_db`, `_apply_translations_to_record` |

Full-collection order is 1 → 2 → 3 → 4a → 3.5 → backfill (base content is
visible even if translation fails). The process-only admin path runs 3.5
before 4. Any logic that depends on translations must respect both orders.

### Sources

All feed sources (tech / investment / ma / tips) are defined in
`collector.load_sources()` — 41 verified feeds as of 2026-08-01, including
first-party lab blogs, funding verticals, ZH ecosystem sources and four
Reddit communities. YouTube uses a 15-channel allowlist
(`youtube_fetcher.CHANNEL_ALLOWLIST`) plus two discovery queries. HN queries
live in `hn_fetcher.py`. Do not duplicate these lists here.

### Data volume (approximate)

| Mode | Output |
|------|--------|
| Weekly | 30 tech + 21 investment + 15 tips + 5 videos |
| Daily | 10 tech + 5 investment + 5 tips + 2 videos |

### Importance evaluation

| Dimension | Source | Purpose |
|-----------|--------|---------|
| Relevance Score | LLM classification (0.0-1.0) | Initial sorting + selection |
| Impact Level | LLM processing (critical/high/medium/low) | UI display weight |
| HN Points | Hacker News API | Community engagement signal |
| Trend Momentum | Own topic history (`routers/trends._compute_momentum`) | new/rising/returning badges |
| Duplicate Detection | LLM `duplicate_of` | Deduplication |

---

## Stock API (Polygon.io Integration)

The Secondary Market section now fetches **real-time stock data** from Polygon.io API instead of relying on LLM-generated prices.

### How It Works

```
Frontend (investment-feed.tsx)
    │
    │ 1. Load secondary market posts (ticker + content only)
    │
    ▼
Backend Proxy (/api/stock/formatted/batch/)
    │
    │ 2. Fetch real-time data from Polygon.io
    │
    ▼
Polygon.io API
    │
    │ 3. Return: price, change%, marketCap
    │
    ▼
Frontend merges data + displays with "Live" badge
```

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/stock/{ticker}` | Single stock (raw data) |
| `GET /api/stock/batch/?tickers=AAPL,NVDA` | Batch stocks (raw data) |
| `GET /api/stock/formatted/{ticker}?language=en` | Pre-formatted for display |
| `GET /api/stock/formatted/batch/?tickers=...&language=de` | Batch formatted |

### Example Response

```json
// GET /api/stock/formatted/NVDA?language=en
{
  "ticker": "NVDA",
  "price": "$180.06",
  "change": "-2.98%",
  "direction": "down",
  "marketCap": "$4.5T",
  "name": "Nvidia Corp"
}

// GET /api/stock/formatted/NVDA?language=de
{
  "ticker": "NVDA",
  "price": "$180.06",
  "change": "-2.98%",
  "direction": "down",
  "marketCap": "$4,5 Bio.",
  "name": "Nvidia Corp"
}
```

### Configuration

Requires `POLYGON_API_KEY` environment variable (Polygon.io Starter Plan: $29/month, 15-min delayed data).

---

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
# Key dependencies include: stripe>=8.0.0, slowapi>=0.1.9
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

#### Migration History (Monetization)

| Migration | Description |
|-----------|-------------|
| `0007_add_developer_api_keys` | `api_keys` table (email, api_key, tier, calls_today, calls_total, is_active) |
| `0008_add_job_listings` | `job_listings` table (title, company, location, salary, tags, listing_type) |
| `0009_add_subscriptions` | `subscriptions` table (email, stripe IDs, tier, status, period dates) |
| `0011_primary_market_amount_nullable` | `primary_market_posts.amount_de/amount_en` made nullable — LLM returns `null` for undisclosed amounts (e.g. SEC EDGAR 8-K unregistered equity sales). Prevents a single null-amount row from aborting the entire stage 4 transaction and wiping the day's data. API layer (`routers/investment.py:44`) still coerces NULL → "N/A" for UI, so the frontend contract is unchanged. |
| `0012_add_newsletter_sends` | `newsletter_sends` table with composite PK `(period_id, language)`, `status ∈ {in_progress, sent, failed}`, `started_at`, `completed_at`, `sent_count`, `error`. Provides idempotency for newsletter delivery (dual-cron slots, manual re-triggers, in-flight retries). |

Chain: 0006 -> 0007 -> 0008 -> 0009 -> 0011 -> 0012

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/weeks` | GET | List periods (weeks with nested days) |
| `/api/weeks/current` | GET | Get current period |
| `/api/tech/{periodId}` | GET | Tech feed (with videos) |
| `/api/investment/{periodId}` | GET | Investment feed |
| `/api/tips/{periodId}` | GET | Tips feed |
| `/api/trends/{periodId}` | GET | Trends feed |
| `/api/videos/{periodId}` | GET | YouTube videos only |
| `/api/stock/{ticker}` | GET | Real-time stock data |
| `/api/stock/batch/?tickers=...` | GET | Batch stock data |
| `/api/stock/formatted/{ticker}` | GET | Pre-formatted stock data |
| `/api/stock/formatted/batch/` | GET | Batch formatted stock data |
| `/api/admin/collect` | POST | Full collection (all stages) |
| `/api/admin/collect/fetch` | POST | Stage 1 only |
| `/api/admin/collect/process` | POST | Stages 2-4 only |
| `/api/admin/collect/ma` | POST | M&A-only reprocessing |
| `/api/admin/newsletter` | POST | Send newsletter (per-subscriber language) |
| `/api/admin/migrate` | POST | Migrate JSON data |
| `/api/developer/register` | POST | Register for API key (returns `dcai_xxx`) |
| `/api/developer/usage` | GET | API key usage stats (requires `X-API-Key`) |
| `/api/developer/rotate-key` | POST | Rotate API key (requires `X-API-Key`) |
| `/api/jobs` | GET | List active job listings (filters: job_type, location, level, search) |
| `/api/jobs/{id}` | GET | Single job listing |
| `/api/jobs` | POST | Create job listing (admin `X-API-Key`) |
| `/api/jobs/{id}` | PUT | Update job listing (admin `X-API-Key`) |
| `/api/jobs/{id}` | DELETE | Soft-delete job listing (admin `X-API-Key`) |
| `/api/stripe/webhook` | POST | Stripe webhook handler (Stripe signature) |
| `/api/stripe/create-checkout` | POST | Create Stripe checkout session |
| `/api/stripe/subscription/{email}` | GET | Subscription status by email |
| `/api/stripe/cancel` | POST | Cancel subscription |
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
railway variables set POLYGON_API_KEY=xxxxx              # For real-time stock data
railway variables set ADMIN_API_KEY=$ADMIN_API_KEY
railway variables set RESEND_API_KEY=re_xxxxx
railway variables set BEEHIIV_API_KEY=xxxxx
railway variables set BEEHIIV_PUBLICATION_ID=pub_xxxxx
railway variables set NEWSLETTER_FROM_EMAIL=newsletter@datacubeai.space
railway variables set STRIPE_SECRET_KEY=sk_xxxxx
railway variables set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
railway variables set STRIPE_PREMIUM_PRICE_ID=price_xxxxx
railway variables set STRIPE_API_DEVELOPER_PRICE_ID=price_xxxxx
railway variables set STRIPE_API_BUSINESS_PRICE_ID=price_xxxxx
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
# Daily (period_id = YYYY-MM-DD)
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect?period_id=2026-02-07" \
  -H "X-API-Key: $ADMIN_API_KEY"

# Weekly (period_id = YYYY-kwWW)
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect?period_id=2026-kw05" \
  -H "X-API-Key: $ADMIN_API_KEY"
```

### Process Only (Reuse Raw Data)

Useful when you want to re-run LLM processing without re-fetching data:

```bash
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect/process?period_id=2026-kw05" \
  -H "X-API-Key: $ADMIN_API_KEY"
```

### Fetch Only (No LLM Processing)

```bash
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect/fetch?period_id=2026-kw05" \
  -H "X-API-Key: $ADMIN_API_KEY"
```

### Local Collection

```bash
# Daily collection (default: today)
python -m scripts.daily_collect
python -m scripts.daily_collect --date 2026-02-07

# Weekly collection (full week at once)
python -m scripts.weekly_collect
python -m scripts.weekly_collect --week 2026-kw05
```

## Tips Processing

Tips sources bypass LLM classification in Stage 2. Current sources (14 total):

**Blogs:**
- Simon Willison
- One Useful Thing (Ethan Mollick)

**Reddit Communities:**
- r/ChatGPT, r/ClaudeAI, r/OpenAI, r/PromptEngineering
- r/Midjourney (image generation for marketing)
- r/perplexity_ai, r/NotebookLM (AI research tools)
- r/artificial, r/singularity (general AI discussion)
- r/aivideo, r/ElevenLabs (content creation)
- r/ChatGPTPro (pro users)

These sources:
- Are inherently tips/practical content
- Skip classification and retain `section="tips"`
- Ensure tips appear in the Tips feed

## M&A Processing

### M&A Data Sources

M&A feeds are the `ma` section of `collector.load_sources()` (5 scoped feeds
as of 2026-08-01 — the raw SEC EDGAR 8-K firehose and generic Yahoo
topstories were dropped for noise). They are fetched with the investment
collection but processed separately for M&A extraction.

### M&A Processing Flow

M&A data has two collection paths:

**Full Collection** (4.5-stage pipeline):
```
RSS Fetch (all sources) → Classification → LLM Processing → Translation → Database
                                              ↓
                               process_investment_articles()
                               internally splits articles into:
                               • Primary Market (funding)
                               • Secondary Market (stocks)
                               • M&A (mergers & acquisitions)
```

**M&A-Only Collection** (3-stage fast path):
```
M&A RSS Fetch → process_ma_articles() → ma_posts table
     ↓
(Skips classification, doesn't touch other sections)
```

Use M&A-only collection when you want to refresh M&A data without reprocessing tech/tips:
```bash
curl -X POST ".../api/admin/collect/ma?period_id=2026-kw06" -H "X-API-Key: ..."
```

### AI Industry Taxonomy

M&A deals are classified into AI-specific industry categories:

| Category | Description |
|----------|-------------|
| AI Infrastructure | Cloud, chips, data centers, ML platforms, model providers |
| AI Healthcare | Medical AI, drug discovery, clinical AI, diagnostics |
| AI Finance | FinTech AI, algorithmic trading, risk assessment, fraud detection |
| AI Enterprise | B2B AI tools, SaaS AI, workflow automation, document AI |
| AI Consumer | Consumer apps, recommendation systems, voice assistants |
| AI Robotics | Industrial robots, autonomous vehicles, drones |
| AI Security | Cybersecurity AI, fraud detection, threat intelligence |
| AI Creative | Image/video generation, music AI, content creation |
| AI Education | EdTech AI, tutoring, learning platforms |
| Other AI | AI companies not fitting above categories |

**Note**: Only AI-related M&A deals are included. Deals with no clear AI connection are filtered out (industry = null).

### M&A-Only Reprocessing

To reprocess only the M&A section without affecting other sections:

```bash
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect/ma?period_id=2026-kw05" \
  -H "X-API-Key: $ADMIN_API_KEY"
```

This is useful when you want to update M&A data with new sources or fix classification issues.

## Project Structure

```
ai-hub-backend/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Environment config
│   ├── database.py          # DB connection
│   ├── models/              # SQLAlchemy models
│   │   ├── __init__.py      # All models
│   │   ├── raw.py           # Raw article/video storage
│   │   ├── developer.py     # ApiKey model (email, api_key, tier, rate limits)
│   │   ├── job.py           # JobListing model (title, company, location, salary, tags)
│   │   ├── subscription.py  # Subscription model (Stripe IDs, tier, status, period dates)
│   │   └── newsletter_send.py  # NewsletterSend model (period_id, language, status, sent_count) — idempotency lock
│   ├── schemas/             # Pydantic schemas
│   ├── routers/             # API routes
│   │   ├── admin.py         # Collection endpoints
│   │   ├── stock.py         # Real-time stock data (Polygon.io)
│   │   ├── developer.py     # Developer API (register, usage, rotate-key)
│   │   ├── jobs.py          # Job board CRUD endpoints
│   │   ├── stripe_webhook.py  # Stripe payments (webhook, checkout, subscriptions)
│   │   └── ...
│   └── services/            # Business logic
│       ├── collector.py     # 4.5-stage pipeline
│       ├── period_utils.py  # Period ID utilities (daily/weekly)
│       ├── rss_fetcher.py   # RSS feeds
│       ├── hn_fetcher.py    # Hacker News
│       ├── youtube_fetcher.py  # YouTube API
│       ├── llm_processor.py # LLM processing + resilient translation (JSON validation + small-batch retry)
│       ├── i18n_utils.py    # Language constants, get_field() helper
│       ├── newsletter_sender.py # Resend + Beehiiv newsletter — idempotent via newsletter_sends lock (ON CONFLICT DO NOTHING + SELECT FOR UPDATE, 6h stale reclaim); (sent, failed) tuple lets partial success avoid duplicate delivery; Berlin-tz default period (no late-UTC cron "yesterday" bug)
│       └── migrator.py      # JSON migration
├── alembic/                 # DB migrations
├── scripts/                 # CLI scripts
│   ├── daily_collect.py     # Daily cron script (Railway)
│   └── weekly_collect.py    # Weekly collection script
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
