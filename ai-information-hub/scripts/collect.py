#!/usr/bin/env python3
"""
AI Weekly Content Collector

Fetches RSS feeds, processes articles with LLM (via OpenRouter),
and outputs JSON files for the frontend.

Usage:
    python scripts/collect.py
    python scripts/collect.py --week 2025-kw05
    python scripts/collect.py --dry-run  # Skip LLM, output raw articles

Environment:
    OPENROUTER_API_KEY  - Required (unless --dry-run)
"""

import argparse
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

import feedparser
import yaml

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
PUBLIC_DATA = PROJECT_ROOT / "public" / "data"
CACHE_DIR = SCRIPT_DIR / ".cache"
SOURCES_FILE = SCRIPT_DIR / "sources.yaml"

ICON_TYPES = ["Brain", "Server", "Zap", "Cpu"]
IMPACT_LEVELS = ["critical", "high", "medium", "low"]

AUTHOR_DEFAULTS = {
    "name": "Data Cube AI",
    "handle": "@datacube",
    "avatar": "DC",
    "verified": True,
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def current_week_id() -> str:
    """Return the current ISO week as '2025-kw04' format."""
    now = datetime.now()
    year, week, _ = now.isocalendar()
    return f"{year}-kw{week:02d}"


def week_date_range(year: int, week: int) -> str:
    """Return date range string like '20.01 - 26.01' for a given ISO week."""
    jan4 = datetime(year, 1, 4)
    start = jan4 + timedelta(weeks=week - 1, days=-jan4.weekday())
    end = start + timedelta(days=6)
    return f"{start.day:02d}.{start.month:02d} - {end.day:02d}.{end.month:02d}"


def load_sources() -> dict:
    """Load RSS sources from YAML config."""
    with open(SOURCES_FILE, "r") as f:
        return yaml.safe_load(f)


def fetch_feed(url: str, days: int = 7) -> list[dict]:
    """Fetch and parse an RSS feed, returning entries from the last N days."""
    cutoff = datetime.now() - timedelta(days=days)
    feed = feedparser.parse(url)
    articles = []
    for entry in feed.entries:
        published = None
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            published = datetime(*entry.published_parsed[:6])
        elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
            published = datetime(*entry.updated_parsed[:6])

        if published and published < cutoff:
            continue

        articles.append(
            {
                "title": getattr(entry, "title", ""),
                "link": getattr(entry, "link", ""),
                "summary": getattr(entry, "summary", ""),
                "published": published.isoformat() if published else "",
            }
        )
    return articles


def fetch_all_feeds(sources: dict, section: str) -> list[dict]:
    """Fetch all feeds for a given section, tagging each article with source name."""
    all_articles = []
    for source in sources.get(section, []):
        print(f"  Fetching {source['name']}...")
        try:
            articles = fetch_feed(source["url"])
            for a in articles:
                a["source"] = source["name"]
            all_articles.extend(articles)
            print(f"    -> {len(articles)} articles")
        except Exception as e:
            print(f"    -> Error: {e}")
    return all_articles


def fetch_all_sources(sources: dict) -> list[dict]:
    """Fetch ALL feeds from ALL sections, deduplicate by URL.

    Each article is tagged with its source name and the original section
    hint from sources.yaml (used as a hint for LLM classification).
    """
    all_articles = []
    seen_urls = set()
    for section in sources:
        for source in sources[section]:
            print(f"  [{section}] Fetching {source['name']}...")
            try:
                articles = fetch_feed(source["url"])
                added = 0
                for a in articles:
                    if a["link"] not in seen_urls:
                        seen_urls.add(a["link"])
                        a["source"] = source["name"]
                        a["original_section"] = section
                        all_articles.append(a)
                        added += 1
                print(f"    -> {len(articles)} fetched, {added} new (after dedup)")
            except Exception as e:
                print(f"    -> Error: {e}")
    return all_articles


# ---------------------------------------------------------------------------
# LLM Processing
# ---------------------------------------------------------------------------


def get_llm_client():
    """Create OpenAI client pointing to OpenRouter."""
    from openai import OpenAI

    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        print("Error: OPENROUTER_API_KEY environment variable not set.")
        sys.exit(1)

    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )


def classify_articles(client, articles: list[dict]) -> list[dict]:
    """Classify all articles into sections using a single LLM call (Pass 1).

    Returns articles enriched with 'section' and 'relevance' fields.
    Articles flagged as duplicates are removed.
    """
    if not articles:
        return []

    # Build a compact article listing for the prompt
    article_entries = []
    for i, a in enumerate(articles):
        article_entries.append(
            f"[{i}] Source: {a['source']} (hint: {a.get('original_section', 'unknown')})\n"
            f"    Title: {a['title']}\n"
            f"    Summary: {a['summary'][:300]}"
        )
    articles_text = "\n\n".join(article_entries)

    prompt = f"""You are an AI news classifier for a bilingual (German/English) weekly newsletter.

Your task: classify each article into EXACTLY ONE section. Do NOT assign an article to multiple sections.

SECTION DEFINITIONS:
- "tech": AI technology breakthroughs, new models, research papers, product launches, technical infrastructure, benchmarks, open-source releases. Focus: WHAT the technology does or achieves.
- "investment": Funding rounds, venture capital, IPOs, stock movements of AI companies, mergers & acquisitions, partnerships, financial deals. Focus: WHO is investing/acquiring and HOW MUCH.
- "tips": Practical AI usage tips, prompt engineering, productivity workflows, tool tutorials, how-to guides for non-technical users. Focus: HOW to use AI tools in daily work.

CLASSIFICATION RULES:
1. Each article goes to exactly ONE section based on its PRIMARY focus.
2. An article about "Company X raises $Y to build Z" → "investment" (primary focus is the funding).
3. An article about "Company X launches new AI model Z" → "tech" (primary focus is the technology).
4. An article about "10 ways to use ChatGPT for email" → "tips" (primary focus is practical usage).
5. If an article covers multiple topics, choose the section matching its headline/main point.
6. The "original_section" hint may be wrong — classify based on actual content.
7. If two articles cover the same event from different sources, mark the less relevant one as a duplicate.

ARTICLES:
{articles_text}

Output a JSON array with one entry per article:
[
  {{"index": 0, "section": "tech", "relevance": 0.9, "duplicate_of": null}},
  {{"index": 1, "section": "investment", "relevance": 0.7, "duplicate_of": null}},
  {{"index": 2, "section": "tech", "relevance": 0.3, "duplicate_of": 0}}
]

Fields:
- index: article index (matches [N] above)
- section: "tech" | "investment" | "tips"
- relevance: 0.0-1.0 how relevant/important this article is for its section
- duplicate_of: index of a better article covering the same event, or null

Output ONLY the JSON array, no markdown fences or explanation."""

    response = client.chat.completions.create(
        model="deepseek/deepseek-v3.2",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,  # Low temperature for consistent classification
    )

    try:
        classifications = json.loads(response.choices[0].message.content)
    except json.JSONDecodeError:
        text = response.choices[0].message.content
        start = text.find("[")
        end = text.rfind("]") + 1
        if start >= 0 and end > start:
            classifications = json.loads(text[start:end])
        else:
            # Fallback: use original_section hints
            print("  Warning: Could not parse classification response, using original_section hints")
            for a in articles:
                a["section"] = a.get("original_section", "tech")
                a["relevance"] = 0.5
            return articles

    # Enrich articles with classification data
    classified = []
    classification_map = {c["index"]: c for c in classifications}

    for i, article in enumerate(articles):
        c = classification_map.get(i)
        if c is None:
            # Article not in LLM output — use hint
            article["section"] = article.get("original_section", "tech")
            article["relevance"] = 0.5
            classified.append(article)
            continue

        # Skip duplicates
        if c.get("duplicate_of") is not None:
            continue

        article["section"] = c["section"]
        article["relevance"] = c.get("relevance", 0.5)
        classified.append(article)

    # Sort by relevance within each section (highest first)
    classified.sort(key=lambda a: a.get("relevance", 0), reverse=True)

    # Log classification stats
    from collections import Counter
    counts = Counter(a["section"] for a in classified)
    print(f"  Classification results: {dict(counts)}")
    print(f"  Duplicates removed: {len(articles) - len(classified)}")

    return classified


def _build_cross_section_context(other_sections: dict[str, list[dict]] | None) -> str:
    """Build a context string listing articles assigned to other sections."""
    if not other_sections:
        return ""
    lines = ["\nARTICLES ASSIGNED TO OTHER SECTIONS (do NOT cover these topics):"]
    for section, articles in other_sections.items():
        if articles:
            titles = [f"  - {a['title']}" for a in articles[:10]]
            lines.append(f"\n[{section.upper()}]")
            lines.extend(titles)
    return "\n".join(lines) + "\n"


def process_tech_articles(client, articles: list[dict], other_sections: dict[str, list[dict]] | None = None) -> dict:
    """Use LLM to process tech articles into bilingual feed format."""
    if not articles:
        return {"de": [], "en": []}

    articles_text = "\n\n".join(
        f"Source: {a['source']}\nTitle: {a['title']}\nLink: {a['link']}\nSummary: {a['summary'][:500]}\nDate: {a['published']}"
        for a in articles[:20]  # Limit to top 20
    )

    cross_context = _build_cross_section_context(other_sections)

    prompt = f"""You are a tech news editor for a German/English bilingual AI newsletter.
Target audience: Non-technical professionals who want to stay informed about AI.

From the following articles, select the 5 most important/interesting ones and create feed posts.
{cross_context}
ARTICLES:
{articles_text}

Output a JSON object with this exact structure:
{{
  "de": [
    {{
      "id": 1,
      "author": {{"name": "Source Name", "handle": "@source", "avatar": "XX", "verified": true}},
      "content": "German summary (2-3 sentences, non-technical, explain why it matters)",
      "tags": ["Tag1", "Tag2", "Tag3"],
      "category": "Category name in German",
      "iconType": "Brain|Server|Zap|Cpu",
      "impact": "critical|high|medium|low",
      "timestamp": "YYYY-MM-DD",
      "metrics": {{"comments": 0, "retweets": 0, "likes": 0, "views": "0"}},
      "source": "Source Name",
      "sourceUrl": "https://original-article-url"
    }}
  ],
  "en": [
    // Same structure but English content, same sourceUrl as the German version
  ]
}}

Rules:
- iconType must be one of: Brain (for LLM/AI models), Server (for infrastructure/hardware), Zap (for science/research), Cpu (for safety/technical)
- impact: critical = industry-changing, high = significant, medium = notable, low = informational
- avatar: 2-letter abbreviation of source name
- Content should be accessible to non-technical readers
- sourceUrl: copy the exact Link URL from the original article. Do NOT make up URLs.
- Output ONLY valid JSON, no markdown fences"""

    response = client.chat.completions.create(
        model="deepseek/deepseek-v3.2",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    try:
        return json.loads(response.choices[0].message.content)
    except json.JSONDecodeError:
        # Try to extract JSON from response
        text = response.choices[0].message.content
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])
        return {"de": [], "en": []}


def process_investment_articles(client, articles: list[dict], other_sections: dict[str, list[dict]] | None = None) -> dict:
    """Use LLM to process investment articles into bilingual feed format."""
    if not articles:
        return {"primaryMarket": {"de": [], "en": []}, "secondaryMarket": {"de": [], "en": []}, "ma": {"de": [], "en": []}}

    articles_text = "\n\n".join(
        f"Source: {a['source']}\nTitle: {a['title']}\nLink: {a['link']}\nSummary: {a['summary'][:500]}\nDate: {a['published']}"
        for a in articles[:20]
    )

    cross_context = _build_cross_section_context(other_sections)

    prompt = f"""You are a financial news editor for a German/English bilingual AI investment newsletter.
Target audience: Non-professional investors interested in AI industry funding and M&A.

From the following articles, categorize into:
1. Primary Market (funding rounds, venture capital)
2. Secondary Market (stock price movements of AI companies)
3. M&A (mergers, acquisitions, partnerships)

Select the most relevant articles (up to 3 per category).
{cross_context}
ARTICLES:
{articles_text}

Output a JSON object with this exact structure:
{{
  "primaryMarket": {{
    "de": [
      {{
        "id": 1,
        "author": {{"name": "Source", "handle": "@source", "avatar": "XX", "verified": true}},
        "content": "German description",
        "company": "Company Name",
        "amount": "$X Mrd.",
        "round": "Serie X",
        "investors": ["Investor1", "Investor2"],
        "valuation": "$X Mrd.",
        "timestamp": "YYYY-MM-DD",
        "metrics": {{"comments": 0, "retweets": 0, "likes": 0, "views": "0"}},
        "sourceUrl": "https://original-article-url"
      }}
    ],
    "en": [/* same but English, same sourceUrl */]
  }},
  "secondaryMarket": {{
    "de": [
      {{
        "id": 1,
        "author": {{"name": "Source", "handle": "@source", "avatar": "XX", "verified": true}},
        "content": "German description",
        "ticker": "NVDA",
        "price": "$XXX.XX",
        "change": "+X.X%",
        "direction": "up|down",
        "marketCap": "$X Bio.",
        "timestamp": "YYYY-MM-DD",
        "metrics": {{"comments": 0, "retweets": 0, "likes": 0, "views": "0"}},
        "sourceUrl": "https://original-article-url"
      }}
    ],
    "en": [/* same but English, same sourceUrl */]
  }},
  "ma": {{
    "de": [
      {{
        "id": 1,
        "author": {{"name": "Source", "handle": "@source", "avatar": "XX", "verified": true}},
        "content": "German description",
        "acquirer": "Company A",
        "target": "Company B",
        "dealValue": "$X Mrd.",
        "dealType": "Akquisition",
        "timestamp": "YYYY-MM-DD",
        "metrics": {{"comments": 0, "retweets": 0, "likes": 0, "views": "0"}},
        "sourceUrl": "https://original-article-url"
      }}
    ],
    "en": [/* same but English, dealType in English, same sourceUrl */]
  }}
}}

Rules:
- Use German number formatting for 'de' (e.g., $2,75 Mrd., €150 Mio.)
- Use English number formatting for 'en' (e.g., $2.75B, €150M)
- If no articles fit a category, return empty arrays
- sourceUrl: copy the exact Link URL from the original article. Do NOT make up URLs.
- Output ONLY valid JSON, no markdown fences"""

    response = client.chat.completions.create(
        model="deepseek/deepseek-v3.2",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    try:
        return json.loads(response.choices[0].message.content)
    except json.JSONDecodeError:
        text = response.choices[0].message.content
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])
        return {"primaryMarket": {"de": [], "en": []}, "secondaryMarket": {"de": [], "en": []}, "ma": {"de": [], "en": []}}


def process_tips_articles(client, articles: list[dict], other_sections: dict[str, list[dict]] | None = None) -> dict:
    """Use LLM to process tips articles into bilingual feed format."""
    if not articles:
        return {"de": [], "en": []}

    articles_text = "\n\n".join(
        f"Source: {a['source']}\nTitle: {a['title']}\nLink: {a['link']}\nSummary: {a['summary'][:500]}\nDate: {a['published']}"
        for a in articles[:20]
    )

    cross_context = _build_cross_section_context(other_sections)

    prompt = f"""You are an AI tips editor for a German/English bilingual newsletter.
Target audience: Non-technical professionals who want practical AI tips they can use immediately.

From the following articles, extract the 5 most useful, practical AI tips.
Focus on: ChatGPT/Claude/Gemini usage, prompt techniques, AI tools, productivity workflows.
Do NOT include: programming tutorials, API usage, model training, technical deep-dives.
{cross_context}
ARTICLES:
{articles_text}

Output a JSON object with this exact structure:
{{
  "de": [
    {{
      "id": 1,
      "author": {{"name": "Source", "handle": "@source", "avatar": "XX", "verified": true}},
      "platform": "X|Reddit",
      "content": "German description of the tip (2-3 sentences)",
      "tip": "The actual tip/command/prompt template (can include newlines)",
      "category": "Category in German (e.g., Prompt Engineering, Dokumentenanalyse)",
      "difficulty": "Anfänger|Mittel|Fortgeschritten",
      "timestamp": "YYYY-MM-DD",
      "metrics": {{"comments": 0, "retweets": 0, "likes": 0, "views": "0"}},
      "sourceUrl": "https://original-article-url"
    }}
  ],
  "en": [
    {{
      "id": 1,
      "author": {{"name": "Source", "handle": "@source", "avatar": "XX", "verified": true}},
      "platform": "X|Reddit",
      "content": "English description of the tip (2-3 sentences)",
      "tip": "The actual tip/command/prompt template",
      "category": "Category in English (e.g., Prompt Engineering, Document Analysis)",
      "difficulty": "Beginner|Intermediate|Advanced",
      "timestamp": "YYYY-MM-DD",
      "metrics": {{"comments": 0, "retweets": 0, "likes": 0, "views": "0"}},
      "sourceUrl": "https://original-article-url"
    }}
  ]
}}

Rules:
- Tips should be immediately actionable (no coding required)
- platform: use "X" for Twitter/blog sources, "Reddit" for Reddit sources
- sourceUrl: copy the exact Link URL from the original article. Do NOT make up URLs.
- Output ONLY valid JSON, no markdown fences"""

    response = client.chat.completions.create(
        model="deepseek/deepseek-v3.2",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    try:
        return json.loads(response.choices[0].message.content)
    except json.JSONDecodeError:
        text = response.choices[0].message.content
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])
        return {"de": [], "en": []}


def generate_trends(client, tech_data: dict, investment_data: dict) -> dict:
    """Use LLM to generate trending topics from the week's content."""
    # Collect all content for context
    all_content = []
    for post in tech_data.get("en", []):
        all_content.append(post.get("content", ""))
    for section in ["primaryMarket", "secondaryMarket", "ma"]:
        for post in investment_data.get(section, {}).get("en", []):
            all_content.append(post.get("content", ""))

    if not all_content:
        return {
            "trends": {"de": [], "en": []},
            "teamMembers": {
                "de": [
                    {"name": "Anna Schmidt", "role": "KI-Technologie Lead", "handle": "@anna_tech", "avatar": "AS"},
                    {"name": "Max Weber", "role": "Investment Analyst", "handle": "@max_invest", "avatar": "MW"},
                    {"name": "Lisa Müller", "role": "Data Scientist", "handle": "@lisa_data", "avatar": "LM"},
                    {"name": "Tom Fischer", "role": "Research Lead", "handle": "@tom_research", "avatar": "TF"},
                ],
                "en": [
                    {"name": "Anna Schmidt", "role": "AI Technology Lead", "handle": "@anna_tech", "avatar": "AS"},
                    {"name": "Max Weber", "role": "Investment Analyst", "handle": "@max_invest", "avatar": "MW"},
                    {"name": "Lisa Müller", "role": "Data Scientist", "handle": "@lisa_data", "avatar": "LM"},
                    {"name": "Tom Fischer", "role": "Research Lead", "handle": "@tom_research", "avatar": "TF"},
                ],
            },
        }

    context = "\n".join(all_content[:10])

    prompt = f"""Based on this week's AI news content, generate 5 trending topics.

CONTENT:
{context}

Output JSON:
{{
  "trends": {{
    "de": [
      {{"category": "KI · Trend", "title": "Topic Name", "posts": "XX.000 Beiträge"}}
    ],
    "en": [
      {{"category": "AI · Trending", "title": "Topic Name", "posts": "XXK posts"}}
    ]
  }}
}}

Use categories: KI, Technologie, Finanzen, Wissenschaft, Startups (German) / AI, Technology, Finance, Science, Startups (English).
Output ONLY valid JSON, no markdown fences."""

    response = client.chat.completions.create(
        model="deepseek/deepseek-v3.2",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5,
    )

    try:
        result = json.loads(response.choices[0].message.content)
    except json.JSONDecodeError:
        text = response.choices[0].message.content
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            result = json.loads(text[start:end])
        else:
            result = {"trends": {"de": [], "en": []}}

    # Add static team members
    result["teamMembers"] = {
        "de": [
            {"name": "Anna Schmidt", "role": "KI-Technologie Lead", "handle": "@anna_tech", "avatar": "AS"},
            {"name": "Max Weber", "role": "Investment Analyst", "handle": "@max_invest", "avatar": "MW"},
            {"name": "Lisa Müller", "role": "Data Scientist", "handle": "@lisa_data", "avatar": "LM"},
            {"name": "Tom Fischer", "role": "Research Lead", "handle": "@tom_research", "avatar": "TF"},
        ],
        "en": [
            {"name": "Anna Schmidt", "role": "AI Technology Lead", "handle": "@anna_tech", "avatar": "AS"},
            {"name": "Max Weber", "role": "Investment Analyst", "handle": "@max_invest", "avatar": "MW"},
            {"name": "Lisa Müller", "role": "Data Scientist", "handle": "@lisa_data", "avatar": "LM"},
            {"name": "Tom Fischer", "role": "Research Lead", "handle": "@tom_research", "avatar": "TF"},
        ],
    }

    return result


# ---------------------------------------------------------------------------
# Week Index Management
# ---------------------------------------------------------------------------


def update_weeks_json(week_id: str):
    """Add the new week to weeks.json if not already present."""
    weeks_file = PUBLIC_DATA / "weeks.json"

    if weeks_file.exists():
        with open(weeks_file, "r") as f:
            data = json.load(f)
    else:
        data = {"weeks": []}

    existing_ids = {w["id"] for w in data["weeks"]}
    if week_id in existing_ids:
        # Update 'current' flags
        for w in data["weeks"]:
            w["current"] = w["id"] == week_id
        with open(weeks_file, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return

    # Parse week info
    parts = week_id.split("-kw")
    year = int(parts[0])
    week_num = int(parts[1])

    # Set all existing weeks to non-current
    for w in data["weeks"]:
        w["current"] = False

    new_week = {
        "id": week_id,
        "label": f"KW {week_num:02d}",
        "year": year,
        "weekNum": week_num,
        "dateRange": week_date_range(year, week_num),
        "current": True,
    }

    # Insert at beginning (newest first)
    data["weeks"].insert(0, new_week)

    with open(weeks_file, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Updated weeks.json with {week_id}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(description="AI Weekly Content Collector")
    parser.add_argument("--week", type=str, default=None, help="Week ID (e.g., 2025-kw05). Default: current week")
    parser.add_argument("--dry-run", action="store_true", help="Fetch RSS only, skip LLM processing")
    args = parser.parse_args()

    week_id = args.week or current_week_id()
    print(f"Collecting content for {week_id}")

    # Load sources
    sources = load_sources()

    # Stage 0: Unified fetch + dedup
    print("\n--- Stage 0: Fetching all feeds (unified) ---")
    all_articles = fetch_all_sources(sources)
    print(f"\nTotal unique articles: {len(all_articles)}")

    # Cache raw data
    cache_dir = CACHE_DIR / week_id
    cache_dir.mkdir(parents=True, exist_ok=True)

    # Save unified raw data
    with open(cache_dir / "raw_all.json", "w") as f:
        json.dump(
            {
                "articles": all_articles,
                "fetched_at": datetime.now().isoformat(),
            },
            f,
            indent=2,
            ensure_ascii=False,
        )
    # Also save legacy format for regenerate.py backward compatibility
    legacy_raw = {"tech": [], "investment": [], "tips": [], "fetched_at": datetime.now().isoformat()}
    for a in all_articles:
        section = a.get("original_section", "tech")
        if section in legacy_raw:
            legacy_raw[section].append(a)
    with open(cache_dir / "raw.json", "w") as f:
        json.dump(legacy_raw, f, indent=2, ensure_ascii=False)
    print(f"Cached raw data to {cache_dir}")

    if args.dry_run:
        print("\n--- Dry run: skipping LLM processing ---")
        from collections import Counter
        hint_counts = Counter(a.get("original_section", "unknown") for a in all_articles)
        print(f"Total articles: {len(all_articles)}")
        print(f"By original section hint: {dict(hint_counts)}")
        return

    # Process with LLM
    client = get_llm_client()

    # Stage 1: Classify all articles
    print("\n--- Stage 1: Classifying articles with LLM ---")
    classified = classify_articles(client, all_articles)

    # Split by section
    tech_articles = [a for a in classified if a.get("section") == "tech"]
    investment_articles = [a for a in classified if a.get("section") == "investment"]
    tips_articles = [a for a in classified if a.get("section") == "tips"]
    print(f"\nClassified: tech={len(tech_articles)}, investment={len(investment_articles)}, tips={len(tips_articles)}")

    # Cache classification results
    with open(cache_dir / "classified.json", "w") as f:
        json.dump(
            {
                "tech": tech_articles,
                "investment": investment_articles,
                "tips": tips_articles,
                "classified_at": datetime.now().isoformat(),
            },
            f,
            indent=2,
            ensure_ascii=False,
        )

    # Update legacy raw.json with classified data (for regenerate.py)
    with open(cache_dir / "raw.json", "w") as f:
        json.dump(
            {
                "tech": tech_articles,
                "investment": investment_articles,
                "tips": tips_articles,
                "fetched_at": datetime.now().isoformat(),
            },
            f,
            indent=2,
            ensure_ascii=False,
        )

    # Stage 2: Generate per-section content with cross-section context
    print("\n--- Stage 2: Processing tech articles with LLM ---")
    tech_data = process_tech_articles(
        client, tech_articles,
        other_sections={"investment": investment_articles, "tips": tips_articles},
    )

    print("\n--- Stage 2: Processing investment articles with LLM ---")
    investment_data = process_investment_articles(
        client, investment_articles,
        other_sections={"tech": tech_articles, "tips": tips_articles},
    )

    print("\n--- Stage 2: Processing tips articles with LLM ---")
    tips_data = process_tips_articles(
        client, tips_articles,
        other_sections={"tech": tech_articles, "investment": investment_articles},
    )

    print("\n--- Generating trends ---")
    trends_data = generate_trends(client, tech_data, investment_data)

    # Write output
    output_dir = PUBLIC_DATA / week_id
    output_dir.mkdir(parents=True, exist_ok=True)

    for filename, data in [
        ("tech.json", tech_data),
        ("investment.json", investment_data),
        ("tips.json", tips_data),
        ("trends.json", trends_data),
    ]:
        filepath = output_dir / filename
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Wrote {filepath}")

    # Update weeks index
    update_weeks_json(week_id)

    print(f"\nDone! Content for {week_id} is ready.")


if __name__ == "__main__":
    main()
