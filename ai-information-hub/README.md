# Data Cube AI Information Hub

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)

Multilingual (8 languages: DE/EN/ZH/FR/ES/PT/JA/KO) daily + weekly AI news aggregator with YouTube video integration, article pages, topic hubs, and free AI tool pages.

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
- **LLM**: OpenRouter (openrouter/free for chat, deepseek-v4-flash for processing with deepseek-v3.2 fallback)
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
- SSR period, article, topic, and tool pages for SEO/GEO (`/[lang]/week/[periodId]`, `/[lang]/news/[periodId]/[storyId]`, `/[lang]/topic/[topic]`, `/[lang]/tools/*`)
- Magazine-style trend index with period-scoped links into topic hubs
- Extended FAB buttons: Report and Chat show pill-shaped icon + text label on first visit, auto-collapse to circles after 4s, re-expand on desktop hover
- Accessible UI (44px touch targets, focus-visible, aria-hidden, skip-to-content, prefers-reduced-motion, ARIA dialog on mobile drawers, body scroll lock, safe-area-inset support)
- Trust pages: `/about`, `/editorial-policy`, `/source-methodology`, `/corrections`, `/ai-disclosure`, `/contact`
- Dynamic OG images per week page via @vercel/og (edge runtime)
- FAQ structured data on topic pages (localized in all 8 languages)
- Keyword-optimized SEO: localized metadata, H1/H2/H3 headings, lead paragraphs, and breadcrumbs across all 8 languages
- Login page supports all 8 languages with language selector row
- Unsubscribe page (/unsubscribe) with instructions
- Non-www → www permanent redirect via vercel.json
- Mobile optimized (overflow-x-hidden, dynamic viewport height, conditional search trends, flex-wrap investment cards, touch-action on scroll containers, mobile feature parity with Support + Newsletter in settings drawer)
- Distinctive editorial design: Isometric cube logo, Newsreader display headlines, Geist UI labels, thin rule dividers, numbered trend rankings, section-specific accents, staggered card entrance animations, shimmer loading skeletons, tabular-nums on financial data
- Monetization surfaces: `/for-teams`, `/premium`, Stripe checkout proxy, and backend developer API/job-board endpoints
- Subscription badge component for tier display
- No authentication required
