<div align="center">

# 🧊 Data Cube AI

### Your daily AI news, curated by AI.

**Bilingual (DE/EN) AI news aggregator** that curates tech breakthroughs, investment deals, practical tips, and YouTube videos — powered by a 4-stage LLM pipeline.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-datacubeai.space-brightgreen)](https://www.datacubeai.space)
[![CI](https://img.shields.io/github/actions/workflow/status/Rswcf/DataCube-AI-Space/ci.yml?label=CI)](https://github.com/Rswcf/DataCube-AI-Space/actions)

[English](README.md) | [简体中文](docs/README.zh-CN.md) | [Deutsch](docs/README.de.md) | [Français](docs/README.fr.md) | [Español](docs/README.es.md) | [Português](docs/README.pt-BR.md) | [日本語](docs/README.ja.md) | [한국어](docs/README.ko.md)

</div>

---

## What is Data Cube AI?

Data Cube AI automatically collects, classifies, and summarizes AI news from **22 RSS feeds**, **Hacker News**, and **YouTube** — then presents it in a clean bilingual (German/English) interface with daily and weekly views.

**Live at [datacubeai.space](https://www.datacubeai.space)** — no login required.

## Features

- **Tech Feed** — AI/ML breakthroughs with embedded YouTube videos and impact ratings
- **Investment Tracker** — Primary funding rounds, secondary market data (live stock prices via Polygon.io), and M&A deals
- **Practical Tips** — Curated from 14 Reddit communities and expert blogs
- **Bilingual** — Every article in both German and English
- **Daily + Weekly** — Automated daily collection with weekly rollup views
- **AI Chat** — Ask questions about the current week's AI news
- **AI Reports** — One-click streaming report with export to Word, HTML, Markdown, Text, or JSON
- **SEO/GEO Optimized** — SSR pages, JSON-LD structured data, Atom feed, llms.txt, sitemap
- **Accessible** — WCAG-compliant: 44px touch targets, focus-visible, ARIA, prefers-reduced-motion, skip links
- **Mobile-First** — Dynamic viewport, safe area insets, touch-optimized navigation, body scroll lock on overlays

## Architecture

```
Frontend (Vercel)                    Backend (Railway)
┌─────────────────────┐             ┌──────────────────────────────┐
│  Next.js 16         │    REST     │  FastAPI + PostgreSQL        │
│  React 19           │◄───────────►│                              │
│  Tailwind CSS 4     │    API      │  4-Stage Pipeline:           │
│  Shadcn/ui          │             │  1. Fetch (RSS, HN, YouTube) │
│                     │             │  2. Classify (LLM)           │
│  Pages:             │             │  3. Process (LLM, parallel)  │
│  • Tech Feed        │             │  4. Save to PostgreSQL       │
│  • Investment Feed  │             │                              │
│  • Tips Feed        │             │  Data Sources:               │
│  • AI Chat          │             │  • 22 RSS Feeds              │
│  • AI Reports       │             │  • Hacker News (Algolia)     │
│  • SSR Week Pages   │             │  • YouTube Data API v3       │
└─────────────────────┘             └──────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL
- API keys: [OpenRouter](https://openrouter.ai), [YouTube Data API v3](https://console.cloud.google.com), [Polygon.io](https://polygon.io) (optional, for live stock data)

### Frontend

```bash
cd ai-information-hub
cp .env.example .env.local    # Add your API keys
npm install
npm run dev                   # http://localhost:3000
```

### Backend

```bash
cd ai-hub-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # Add your API keys

python -m scripts.init_db --migrate-all
uvicorn app.main:app --reload # http://localhost:8000/docs
```

### Run Data Collection

```bash
# Daily collection (today)
python -m scripts.daily_collect

# Weekly collection (current week)
python -m scripts.weekly_collect

# Specific date/week
python -m scripts.daily_collect --date 2026-02-07
python -m scripts.weekly_collect --week 2026-kw06
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, Shadcn/ui, TypeScript |
| **Backend** | FastAPI, SQLAlchemy, Alembic, PostgreSQL |
| **LLM Classification** | GLM-4.5-Air (OpenRouter, free tier) |
| **LLM Processing** | DeepSeek V3.2 (OpenRouter) |
| **Chat & Reports** | Aurora Alpha (OpenRouter) |
| **Stock Data** | Polygon.io API |
| **Hosting** | Vercel (frontend), Railway (backend + DB + cron) |
| **Design** | Instrument Serif, section-specific color accents, staggered animations |

## Data Pipeline

The backend processes news through a 4-stage pipeline:

| Stage | What happens | Output |
|-------|-------------|--------|
| **1. Fetch** | Collect from RSS, Hacker News, YouTube; filter by period boundaries | ~210 raw items |
| **2. Classify** | LLM classifies into tech/investment/tips (tips sources skip this) | Categorized pool |
| **3. Process** | Parallel LLM processing: generate bilingual summaries, extract entities | 30 tech + 21 investment + 15 tips + 5 videos |
| **4. Save** | Store in PostgreSQL, intersperse videos into tech feed | Database records |

Daily collections produce reduced counts (10 tech, 5 investment, 5 tips, 2 videos).

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/weeks` | GET | List periods (weeks with nested days) |
| `/api/tech/{periodId}` | GET | Tech feed with embedded videos |
| `/api/investment/{periodId}` | GET | Primary/Secondary/M&A data |
| `/api/tips/{periodId}` | GET | Curated tips |
| `/api/videos/{periodId}` | GET | YouTube video summaries |
| `/api/stock/{ticker}` | GET | Real-time stock data |
| `/api/stock/batch/?tickers=AAPL,NVDA` | GET | Batch stock data |
| `/api/admin/collect` | POST | Trigger full data collection |

Period IDs: daily `YYYY-MM-DD` or weekly `YYYY-kwWW`

Full API docs available at `/docs` (Swagger UI) when running the backend.

## Environment Variables

### Frontend (`ai-information-hub/.env.local`)

```bash
OPENROUTER_API_KEY=sk-or-v1-...     # For chat & report features
YOUTUBE_API_KEY=AIza...              # For video metadata
NEXT_PUBLIC_API_URL=http://localhost:8000/api  # Backend URL
```

### Backend (`ai-hub-backend/.env`)

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/aihub
OPENROUTER_API_KEY=sk-or-v1-...     # For LLM classification & processing
YOUTUBE_API_KEY=AIza...              # For video fetching
POLYGON_API_KEY=...                  # Optional: real-time stock data
ADMIN_API_KEY=your-secret-key       # Protects admin endpoints
CORS_ORIGINS=["http://localhost:3000"]
```

## Deployment

### Frontend → Vercel

```bash
cd ai-information-hub
vercel --prod
```

Set environment variables in the Vercel dashboard. Auto-deploys on push to `main`.

### Backend → Railway

```bash
cd ai-hub-backend
railway up
```

Railway auto-applies Alembic migrations on startup. Configure a cron job for daily collection at 22:00 UTC.

## Project Structure

```
DataCube-AI-Space/
├── ai-information-hub/          # Frontend (Next.js)
│   ├── app/                     # Pages + API routes
│   │   ├── api/chat/            # AI chat endpoint
│   │   ├── api/report/          # AI report generator
│   │   ├── [lang]/week/         # SSR week pages (SEO)
│   │   └── feed.xml/            # Atom 1.0 feed
│   ├── components/              # React components
│   │   ├── feeds/               # Tech, Investment, Tips feeds
│   │   └── video-embed.tsx      # YouTube player
│   ├── lib/                     # Utils, types, API client
│   └── middleware.ts            # Crawler bypass + welcome gate
│
├── ai-hub-backend/              # Backend (FastAPI)
│   ├── app/
│   │   ├── models/              # SQLAlchemy models
│   │   ├── routers/             # API endpoints
│   │   └── services/            # Business logic
│   │       ├── collector.py     # 4-stage pipeline
│   │       ├── llm_processor.py # Two-model LLM approach
│   │       └── youtube_fetcher.py
│   ├── alembic/                 # DB migrations
│   ├── scripts/                 # CLI tools (daily/weekly collect)
│   └── Dockerfile
│
├── docs/                        # Translated READMEs
└── LICENSE
```

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure your code passes the CI checks:
- **Frontend**: `tsc --noEmit` + `next build`
- **Backend**: `ruff check`

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**[Live Demo](https://www.datacubeai.space)** · **[Report Bug](https://github.com/Rswcf/DataCube-AI-Space/issues)** · **[Request Feature](https://github.com/Rswcf/DataCube-AI-Space/issues)**

If you find this project useful, please consider giving it a star!

</div>
