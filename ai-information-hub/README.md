# DataCube AI Information Hub

Bilingual (DE/EN) weekly AI news aggregator with YouTube video integration. See [CLAUDE.md](./CLAUDE.md) for full documentation.

**Live**: https://www.datacubeai.space (no login required)

## Quick Start

```bash
# Install and run
npm install
npm run dev     # localhost:3000

# Deploy to Vercel
vercel --prod
```

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, Shadcn/ui
- **Backend**: FastAPI + PostgreSQL on Railway
- **LLM**: OpenRouter (glm-4.5-air for chat, deepseek-v3.2 for processing)
- **Data**: RSS feeds, Hacker News, YouTube

## Features

- 3 feed types: Tech, Investment, Tips
- YouTube video integration (5 videos/week)
- Bilingual content (DE/EN)
- Dark/light theme
- AI chat assistant
- No authentication required
