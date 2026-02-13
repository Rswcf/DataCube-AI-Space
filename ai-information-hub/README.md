# Data Cube AI Information Hub

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
- **LLM**: OpenRouter (aurora-alpha for chat, deepseek-v3.2 for processing)
- **Data**: RSS feeds, Hacker News, YouTube

## Features

- 3 feed types: Tech, Investment, Tips — each with distinct visual identity
- YouTube video integration
- Daily + weekly collection modes (daily: 10 tech, 5 tips, 5 investment, 2 videos)
- Bilingual content (DE/EN)
- Dark/light theme
- AI chat assistant
- AI report generator (one-click streaming report with GFM table rendering, export as Word/HTML/Markdown/Text/JSON)
- Extended FAB buttons: Report and Chat show pill-shaped icon + text label on first visit, auto-collapse to circles after 4s, re-expand on desktop hover
- Accessible UI (44px touch targets, focus-visible, aria-hidden, skip-to-content, prefers-reduced-motion, ARIA dialog on mobile drawers, body scroll lock, safe-area-inset support)
- Mobile optimized (overflow-x-hidden, dynamic viewport height, conditional search trends, flex-wrap investment cards, touch-action on scroll containers, mobile feature parity with Support + Newsletter in settings drawer)
- Distinctive design: Instrument Serif display font on all section headers, section-specific color accents and hover states (tech=blue, invest=amber, tips=emerald), staggered card entrance animations, shimmer loading skeletons, gradient section headers, trend rankings, tabular-nums on financial data
- No authentication required
