# DataCube AI Information Hub

Bilingual (DE/EN) weekly AI news aggregator for internal teams — curates tech breakthroughs, investment news, and practical tips from RSS feeds via Claude AI. Built with Next.js 16 + React 19 + Tailwind CSS 4 + Shadcn/ui, deployed on Vercel.

**Status**: Core app complete (3 feed types, bilingual, week navigation, dark/light theme). Data pipeline automated via GitHub Actions.

## Architecture

```
┌─────────────────── Data Pipeline ───────────────────┐
│                                                      │
│  RSS Feeds (10 sources)                              │
│       ↓                                              │
│  scripts/collect.py  ──→  Claude Sonnet 4 (OpenRouter)│
│       ↓                                              │
│  public/data/{weekId}/                               │
│    ├── tech.json                                     │
│    ├── investment.json                               │
│    ├── tips.json                                     │
│    └── trends.json                                   │
│                                                      │
└──────────────────────────────────────────────────────┘

┌─────────────────── Frontend ────────────────────────┐
│                                                      │
│  useEffect + fetch(/data/{weekId}/xxx.json)          │
│       ↓                                              │
│  React components (all "use client")                 │
│       ↓                                              │
│  Bilingual render via useSettings().t("key")         │
│                                                      │
└──────────────────────────────────────────────────────┘

┌─────────────────── Deployment ──────────────────────┐
│                                                      │
│  weekly-collect.yml (Mon 08:00 UTC)                  │
│       ↓                                              │
│  Creates PR "AI Weekly: 2025-kwXX"                   │
│       ↓                                              │
│  Review + optional /regenerate comments              │
│       ↓                                              │
│  Merge → Vercel auto-deploy                          │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Directory Structure

```
app/
  layout.tsx              — Root layout (SettingsProvider, fonts, metadata)
  page.tsx                — Home page (3-column responsive layout, tab switching)
  globals.css             — Global styles

components/
  feeds/
    tech-feed.tsx         — AI tech progress feed
    investment-feed.tsx   — Investment/funding/M&A feed
    tips-feed.tsx         — Practical tips feed
  feed.tsx                — Main feed container (tab state, animations)
  sidebar.tsx             — Left nav (logo, tabs, theme/language toggles)
  right-sidebar.tsx       — Right column (trends, team, search)
  week-navigation.tsx     — Week selector dropdown
  header.tsx / footer.tsx
  theme-provider.tsx      — next-themes wrapper
  ui/                     — 60+ Shadcn/ui components (Radix-based)

lib/
  settings-context.tsx    — Theme + language context, t() translation fn
  translations.ts         — 80+ bilingual translation keys (DE/EN)
  utils.ts                — cn() class merger (clsx + tailwind-merge)

hooks/
  use-mobile.ts           — Mobile detection
  use-toast.ts            — Toast notifications

public/data/
  weeks.json              — Index of available weeks
  {YYYY-kwWW}/            — Per-week data folder
    tech.json
    investment.json
    tips.json
    trends.json

scripts/
  collect.py              — RSS fetch + LLM processing → JSON
  regenerate.py           — Re-process with human feedback
  sources.yaml            — RSS feed URLs by category
  requirements.txt        — feedparser, openai, pyyaml, requests

.github/workflows/
  weekly-collect.yml      — Automated Monday collection → PR
  regenerate.yml          — PR comment /regenerate trigger
```

## Core Data Contracts

### Week ID Format
`YYYY-kwWW` (e.g., `2025-kw04`)

### JSON Bilingual Structure
All data files use `{ "de": [...], "en": [...] }` at the top level (except `investment.json` which nests by market type first).

### tech.json
```
{ "de": [{ id, author, content, tags, category, iconType, impact, timestamp, metrics, source }], "en": [...] }
```
- `iconType`: `"Brain"` (LLM) | `"Server"` (infra) | `"Zap"` (research) | `"Cpu"` (safety)
- `impact`: `"critical"` | `"high"` | `"medium"` | `"low"`

### investment.json
```
{
  "primaryMarket":   { "de": [{ company, amount, round, investors, valuation, ... }], "en": [...] },
  "secondaryMarket": { "de": [{ ticker, price, change, direction, marketCap, ... }], "en": [...] },
  "ma":              { "de": [{ acquirer, target, dealValue, dealType, ... }], "en": [...] }
}
```

### tips.json
```
{ "de": [{ id, author, platform, content, tip, category, difficulty, timestamp, metrics }], "en": [...] }
```
- `difficulty` (de): `"Anfänger"` | `"Mittel"` | `"Fortgeschritten"`
- `difficulty` (en): `"Beginner"` | `"Intermediate"` | `"Advanced"`
- `platform`: `"X"` | `"Reddit"`

### trends.json
```
{
  "trends":      { "de": [{ category, title, posts }], "en": [...] },
  "teamMembers": { "de": [{ name, role, handle, avatar }], "en": [...] }
}
```

## Key Conventions

- **All components are `"use client"`** — pure client-side rendering
- **Data loading pattern**: `useEffect` + `fetch(/data/{weekId}/xxx.json)` + language fallback
- **Translation**: `useSettings()` → `t("key")`, definitions in `lib/translations.ts`
- **Theme**: dark/light via `next-themes`, persisted to localStorage, default dark
- **Language**: DE default, stored in localStorage, accessed via `useSettings().language`
- **Path alias**: `@/*` → project root (e.g., `@/components/ui/button`)
- **Build config**: `images.unoptimized: true` (static-friendly)

## Commands

### Frontend
```bash
npm run dev              # Dev server at localhost:3000
npm run build            # Production build
npm run lint             # ESLint
```

### Data Collection
```bash
export OPENROUTER_API_KEY=...
python scripts/collect.py                     # Current week
python scripts/collect.py --week 2025-kw05    # Specific week
python scripts/collect.py --dry-run           # RSS only, skip LLM
```

### Content Regeneration
```bash
python scripts/regenerate.py --week 2025-kw04 --section tech \
    --feedback "Too technical, simplify"

python scripts/regenerate.py --week 2025-kw04 --section investment \
    --id 3 --feedback "Not relevant"

python scripts/regenerate.py --week 2025-kw04 --all \
    --feedback "More casual style"
```

### GitHub PR Comment (triggers regenerate.yml)
```
/regenerate tech --feedback "simplify language"
/regenerate investment 3 --feedback "not relevant"
/regenerate all --feedback "more casual"
```

## Common Development Tasks

### Add a new week of data
1. Run `python scripts/collect.py --week YYYY-kwWW`
2. Outputs to `public/data/YYYY-kwWW/` (4 JSON files) and updates `public/data/weeks.json`
3. No frontend changes needed — week navigation reads `weeks.json` dynamically

### Add a new RSS source
1. Edit `scripts/sources.yaml` — add URL under `tech`, `investment`, or `tips`
2. Run `collect.py` to verify the feed parses correctly

### Add a new feed type (e.g., "regulation")
1. Create `components/feeds/regulation-feed.tsx` (follow `tech-feed.tsx` pattern)
2. Add tab in `components/feed.tsx` and `components/sidebar.tsx`
3. Add mobile tab in `app/page.tsx`
4. Add LLM prompt function in `scripts/collect.py` (follow `process_tech_articles()`)
5. Add translation keys in `lib/translations.ts`

### Modify translations
1. Edit `lib/translations.ts` — add/change keys in both `de` and `en` objects
2. Use in components via `const { t } = useSettings(); t("yourKey")`
