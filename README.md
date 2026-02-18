<div align="center">

# 🧊 Data Cube AI

### Your daily AI news, curated by AI.

The open-source alternative to Feedly AI and Google News — a multilingual (8 languages) AI news aggregator that curates tech breakthroughs, investment deals, practical tips, and YouTube videos through a 4.5-stage LLM pipeline.

[![GitHub stars](https://img.shields.io/github/stars/Rswcf/DataCube-AI-Space?style=social)](https://github.com/Rswcf/DataCube-AI-Space/stargazers)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-datacubeai.space-brightgreen)](https://www.datacubeai.space)
[![CI](https://img.shields.io/github/actions/workflow/status/Rswcf/DataCube-AI-Space/ci.yml?label=CI)](https://github.com/Rswcf/DataCube-AI-Space/actions)
[![Last Commit](https://img.shields.io/github/last-commit/Rswcf/DataCube-AI-Space)](https://github.com/Rswcf/DataCube-AI-Space/commits/main)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Rswcf/DataCube-AI-Space/pulls)

[English](README.md) | [简体中文](docs/README.zh-CN.md) | [Deutsch](docs/README.de.md) | [Français](docs/README.fr.md) | [Español](docs/README.es.md) | [Português](docs/README.pt-BR.md) | [日本語](docs/README.ja.md) | [한국어](docs/README.ko.md)

**[Live Demo](https://www.datacubeai.space)** · **[Report Bug](https://github.com/Rswcf/DataCube-AI-Space/issues)** · **[Request Feature](https://github.com/Rswcf/DataCube-AI-Space/discussions)**

</div>

---

## Demo

<div align="center">

https://github.com/user-attachments/assets/9dddaaed-e473-4350-97de-0346cacb6660

</div>

## Why Data Cube AI?

| Problem | Solution |
|---------|----------|
| 500+ AI articles published daily — you read 3 | **22 sources scanned automatically**, top stories surface |
| Scattered across Hacker News, Reddit, ArXiv, RSS | **One unified dashboard** with tech, investment, tips |
| English-only or single-language tools | **Bilingual DE/EN** — every article in both languages |
| Paid tools (Feedly AI $18/mo, etc.) | **Free & open source**, MIT licensed, self-hostable |
| No actionable context | **AI Chat** to ask questions, **AI Reports** with one-click export |

## Features

| | Feature | Description |
|---|---------|-------------|
| 📡 | **Tech Feed** | AI/ML breakthroughs with embedded YouTube videos and impact ratings |
| 💰 | **Investment Tracker** | Funding rounds, live stock prices (Polygon.io), M&A deals |
| 💡 | **Practical Tips** | Curated from 14 Reddit communities and expert blogs |
| 🌐 | **8 Languages** | DE, EN, ZH, FR, ES, PT, JA, KO — free-model translation pipeline |
| 📅 | **Daily + Weekly** | Automated daily collection with weekly rollup views |
| 🤖 | **AI Chat** | Ask questions about the current week's AI news |
| 📊 | **AI Reports** | One-click streaming report — export to Word, HTML, Markdown, Text, JSON |
| 📧 | **Newsletter** | Automated daily digest via Resend — one email per subscriber in their preferred language |
| 🔍 | **SEO/GEO** | SSR pages, JSON-LD, Atom feed, llms.txt, sitemap |
| ♿ | **Accessible** | WCAG-compliant: focus-visible, ARIA, reduced-motion, skip links |
| 📱 | **Mobile-First** | Dynamic viewport, safe area insets, touch-optimized navigation |

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

- Node.js 18+, Python 3.11+, PostgreSQL
- API keys: [OpenRouter](https://openrouter.ai), [YouTube Data API v3](https://console.cloud.google.com), [Polygon.io](https://polygon.io) (optional)

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
python -m scripts.daily_collect              # Today
python -m scripts.daily_collect --date 2026-02-07  # Specific date
python -m scripts.weekly_collect             # Current week
python -m scripts.weekly_collect --week 2026-kw06  # Specific week
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, Shadcn/ui, TypeScript |
| **Backend** | FastAPI, SQLAlchemy, Alembic, PostgreSQL |
| **LLM Classification** | GLM-4.5-Air (OpenRouter, free tier) |
| **LLM Processing** | DeepSeek V3.2 (OpenRouter) |
| **Translation** | Free model chain: 6 models (OpenRouter, zero cost) |
| **Chat & Reports** | Aurora Alpha (OpenRouter) |
| **Newsletter** | Resend (sending) + Beehiiv (subscribers) |
| **Stock Data** | Polygon.io API |
| **Hosting** | Vercel (frontend), Railway (backend + DB + cron) |
| **Design** | Newsreader display font, isometric cube logo, section-specific color accents, staggered animations |

## Data Pipeline

The backend processes news through a 4-stage pipeline:

| Stage | What happens | Output |
|-------|-------------|--------|
| **1. Fetch** | Collect from RSS, Hacker News, YouTube; filter by period boundaries | ~210 raw items |
| **2. Classify** | LLM classifies into tech/investment/tips (tips sources skip this) | Categorized pool |
| **3. Process** | Parallel LLM processing: generate bilingual summaries, extract entities | 30 tech + 21 investment + 15 tips + 5 videos |
| **3.5. Translate** | Translate EN → ZH, FR, ES, PT, JA, KO via free model chain (resilient: JSON validation + small-batch retry) | 6 extra languages per item |
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
| `/api/admin/newsletter` | POST | Send newsletter (per-subscriber language) |

Period IDs: daily `YYYY-MM-DD` or weekly `YYYY-kwWW`

Full API docs available at `/docs` (Swagger UI) when running the backend.

## Environment Variables

<details>
<summary>Frontend (<code>ai-information-hub/.env.local</code>)</summary>

```bash
OPENROUTER_API_KEY=sk-or-v1-...     # For chat & report features
YOUTUBE_API_KEY=AIza...              # For video metadata
NEXT_PUBLIC_API_URL=http://localhost:8000/api  # Backend URL
```

</details>

<details>
<summary>Backend (<code>ai-hub-backend/.env</code>)</summary>

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/aihub
OPENROUTER_API_KEY=sk-or-v1-...     # For LLM classification & processing
YOUTUBE_API_KEY=AIza...              # For video fetching
POLYGON_API_KEY=...                  # Optional: real-time stock data
ADMIN_API_KEY=your-secret-key       # Protects admin endpoints
RESEND_API_KEY=re_...               # Newsletter sending
BEEHIIV_API_KEY=...                 # Subscriber management
BEEHIIV_PUBLICATION_ID=pub_...      # Beehiiv publication
NEWSLETTER_FROM_EMAIL=newsletter@datacubeai.space
CORS_ORIGINS=["http://localhost:3000"]
```

</details>

## Deployment

**Frontend → Vercel** — Set environment variables in dashboard. Auto-deploys on push to `main`.

```bash
cd ai-information-hub && vercel --prod
```

**Backend → Railway** — Auto-applies Alembic migrations on startup. Configure cron for daily collection at 22:00 UTC.

```bash
cd ai-hub-backend && railway up
```

## Project Structure

```
DataCube-AI-Space/
├── ai-information-hub/          # Frontend (Next.js)
│   ├── app/                     # Pages + API routes
│   │   ├── api/chat/            # AI chat endpoint
│   │   ├── api/report/          # AI report generator
│   │   ├── api/subscribe/       # Newsletter signup (Beehiiv)
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
│   │       ├── llm_processor.py # LLM processing + resilient translation
│   │       ├── youtube_fetcher.py
│   │       └── newsletter_sender.py  # Resend + Beehiiv
│   ├── alembic/                 # DB migrations
│   ├── scripts/                 # CLI tools (daily/weekly collect)
│   └── Dockerfile
│
├── docs/                        # Translated READMEs (8 languages)
└── LICENSE
```

## Contributing

Contributions are welcome! See the [Contributing Guide](CONTRIBUTING.md) for details.

**Quick version:**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Check out our [good first issues](https://github.com/Rswcf/DataCube-AI-Space/labels/good%20first%20issue) to get started.

## Star History

<div align="center">

[![Star History Chart](https://api.star-history.com/svg?repos=Rswcf/DataCube-AI-Space&type=Date)](https://star-history.com/#Rswcf/DataCube-AI-Space&Date)

</div>

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**If you find this project useful, please consider giving it a ⭐**

**[Live Demo](https://www.datacubeai.space)** · **[Report Bug](https://github.com/Rswcf/DataCube-AI-Space/issues)** · **[Request Feature](https://github.com/Rswcf/DataCube-AI-Space/discussions)** · **[Discussions](https://github.com/Rswcf/DataCube-AI-Space/discussions)**

</div>
