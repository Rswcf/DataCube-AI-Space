# DataCube AI Information Hub

Bilingual (DE/EN) daily + weekly AI news aggregator with YouTube video integration. See [CLAUDE.md](./CLAUDE.md) for full documentation.

**Live**: https://www.datacubeai.space (no login required)

## Quick Start

```bash
# Install and run
npm install
npm run dev     # localhost:3000

# Deploy to Vercel
vercel --prod
```

## Environment Flags

- `HOMEPAGE_SHOW_TOP_LINKS`:
  - `false` (default): hide homepage top quick-link chips (periods + trending topics)
  - `true`: show homepage top quick-link chips

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, Shadcn/ui
- **Backend**: FastAPI + PostgreSQL on Railway
- **LLM**: OpenRouter (glm-4.5-air for chat, deepseek-v3.2 for processing)
- **Data**: RSS feeds, Hacker News, YouTube

## Features

- 3 feed types: Tech, Investment, Tips
- YouTube video integration
- Daily + weekly collection modes (daily: 10 tech, 5 tips, 5 investment, 2 videos)
- Bilingual content (DE/EN)
- Dark/light theme
- AI chat assistant
- No authentication required
