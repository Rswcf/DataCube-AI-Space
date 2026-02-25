# Data Cube AI Information Hub

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)

Multilingual (8 languages: DE/EN/ZH/FR/ES/PT/JA/KO) daily + weekly AI news aggregator with YouTube video integration.

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
- **LLM**: OpenRouter (openrouter/free for chat, deepseek-v3.2 for processing)
- **Data**: RSS feeds, Hacker News, YouTube

## Features

- 3 feed types: Tech, Investment, Tips — each with distinct visual identity
- YouTube video integration
- Daily + weekly collection modes (daily: 10 tech, 5 tips, 5 investment, 2 videos)
- 8-language content (DE, EN, ZH, FR, ES, PT, JA, KO)
- Dark/light theme
- AI chat assistant
- AI report generator (one-click streaming report with GFM table rendering, export as Word/HTML/Markdown/Text/JSON)
- Two-step newsletter signup with 8-language selector (email → language grid → confirm), Beehiiv custom field
- Extended FAB buttons: Report and Chat show pill-shaped icon + text label on first visit, auto-collapse to circles after 4s, re-expand on desktop hover
- Accessible UI (44px touch targets, focus-visible, aria-hidden, skip-to-content, prefers-reduced-motion, ARIA dialog on mobile drawers, body scroll lock, safe-area-inset support)
- Editorial standards page (/about) with methodology, data sources, AI disclosure
- Dynamic OG images per week page via @vercel/og (edge runtime)
- FAQ structured data on topic pages (localized in all 8 languages)
- Keyword-optimized SEO: localized metadata, H1/H2/H3 headings, lead paragraphs, and breadcrumbs across all 8 languages
- Login page supports all 8 languages with language selector row
- Unsubscribe page (/unsubscribe) with instructions
- Non-www → www permanent redirect via vercel.json
- Mobile optimized (overflow-x-hidden, dynamic viewport height, conditional search trends, flex-wrap investment cards, touch-action on scroll containers, mobile feature parity with Support + Newsletter in settings drawer)
- Distinctive design: Isometric cube logo (3 brand-colored faces: blue/tech, teal/tips, amber/invest), Newsreader display font on all section headers, section-specific color accents and hover states, staggered card entrance animations, shimmer loading skeletons, gradient section headers, trend rankings, tabular-nums on financial data
- Monetization: Developer portal (/developers), pricing page (/pricing), enterprise page (/for-teams), AI job board (/jobs), premium upgrade (/premium), Stripe checkout integration
- Subscription badge component for tier display
- No authentication required
