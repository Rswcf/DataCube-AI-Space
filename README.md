# DataCube AI Space

Bilingual (DE/EN) daily + weekly AI news aggregator with YouTube video integration. Curates tech breakthroughs, investment news, practical tips, and videos from RSS feeds, Hacker News, and YouTube.

## Projects

| Project | Description | Stack |
|---------|-------------|-------|
| [ai-information-hub/](./ai-information-hub/) | Frontend | Next.js 16, React 19, Tailwind CSS 4, Shadcn/ui |
| [ai-hub-backend/](./ai-hub-backend/) | Backend API | FastAPI, PostgreSQL, SQLAlchemy |

## Features

- **Tech Feed** - AI/ML breakthroughs and news with embedded YouTube videos
- **Investment Tracking** - Primary funding, Secondary rounds, M&A deals
- **Practical Tips** - Curated from Reddit communities and tech blogs
- **Bilingual Content** - German and English summaries
- **Daily + Weekly Mode** - Daily automated collection with weekly rollup view
- **Chat Assistant** - Ask questions about the AI news
- **Accessible UI** - 44px touch targets, focus-visible states, aria-hidden decorative icons, skip-to-content link, prefers-reduced-motion, mobile bottom padding
- **Distinctive Design** - Instrument Serif display font on all section headers, section-specific color accents and hover states, staggered card animations, shimmer loading, gradient section headers, trend rankings with in-SPA filtering, tabular-nums on financial data

## Architecture

```
Frontend (Vercel)              Backend (Railway)
┌─────────────────┐           ┌─────────────────────────────┐
│  Next.js App    │    API    │  FastAPI                    │
│  - Tech Feed    │◄─────────►│  - Data Collection Pipeline │
│  - Investment   │           │  - LLM Processing           │
│  - Tips         │           │  - PostgreSQL Storage       │
│  - Chat         │           │  - REST API                 │
└─────────────────┘           └─────────────────────────────┘
                                        │
                              ┌─────────┴─────────┐
                              │   Data Sources    │
                              ├───────────────────┤
                              │ • 22 RSS Feeds    │
                              │ • Hacker News API │
                              │ • YouTube API     │
                              └───────────────────┘
```

## Quick Start

### Frontend

```bash
cd ai-information-hub
npm install
npm run dev    # http://localhost:3000
```

### Backend

```bash
cd ai-hub-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m scripts.init_db --migrate-all
uvicorn app.main:app --reload    # http://localhost:8000/docs
```

## Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | https://www.datacubeai.space |
| Backend API | Railway | https://api-production-3ee5.up.railway.app |

## License

Private repository - KPMG Internal
