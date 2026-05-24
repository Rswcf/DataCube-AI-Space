# AI Hub Backend

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)

FastAPI backend for the AI Information Hub — multilingual (8 languages) daily + weekly AI news aggregator with YouTube video integration.

## Features

- RESTful API for tech news, investment data, tips, trends
- **Daily + weekly collection modes** (daily: reduced output; weekly: full output)
- YouTube video integration (interspersed in tech feed)
- **Real-time stock data** via Polygon.io API (Secondary Market)
- PostgreSQL database with SQLAlchemy ORM
- 4-stage data collection pipeline
- Two-model LLM approach (classifier + processor)
- Tips sources bypass classification (Reddit, Simon Willison)
- **8-language support** (DE, EN, ZH, FR, ES, PT, JA, KO) with resilient free-model translation pipeline
- Period ID support: daily `YYYY-MM-DD` or weekly `YYYY-kwWW`
- **Automated newsletter** via Resend + Beehiiv with per-subscriber language preference (idempotent send-lock per `(period_id, language)`; safe against dual-cron slots + manual re-triggers)
- **Developer API** with tiered rate limiting (free/premium/business API keys)
- **AI Job Board** for DACH region (job listings CRUD with admin controls)
- **Stripe Premium Subscriptions** (checkout, webhooks, subscription management)

## LLM Models

| Purpose | Model | Notes |
|---------|-------|-------|
| **Classification** | `z-ai/glm-4.5-air:free` | Free tier, classifies tech/investment |
| **Content Processing** | `deepseek/deepseek-v4-flash` | Generates bilingual content (DE/EN), translated to 6 more via free chain. `deepseek/deepseek-v3.2` as paid fallback |
| **Translation** | 8 free models + paid tail (`deepseek-v4-flash` → `v3.2`) | EN → ZH, FR, ES, PT, JA, KO. Paid tier only fires when full free chain 429s — historical cost ~$0/day |

## Data Collection Pipeline (Overview)

```
Stage 1: Fetch raw data
    • RSS Feeds (22 sources)
    • Hacker News (Algolia API)
    • YouTube (Data API v3)
    ↓
Stage 2: Classify articles
    • Tips sources → skip classification (direct to tips)
    • Other sources → LLM classification (tech/investment)
    ↓
Stage 3: Parallel LLM processing
    • Tech: 30 posts (weekly) / 10 posts (daily)
    • Investment: primary/secondary/M&A — 7 each (weekly) / 5 total (daily)
    • Tips: 15 per language (weekly) / 5 (daily)
    • Videos: 5 summaries (weekly) / 2 (daily)
    ↓
Stage 3.5: Translate EN → 6 languages (free model chain)
    • ZH, FR, ES, PT, JA, KO
    • Resilient: JSON validation retries across 6-model chain
    • Smaller batch fallback (size=3) on parse failure
    ↓
Stage 4: Save to PostgreSQL (translations in JSONB column)
    • `_nn(value, default)` helper coalesces LLM `null` → default
      at every NOT NULL save site (old `.get("x", default)` only
      fired on missing keys, not explicit `null`)
    • `set_collection_status()` clears stale `error`/`completed_at`
      on transition to `running`, and clears `error` on
      `completed`/`empty`
```

---

## Complete Data Pipeline (Deep Dive)

This section provides a comprehensive overview of the entire data flow from source fetching to frontend display.

```
╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                    AI HUB BACKEND - COMPLETE DATA PIPELINE                                    ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         STAGE 1: DATA FETCHING                                               │
│                                         collector.py: stage1_fetch_and_store()                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                      │
        ┌─────────────────────────────────────────────┼─────────────────────────────────────────────┐
        │                                             │                                             │
        ▼                                             ▼                                             ▼
┌───────────────────────┐                 ┌───────────────────────┐                 ┌───────────────────────┐
│   RSS FEEDS (22)      │                 │    HACKER NEWS API    │                 │    YOUTUBE API        │
│   rss_fetcher.py      │                 │    hn_fetcher.py      │                 │   youtube_fetcher.py  │
├───────────────────────┤                 ├───────────────────────┤                 ├───────────────────────┤
│ Tech Sources:         │                 │ Algolia Search API    │                 │ Search keywords (25): │
│ • Hugging Face Blog   │                 │ • 18 business queries │                 │ • "AI news this week" │
│ • MIT Tech Review     │                 │ • min_points: 100     │                 │ • "ChatGPT for biz"   │
│ • The Decoder         │                 │ • days: 7             │                 │ • "AI for Excel"      │
│                       │                 │ • limit: 50           │                 │ • "KI News deutsch"   │
│ Investment Sources:   │                 │                       │                 │                       │
│ • TechCrunch Funding  │                 │ HN Queries include:   │                 │ Fetches:              │
│ • Crunchbase News     │                 │ • AI, LLM, ChatGPT    │                 │ • Video metadata      │
│ • Sifted, VentureBeat │                 │ • Perplexity, DeepSeek│                 │ • Channel info        │
│ • 36Kr (Chinese)      │                 │ • AI startup/funding  │                 │ • Transcripts         │
│                       │                 │                       │                 │                       │
│ M&A Sources (7):      │                 │                       │                 │                       │
│ • See M&A section     │                 │                       │                 │                       │
│                       │                 │                       │                 │                       │
│ Tips Sources (14):    │                 │                       │                 │                       │
│ • Simon Willison Blog │                 │                       │                 │                       │
│ • One Useful Thing    │                 │                       │                 │                       │
│ • Reddit: ChatGPT,    │                 │                       │                 │                       │
│   ClaudeAI, OpenAI,   │                 │                       │                 │                       │
│   perplexity_ai,      │                 │                       │                 │                       │
│   NotebookLM, etc.    │                 │                       │                 │                       │
└───────────┬───────────┘                 └───────────┬───────────┘                 └───────────┬───────────┘
            │ ~150 articles                           │ ~50 articles                            │ ~10 videos
            │                                         │                                         │
            └─────────────────────────────────────────┼─────────────────────────────────────────┘
                                                      │
                                                      ▼
                                    ┌─────────────────────────────────────┐
                                    │      Period Boundary Filter          │
                                    │   get_period_boundaries(period_id)  │
                                    │   is_article_in_period()            │
                                    ├─────────────────────────────────────┤
                                    │ Weekly: Week 06 = 2026-02-02 ~      │
                                    │         2026-02-08                  │
                                    │ Daily:  2026-02-07 = single day     │
                                    │ Articles outside boundary filtered  │
                                    │ No-date articles: lenient (keep)    │
                                    └─────────────────┬───────────────────┘
                                                      │
                                                      │ After filter: ~100 articles + 10 videos
                                                      ▼
                                    ┌─────────────────────────────────────┐
                                    │        Save to Database             │
                                    │   RawArticle / RawVideo tables      │
                                    └─────────────────┬───────────────────┘
                                                      │
                                                      ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         STAGE 2: LLM CLASSIFICATION                                          │
│                                         collector.py: stage2_classify_articles()                             │
│                                         llm_processor.py: classify_articles()                                │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                      │
                                                      ▼
                              ┌────────────────────────────────────────────────┐
                              │           LLM Classifier                       │
                              │   Model: z-ai/glm-4.5-air:free (OpenRouter)    │
                              │   Temperature: 0.1 (very low randomness)       │
                              ├────────────────────────────────────────────────┤
                              │   Input: ~100 articles (title + summary)       │
                              │                                                │
                              │   Classification Rules:                        │
                              │   • "tech": breakthroughs, models, papers      │
                              │   • "investment": funding, VC, IPO, M&A        │
                              │   • "tips": tutorials, prompts, workflows      │
                              │                                                │
                              │   Output per article:                          │
                              │   {                                            │
                              │     "index": 0,                                │
                              │     "section": "tech",                         │
                              │     "relevance": 0.9,    ← importance score    │
                              │     "duplicate_of": null ← deduplication       │
                              │   }                                            │
                              └────────────────────┬───────────────────────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────────┐
                    │                              │                              │
                    ▼                              ▼                              ▼
        ┌───────────────────┐          ┌───────────────────┐          ┌───────────────────┐
        │  Tips Sources     │          │  Sort by          │          │  Duplicate        │
        │  Special Handling │          │  Relevance DESC   │          │  Detection        │
        ├───────────────────┤          ├───────────────────┤          ├───────────────────┤
        │ Reddit/Simon skip │          │ High-score first  │          │ duplicate_of →    │
        │ LLM classification│          │ for selection     │          │ points to better  │
        │ Direct tags:      │          │                   │          │ article on same   │
        │ section="tips"    │          │                   │          │ topic             │
        │ relevance=0.8     │          │                   │          │                   │
        └───────────────────┘          └───────────────────┘          └───────────────────┘
                    │                              │                              │
                    └──────────────────────────────┼──────────────────────────────┘
                                                   │
                                                   ▼
                              ┌────────────────────────────────────────────────┐
                              │              Classified Article Pool           │
                              ├────────────────────────────────────────────────┤
                              │   tech_articles:       ~15-30 (by relevance)   │
                              │   investment_articles: ~60-100                 │
                              │   tips_articles:       ~10-15                  │
                              │   videos:              ~10                     │
                              └────────────────────┬───────────────────────────┘
                                                   │
                                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    STAGE 3: PARALLEL LLM PROCESSING                                          │
│                                    collector.py: stage3_parallel_processing()                                │
│                                    ThreadPoolExecutor(max_workers=4)                                         │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                   │
         ┌─────────────────────┬───────────────────┼───────────────────┬─────────────────────┐
         │                     │                   │                   │                     │
         ▼                     ▼                   ▼                   ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  process_tech   │   │process_investment│  │  process_tips   │   │ process_videos  │   │ generate_trends │
│    _articles()  │   │   _articles()   │   │   _articles()   │   │       ()        │   │       ()        │
├─────────────────┤   ├─────────────────┤   ├─────────────────┤   ├─────────────────┤   ├─────────────────┤
│ Model:          │   │ Model:          │   │ Model:          │   │ Model:          │   │ Model:          │
│ deepseek-v4     │   │ deepseek-v4     │   │ deepseek-v4     │   │ deepseek-v4     │   │ deepseek-v4     │
│ Temp: 0.3       │   │ Temp: 0.3       │   │ Temp: 0.2       │   │ Temp: 0.3       │   │ Temp: 0.3       │
├─────────────────┤   ├─────────────────┤   ├─────────────────┤   ├─────────────────┤   ├─────────────────┤
│ Input: top 40   │   │ Input: all      │   │ Input: top 15   │   │ Input: top 20   │   │ Input: tech +   │
│ (by relevance)  │   │ investment      │   │ tips articles   │   │ videos          │   │ investment      │
│                 │   │ articles        │   │                 │   │                 │   │ results         │
│ LLM Prompt:     │   │ LLM Prompt:     │   │ LLM Prompt:     │   │ LLM Prompt:     │   │ LLM Prompt:     │
│ "Select 30 most │   │ "Categorize to  │   │ "Extract 15     │   │ "Select 5 most  │   │ "Generate 10    │
│  important"     │   │  3 categories   │   │  practical      │   │  valuable"      │   │  trends"        │
│                 │   │  max 7 each"    │   │  tips"          │   │                 │   │                 │
├─────────────────┤   ├─────────────────┤   ├─────────────────┤   ├─────────────────┤   ├─────────────────┤
│ Output:         │   │ Output:         │   │ Output:         │   │ Output:         │   │ Output:         │
│ 30 posts DE/EN  │   │ 3 categories    │   │ 15 tips DE/EN   │   │ 5 videos DE/EN  │   │ 10 trends       │
│                 │   │ DE/EN each:     │   │                 │   │                 │   │                 │
│ Per post:       │   │ • primaryMarket │   │ Per tip:        │   │ Per video:      │   │                 │
│ • content       │   │ • secondaryMkt  │   │ • content       │   │ • title         │   │                 │
│ • category      │   │ • ma            │   │ • tip           │   │ • summary       │   │                 │
│ • tags          │   │                 │   │ • category      │   │ • category      │   │                 │
│ • impact        │   │ Per entry:      │   │ • platform      │   │ • video_id      │   │                 │
│ • iconType      │   │ • content       │   │ • difficulty    │   │                 │   │                 │
│ • source        │   │ • company       │   │                 │   │                 │   │                 │
│ • sourceUrl     │   │ • amount        │   │                 │   │                 │   │                 │
│ • timestamp     │   │ • investors     │   │                 │   │                 │   │                 │
│                 │   │ • roundCategory │   │                 │   │                 │   │                 │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │ 30 posts            │ 7×3=21              │ 15 tips             │ 5 videos            │ 10 trends
         │                     │                     │                     │                     │
         └─────────────────────┴─────────────────────┼─────────────────────┴─────────────────────┘
                                                     │
                                                     ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    STAGE 4: SAVE TO DATABASE                                                 │
│                                    collector.py: stage4_save_to_database()                                   │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                     │
                                                     ▼
                              ┌────────────────────────────────────────────────┐
                              │           Video Interspersion Strategy         │
                              │   intersperse_videos()                         │
                              ├────────────────────────────────────────────────┤
                              │   30 Tech posts + 5 Videos                     │
                              │   Insert positions: 5, 11, 17, 23, 29          │
                              │   Result: 35 mixed items (with display_order)  │
                              └────────────────────┬───────────────────────────┘
                                                   │
         ┌─────────────────────┬───────────────────┼───────────────────┬─────────────────────┐
         │                     │                   │                   │                     │
         ▼                     ▼                   ▼                   ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│    TechPost     │   │ PrimaryMarket   │   │ SecondaryMarket │   │     MAPost      │   │    TipPost      │
│     Table       │   │   Post Table    │   │   Post Table    │   │     Table       │   │     Table       │
├─────────────────┤   ├─────────────────┤   ├─────────────────┤   ├─────────────────┤   ├─────────────────┤
│ 35 records      │   │ ~7 records      │   │ ~7 records      │   │ ~7 records      │   │ 15 records      │
│ (30 posts +     │   │                 │   │                 │   │                 │   │                 │
│  5 videos)      │   │ Round types:    │   │ Stock market:   │   │ M&A deals:      │   │ Tips with:      │
│                 │   │ • Early         │   │ • ticker        │   │ • acquirer      │   │ • tip           │
│ Fields:         │   │ • Series A      │   │ • price         │   │ • target        │   │ • category      │
│ • content_de/en │   │ • Series B      │   │ • change        │   │ • deal_value    │   │ • platform      │
│ • category      │   │ • Series C+     │   │ • direction     │   │ • deal_type     │   │ • difficulty    │
│ • tags          │   │ • Late/PE       │   │ • market_cap    │   │ • industry      │   │                 │
│ • impact        │   │                 │   │                 │   │                 │   │                 │
│ • is_video      │   │                 │   │                 │   │                 │   │                 │
│ • display_order │   │                 │   │                 │   │                 │   │                 │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │                     │                     │                     │                     │
         └─────────────────────┴─────────────────────┼─────────────────────┴─────────────────────┘
                                                     │
                                                     ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              API ENDPOINTS                                                   │
│                                              app/routers/                                                    │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                     │
         ┌─────────────────────┬───────────────────┼───────────────────┬─────────────────────┐
         │                     │                   │                   │                     │
         ▼                     ▼                   ▼                   ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ GET /api/tech/  │   │GET /api/invest- │   │ GET /api/tips/  │   │GET /api/videos/ │   │ GET /api/weeks  │
│    {weekId}     │   │ ment/{weekId}   │   │    {weekId}     │   │    {weekId}     │   │                 │
├─────────────────┤   ├─────────────────┤   ├─────────────────┤   ├─────────────────┤   ├─────────────────┤
│ Returns:        │   │ Returns:        │   │ Returns:        │   │ Returns:        │   │ Returns:        │
│ {               │   │ {               │   │ {               │   │ {               │   │ {               │
│  "de": [...],   │   │  "primaryMkt":  │   │  "de": [...],   │   │  "de": [...],   │   │  "weeks": [     │
│  "en": [...]    │   │    {...},       │   │  "en": [...]    │   │  "en": [...]    │   │   {id, label,   │
│ }               │   │  "secondaryMkt" │   │ }               │   │ }               │   │    current}     │
│                 │   │    {...},       │   │                 │   │                 │   │  ]              │
│ 35 mixed items  │   │  "ma": {...}    │   │ 15 Tips         │   │ 5 video details │   │ }               │
│ (posts+videos)  │   │ }               │   │                 │   │                 │   │                 │
└─────────────────┘   └─────────────────┘   └─────────────────┘   └─────────────────┘   └─────────────────┘
         │                     │                     │                     │                     │
         └─────────────────────┴─────────────────────┼─────────────────────┴─────────────────────┘
                                                     │
                                                     ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                            FRONTEND DISPLAY                                                  │
│                                            ai-information-hub/ (Next.js)                                     │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                     │
         ┌─────────────────────┬───────────────────┼───────────────────┬─────────────────────┐
         │                     │                   │                   │                     │
         ▼                     ▼                   ▼                   ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   TECH FEED     │   │   INVESTMENT    │   │   TIPS FEED     │   │   VIDEO FEED    │   │   WEEK NAV      │
├─────────────────┤   ├─────────────────┤   ├─────────────────┤   ├─────────────────┤   ├─────────────────┤
│ 35 cards        │   │ 3 category tabs │   │ 15 tip cards    │   │ 5 video embeds  │   │ Week selector   │
│ • Article cards │   │ • Primary Mkt   │   │ • Title + detail│   │ • YouTube player│   │ • Current week  │
│ • Video cards   │   │ • Secondary Mkt │   │ • Difficulty    │   │ • Thumbnail     │   │   highlighted   │
│  (at 5,11,17..) │   │ • M&A           │   │ • Platform      │   │ • Duration/views│   │ • History list  │
│                 │   │                 │   │                 │   │                 │   │                 │
│ Impact badges:  │   │ Round badges:   │   │ Difficulty:     │   │ Categories:     │   │                 │
│ 🔴 Critical     │   │ 🌱 Early        │   │ 🟢 Beginner     │   │ 📚 Tutorial     │   │                 │
│ 🟠 High         │   │ 🚀 Series A     │   │ 🟡 Intermediate │   │ 📰 News         │   │                 │
│ 🟡 Medium       │   │ 📈 Series B     │   │ 🔴 Advanced     │   │ 💡 Explanation  │   │                 │
│ 🟢 Low          │   │ 🏢 Series C+    │   │                 │   │                 │   │                 │
│                 │   │ 💼 Late/PE      │   │                 │   │                 │   │                 │
└─────────────────┘   └─────────────────┘   └─────────────────┘   └─────────────────┘   └─────────────────┘
```

### Data Volume Summary (Weekly)

| Stage | Input | Output |
|-------|-------|--------|
| Stage 1 (Fetch) | RSS ~150 + HN ~50 + YouTube ~10 | ~210 raw items |
| Stage 1 (Filter) | ~210 items | ~100 articles + 10 videos |
| Stage 2 (Classify) | ~100 articles | tech ~20 + investment ~80 + tips ~10 |
| Stage 3 (Process) | Classified articles | tech 30 + investment 21 + tips 15 + videos 5 (DE/EN, translated to 6 more) |
| Stage 4 (Save) | Processed content | 71 database records total |

### Data Volume Summary (Daily)

Daily collections use reduced output counts to match the smaller time window:

| Section | Daily Output |
|---------|-------------|
| Tech | 10 posts |
| Investment | 5 entries |
| Tips | 5 tips |
| Videos | 2 videos |

### Key Code Locations

| Functionality | File | Lines |
|--------------|------|-------|
| Classification logic | `llm_processor.py` | 95-161 |
| Tech article selection | `llm_processor.py` | 163-215 |
| Investment processing | `llm_processor.py` | 273-425 |
| Tips processing | `llm_processor.py` | 435-485 |
| Video processing | `llm_processor.py` | 217-271 |
| 4-stage pipeline | `collector.py` | 242-781 |
| Video interspersion | `collector.py` | 210-239 |
| HN fetching | `hn_fetcher.py` | 248-279 |
| Period boundary filter | `collector.py` / `period_utils.py` | — |
| Config settings | `config.py` | 31-37 |

### Importance Evaluation System

Articles are evaluated and selected based on multiple dimensions:

| Dimension | Source | Purpose |
|-----------|--------|---------|
| **Relevance Score** | LLM Classification (0.0-1.0) | Initial sorting + selection |
| **Impact Level** | LLM Processing (critical/high/medium/low) | UI display weight |
| **HN Points** | Hacker News API | Community engagement signal |
| **Source Authority** | Feed reputation (MIT Tech Review, etc.) | LLM implicit consideration |
| **Duplicate Detection** | LLM identifies `duplicate_of` | Deduplication + best selection |

---

## Data Source Configuration

The data sources are optimized for **business users** (consultants, analytics teams) rather than developers.

### Hacker News Queries (18 keywords)

```python
HN_DEFAULT_QUERIES = [
    # General AI
    "AI", "LLM", "generative AI",
    # Major Products & Companies
    "ChatGPT", "Claude", "Gemini", "OpenAI", "Anthropic", "Perplexity",
    # Emerging Models
    "DeepSeek", "Grok",
    # Image & Video Generation
    "Sora", "Midjourney", "Stable Diffusion",
    # Business Applications
    "AI startup", "AI funding", "AI acquisition", "AI enterprise",
]
```

### YouTube Queries (25 keywords)

```python
queries = [
    # AI News
    "AI news this week", "AI business news",
    # Tool Tutorials
    "ChatGPT tutorial", "ChatGPT for business", "Claude AI tutorial",
    "Perplexity AI tutorial", "NotebookLM tutorial",
    # Workplace Productivity
    "AI productivity tips", "AI tools for work", "AI for Excel",
    "AI presentation", "AI automation workflow",
    # Business & Strategy
    "AI in finance", "AI for consulting", "AI strategy business",
    # German Content
    "KI News deutsch", "ChatGPT Tutorial deutsch", "KI Tools deutsch",
]
```

### Excluded (Too Technical)

The following were intentionally excluded as they target developers rather than business users:
- `transformer`, `neural network`, `deep learning`, `machine learning`
- `r/LocalLLaMA`, `r/StableDiffusion`, `r/MachineLearning`
- Developer tools: Cursor, Copilot, Devin

---

## Stock API (Polygon.io Integration)

The Secondary Market section now fetches **real-time stock data** from Polygon.io API instead of relying on LLM-generated prices.

### How It Works

```
Frontend (investment-feed.tsx)
    │
    │ 1. Load secondary market posts (ticker + content only)
    │
    ▼
Backend Proxy (/api/stock/formatted/batch/)
    │
    │ 2. Fetch real-time data from Polygon.io
    │
    ▼
Polygon.io API
    │
    │ 3. Return: price, change%, marketCap
    │
    ▼
Frontend merges data + displays with "Live" badge
```

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/stock/{ticker}` | Single stock (raw data) |
| `GET /api/stock/batch/?tickers=AAPL,NVDA` | Batch stocks (raw data) |
| `GET /api/stock/formatted/{ticker}?language=en` | Pre-formatted for display |
| `GET /api/stock/formatted/batch/?tickers=...&language=de` | Batch formatted |

### Example Response

```json
// GET /api/stock/formatted/NVDA?language=en
{
  "ticker": "NVDA",
  "price": "$180.06",
  "change": "-2.98%",
  "direction": "down",
  "marketCap": "$4.5T",
  "name": "Nvidia Corp"
}

// GET /api/stock/formatted/NVDA?language=de
{
  "ticker": "NVDA",
  "price": "$180.06",
  "change": "-2.98%",
  "direction": "down",
  "marketCap": "$4,5 Bio.",
  "name": "Nvidia Corp"
}
```

### Configuration

Requires `POLYGON_API_KEY` environment variable (Polygon.io Starter Plan: $29/month, 15-min delayed data).

---

## Setup

### Prerequisites

- Python 3.11+
- PostgreSQL database
- API keys:
  - OpenRouter (for LLM)
  - YouTube Data API v3

### Local Development

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
# Key dependencies include: stripe>=8.0.0, slowapi>=0.1.9
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Initialize database:
```bash
python -m scripts.init_db --migrate-all
```

5. Run the server:
```bash
uvicorn app.main:app --reload
```

6. Access API docs at http://localhost:8000/docs

### Database Migrations

Using Alembic for schema migrations:

```bash
# Apply all migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"

# Rollback one migration
alembic downgrade -1
```

#### Migration History (Monetization)

| Migration | Description |
|-----------|-------------|
| `0007_add_developer_api_keys` | `api_keys` table (email, api_key, tier, calls_today, calls_total, is_active) |
| `0008_add_job_listings` | `job_listings` table (title, company, location, salary, tags, listing_type) |
| `0009_add_subscriptions` | `subscriptions` table (email, stripe IDs, tier, status, period dates) |
| `0011_primary_market_amount_nullable` | `primary_market_posts.amount_de/amount_en` made nullable — LLM returns `null` for undisclosed amounts (e.g. SEC EDGAR 8-K unregistered equity sales). Prevents a single null-amount row from aborting the entire stage 4 transaction and wiping the day's data. API layer (`routers/investment.py:44`) still coerces NULL → "N/A" for UI, so the frontend contract is unchanged. |
| `0012_add_newsletter_sends` | `newsletter_sends` table with composite PK `(period_id, language)`, `status ∈ {in_progress, sent, failed}`, `started_at`, `completed_at`, `sent_count`, `error`. Provides idempotency for newsletter delivery (dual-cron slots, manual re-triggers, in-flight retries). |

Chain: 0006 -> 0007 -> 0008 -> 0009 -> 0011 -> 0012

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/weeks` | GET | List periods (weeks with nested days) |
| `/api/weeks/current` | GET | Get current period |
| `/api/tech/{periodId}` | GET | Tech feed (with videos) |
| `/api/investment/{periodId}` | GET | Investment feed |
| `/api/tips/{periodId}` | GET | Tips feed |
| `/api/trends/{periodId}` | GET | Trends feed |
| `/api/videos/{periodId}` | GET | YouTube videos only |
| `/api/stock/{ticker}` | GET | Real-time stock data |
| `/api/stock/batch/?tickers=...` | GET | Batch stock data |
| `/api/stock/formatted/{ticker}` | GET | Pre-formatted stock data |
| `/api/stock/formatted/batch/` | GET | Batch formatted stock data |
| `/api/admin/collect` | POST | Full collection (all stages) |
| `/api/admin/collect/fetch` | POST | Stage 1 only |
| `/api/admin/collect/process` | POST | Stages 2-4 only |
| `/api/admin/collect/ma` | POST | M&A-only reprocessing |
| `/api/admin/newsletter` | POST | Send newsletter (per-subscriber language) |
| `/api/admin/migrate` | POST | Migrate JSON data |
| `/api/developer/register` | POST | Register for API key (returns `dcai_xxx`) |
| `/api/developer/usage` | GET | API key usage stats (requires `X-API-Key`) |
| `/api/developer/rotate-key` | POST | Rotate API key (requires `X-API-Key`) |
| `/api/jobs` | GET | List active job listings (filters: job_type, location, level, search) |
| `/api/jobs/{id}` | GET | Single job listing |
| `/api/jobs` | POST | Create job listing (admin `X-API-Key`) |
| `/api/jobs/{id}` | PUT | Update job listing (admin `X-API-Key`) |
| `/api/jobs/{id}` | DELETE | Soft-delete job listing (admin `X-API-Key`) |
| `/api/stripe/webhook` | POST | Stripe webhook handler (Stripe signature) |
| `/api/stripe/create-checkout` | POST | Create Stripe checkout session |
| `/api/stripe/subscription/{email}` | GET | Subscription status by email |
| `/api/stripe/cancel` | POST | Cancel subscription |
| `/health` | GET | Health check |

## Deployment to Railway

### 1. Create Railway Project

```bash
railway login
railway init
```

### 2. Add PostgreSQL Service

In Railway dashboard: **Add Service** → **PostgreSQL**

### 3. Set Environment Variables

```bash
railway variables set DATABASE_URL=$RAILWAY_DATABASE_URL
railway variables set OPENROUTER_API_KEY=sk-or-v1-xxxxx
railway variables set YOUTUBE_API_KEY=AIzaSyxxxxx
railway variables set POLYGON_API_KEY=xxxxx              # For real-time stock data
railway variables set ADMIN_API_KEY=$ADMIN_API_KEY
railway variables set RESEND_API_KEY=re_xxxxx
railway variables set BEEHIIV_API_KEY=xxxxx
railway variables set BEEHIIV_PUBLICATION_ID=pub_xxxxx
railway variables set NEWSLETTER_FROM_EMAIL=newsletter@datacubeai.space
railway variables set STRIPE_SECRET_KEY=sk_xxxxx
railway variables set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
railway variables set STRIPE_PREMIUM_PRICE_ID=price_xxxxx
railway variables set STRIPE_API_DEVELOPER_PRICE_ID=price_xxxxx
railway variables set STRIPE_API_BUSINESS_PRICE_ID=price_xxxxx
railway variables set CORS_ORIGINS='["http://localhost:3000","https://www.datacubeai.space","https://ai-information-hub.vercel.app"]'
```

### 4. Deploy

```bash
railway up
```

### 5. Initialize Database

After first deployment:
```bash
railway run python -m scripts.init_db --migrate-all
```

## Data Collection

### Full Collection (All Stages)

```bash
# Daily (period_id = YYYY-MM-DD)
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect?period_id=2026-02-07" \
  -H "X-API-Key: $ADMIN_API_KEY"

# Weekly (period_id = YYYY-kwWW)
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect?period_id=2026-kw05" \
  -H "X-API-Key: $ADMIN_API_KEY"
```

### Process Only (Reuse Raw Data)

Useful when you want to re-run LLM processing without re-fetching data:

```bash
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect/process?period_id=2026-kw05" \
  -H "X-API-Key: $ADMIN_API_KEY"
```

### Fetch Only (No LLM Processing)

```bash
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect/fetch?period_id=2026-kw05" \
  -H "X-API-Key: $ADMIN_API_KEY"
```

### Local Collection

```bash
# Daily collection (default: today)
python -m scripts.daily_collect
python -m scripts.daily_collect --date 2026-02-07

# Weekly collection (full week at once)
python -m scripts.weekly_collect
python -m scripts.weekly_collect --week 2026-kw05
```

## Tips Processing

Tips sources bypass LLM classification in Stage 2. Current sources (14 total):

**Blogs:**
- Simon Willison
- One Useful Thing (Ethan Mollick)

**Reddit Communities:**
- r/ChatGPT, r/ClaudeAI, r/OpenAI, r/PromptEngineering
- r/Midjourney (image generation for marketing)
- r/perplexity_ai, r/NotebookLM (AI research tools)
- r/artificial, r/singularity (general AI discussion)
- r/aivideo, r/ElevenLabs (content creation)
- r/ChatGPTPro (pro users)

These sources:
- Are inherently tips/practical content
- Skip classification and retain `section="tips"`
- Ensure tips appear in the Tips feed

## M&A Processing

### M&A Data Sources (7 feeds)

M&A news is collected from dedicated financial and business news sources:

| Source | Type | URL |
|--------|------|-----|
| TechCrunch M&A | Tech M&A | `techcrunch.com/tag/mergers-and-acquisitions/feed/` |
| SEC EDGAR 8-K | Regulatory | `sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K&output=atom` |
| Financial Times M&A | Financial | `ft.com/mergers-acquisitions?format=rss` |
| Yahoo Finance | General | `finance.yahoo.com/rss/topstories` |
| GlobeNewswire M&A | PR | `globenewswire.com/.../Mergers%20and%20Acquisitions/...` |
| PR Newswire | PR | `prnewswire.com/rss/news-releases-list.rss` |
| Google News M&A | Aggregator | `news.google.com/rss/search?q=mergers+acquisitions+AI` |

These sources are fetched as part of the investment RSS collection but processed separately for M&A extraction.

### M&A Processing Flow

M&A data has two collection paths:

**Full Collection** (4-stage pipeline):
```
RSS Fetch (all sources) → Classification → LLM Processing → Database
                                              ↓
                               process_investment_articles()
                               internally splits articles into:
                               • Primary Market (funding)
                               • Secondary Market (stocks)
                               • M&A (mergers & acquisitions)
```

**M&A-Only Collection** (3-stage fast path):
```
M&A RSS Fetch → process_ma_articles() → ma_posts table
     ↓
(Skips classification, doesn't touch other sections)
```

Use M&A-only collection when you want to refresh M&A data without reprocessing tech/tips:
```bash
curl -X POST ".../api/admin/collect/ma?period_id=2026-kw06" -H "X-API-Key: ..."
```

### AI Industry Taxonomy

M&A deals are classified into AI-specific industry categories:

| Category | Description |
|----------|-------------|
| AI Infrastructure | Cloud, chips, data centers, ML platforms, model providers |
| AI Healthcare | Medical AI, drug discovery, clinical AI, diagnostics |
| AI Finance | FinTech AI, algorithmic trading, risk assessment, fraud detection |
| AI Enterprise | B2B AI tools, SaaS AI, workflow automation, document AI |
| AI Consumer | Consumer apps, recommendation systems, voice assistants |
| AI Robotics | Industrial robots, autonomous vehicles, drones |
| AI Security | Cybersecurity AI, fraud detection, threat intelligence |
| AI Creative | Image/video generation, music AI, content creation |
| AI Education | EdTech AI, tutoring, learning platforms |
| Other AI | AI companies not fitting above categories |

**Note**: Only AI-related M&A deals are included. Deals with no clear AI connection are filtered out (industry = null).

### M&A-Only Reprocessing

To reprocess only the M&A section without affecting other sections:

```bash
curl -X POST "https://api-production-3ee5.up.railway.app/api/admin/collect/ma?period_id=2026-kw05" \
  -H "X-API-Key: $ADMIN_API_KEY"
```

This is useful when you want to update M&A data with new sources or fix classification issues.

## Project Structure

```
ai-hub-backend/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Environment config
│   ├── database.py          # DB connection
│   ├── models/              # SQLAlchemy models
│   │   ├── __init__.py      # All models
│   │   ├── raw.py           # Raw article/video storage
│   │   ├── developer.py     # ApiKey model (email, api_key, tier, rate limits)
│   │   ├── job.py           # JobListing model (title, company, location, salary, tags)
│   │   ├── subscription.py  # Subscription model (Stripe IDs, tier, status, period dates)
│   │   └── newsletter_send.py  # NewsletterSend model (period_id, language, status, sent_count) — idempotency lock
│   ├── schemas/             # Pydantic schemas
│   ├── routers/             # API routes
│   │   ├── admin.py         # Collection endpoints
│   │   ├── stock.py         # Real-time stock data (Polygon.io)
│   │   ├── developer.py     # Developer API (register, usage, rotate-key)
│   │   ├── jobs.py          # Job board CRUD endpoints
│   │   ├── stripe_webhook.py  # Stripe payments (webhook, checkout, subscriptions)
│   │   └── ...
│   └── services/            # Business logic
│       ├── collector.py     # 4-stage pipeline
│       ├── period_utils.py  # Period ID utilities (daily/weekly)
│       ├── rss_fetcher.py   # RSS feeds
│       ├── hn_fetcher.py    # Hacker News
│       ├── youtube_fetcher.py  # YouTube API
│       ├── llm_processor.py # LLM processing + resilient translation (JSON validation + small-batch retry)
│       ├── i18n_utils.py    # Language constants, get_field() helper
│       ├── newsletter_sender.py # Resend + Beehiiv newsletter — idempotent via newsletter_sends lock (ON CONFLICT DO NOTHING + SELECT FOR UPDATE, 6h stale reclaim); (sent, failed) tuple lets partial success avoid duplicate delivery; Berlin-tz default period (no late-UTC cron "yesterday" bug)
│       └── migrator.py      # JSON migration
├── alembic/                 # DB migrations
├── scripts/                 # CLI scripts
│   ├── daily_collect.py     # Daily cron script (Railway)
│   └── weekly_collect.py    # Weekly collection script
├── Dockerfile
├── railway.toml
└── requirements.txt
```

## Frontend Configuration

Set environment variable in Vercel:

```
NEXT_PUBLIC_API_URL=https://api-production-3ee5.up.railway.app/api
```

The frontend will automatically use the API when configured, with fallback to static JSON files.
