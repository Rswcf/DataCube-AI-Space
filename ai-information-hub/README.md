# DataCube AI Information Hub

Bilingual (DE/EN) weekly AI news aggregator. See [CLAUDE.md](./CLAUDE.md) for full documentation.

## Quick Start

```bash
# Frontend
npm install && npm run dev     # localhost:3000

# Data pipeline (requires OPENROUTER_API_KEY)
pip install -r scripts/requirements.txt
python scripts/collect.py --dry-run  # Test RSS fetching
```

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, Shadcn/ui
- **Data**: DeepSeek V3.2 via OpenRouter, RSS feeds, HN Algolia API
- **Deploy**: Vercel (auto-deploy on merge)
