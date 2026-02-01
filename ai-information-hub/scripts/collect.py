#!/usr/bin/env python3
"""
AI Weekly Content Collector

Fetches RSS feeds and Hacker News stories, processes articles with LLM
(DeepSeek V3.2 via OpenRouter), and outputs bilingual JSON files for the frontend.

Usage:
    python scripts/collect.py                    # Current week, full pipeline
    python scripts/collect.py --week 2025-kw05   # Specific week
    python scripts/collect.py --dry-run          # RSS only, skip LLM processing
    python scripts/collect.py --no-enhance-hn    # Disable HN content scraping

Environment:
    OPENROUTER_API_KEY  - Required (unless --dry-run)

Pipeline stages:
    1. Fetch all RSS feeds + HN stories (via Algolia API if enhanced)
    2. For HN stories: scrape article content (YouTube transcripts, web pages)
       and fetch top HN comments
    3. LLM Pass 1: Classify all articles into tech/investment/tips
    4. LLM Pass 2: Shortlist top candidates if >40 per section
    5. LLM Pass 3: Generate bilingual (DE/EN) content for top 20 per section
    6. Output to public/data/{weekId}/ and update weeks.json

HN Enhancement (enabled by default):
    - Uses HN Algolia API for better filtering (points > 100, last 7 days)
    - Fetches YouTube transcripts via youtube-transcript-api
    - Scrapes article body from web pages via BeautifulSoup
    - Fetches top 3 HN comments for discussion context
    - Disable with --no-enhance-hn for faster but less rich content

Python compatibility: 3.9+ (uses typing features available in 3.9)
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

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


def parse_llm_json(text: str, fallback=None):
    """Parse JSON from LLM output, handling common issues like comments, trailing commas, and control chars."""
    decoder = json.JSONDecoder(strict=False)

    # Strip markdown code fences
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)

    # Try direct parse first (strict=False allows control chars in strings)
    try:
        return decoder.decode(text)
    except json.JSONDecodeError:
        pass

    # Extract JSON object or array
    obj_start = text.find("{")
    arr_start = text.find("[")
    if obj_start < 0 and arr_start < 0:
        return fallback

    if arr_start >= 0 and (obj_start < 0 or arr_start < obj_start):
        start = arr_start
        end = text.rfind("]") + 1
    else:
        start = obj_start
        end = text.rfind("}") + 1

    if end <= start:
        return fallback

    extracted = text[start:end]

    # Try parse extracted
    try:
        return decoder.decode(extracted)
    except json.JSONDecodeError:
        pass

    # Remove single-line comments (// ...) that are NOT inside strings
    cleaned = re.sub(r'(?<!")//[^\n]*', "", extracted)
    # Remove trailing commas before } or ]
    cleaned = re.sub(r",\s*([}\]])", r"\1", cleaned)

    try:
        return decoder.decode(cleaned)
    except json.JSONDecodeError as e:
        print(f"  Warning: JSON parse failed after cleanup: {e}")
        return fallback


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


# ---------------------------------------------------------------------------
# Hacker News Enhanced Fetching
# ---------------------------------------------------------------------------


def fetch_hn_top_stories(
    query: str = "AI",
    min_points: int = 100,
    days: int = 7,
    limit: int = 50,
) -> list[dict]:
    """Fetch top HN stories from Algolia API.

    Uses search_by_date endpoint to get recent stories sorted by date,
    then filters and sorts by points.
    """
    import requests

    # Use search_by_date for recent stories, filter by points
    url = "https://hn.algolia.com/api/v1/search_by_date"
    params = {
        "query": query,
        "tags": "story",
        "numericFilters": f"points>{min_points}",
        "hitsPerPage": limit * 2,  # Fetch more to filter
    }

    resp = requests.get(url, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    # Filter by date (last N days) on client side
    cutoff = datetime.now() - timedelta(days=days)

    stories = []
    for hit in data.get("hits", []):
        created_at_i = hit.get("created_at_i", 0)
        created_at = datetime.fromtimestamp(created_at_i) if created_at_i else None

        # Skip if outside date range
        if created_at and created_at < cutoff:
            continue

        stories.append(
            {
                "title": hit.get("title", ""),
                "link": hit.get("url", ""),
                "hn_url": f"https://news.ycombinator.com/item?id={hit['objectID']}",
                "hn_id": hit.get("objectID"),
                "points": hit.get("points", 0),
                "num_comments": hit.get("num_comments", 0),
                "summary": "",  # Will be filled by content fetching
                "published": created_at.isoformat() if created_at else "",
                "source": "Hacker News",
            }
        )

        if len(stories) >= limit:
            break

    # Sort by points descending
    stories.sort(key=lambda x: x["points"], reverse=True)
    return stories


def fetch_hn_comments(story_id: str, limit: int = 5) -> list[str]:
    """Fetch top comments from an HN post."""
    import requests
    from bs4 import BeautifulSoup

    url = f"https://hn.algolia.com/api/v1/items/{story_id}"
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        comments = []
        for child in data.get("children", [])[:limit]:
            text = child.get("text", "")
            if text and len(text) > 50:  # Filter short comments
                # Clean HTML tags
                clean_text = BeautifulSoup(text, "lxml").get_text()
                comments.append(clean_text[:500])  # Limit length

        return comments
    except Exception as e:
        print(f"    HN comments error: {e}")
        return []


def detect_content_type(url: str) -> str:
    """Detect URL content type."""
    if not url:
        return "empty"

    url_lower = url.lower()

    # YouTube
    if "youtube.com" in url_lower or "youtu.be" in url_lower:
        return "youtube"

    # PDF
    if url_lower.endswith(".pdf"):
        return "pdf"

    # Podcast platforms (skip for now)
    podcast_domains = ["spotify.com/episode", "podcasts.apple.com", "anchor.fm"]
    if any(d in url_lower for d in podcast_domains):
        return "podcast"

    # Twitter/X (special handling)
    if "twitter.com" in url_lower or "x.com" in url_lower:
        return "twitter"

    # Default to webpage
    return "webpage"


def fetch_youtube_transcript(url: str) -> Optional[str]:
    """Fetch YouTube video transcript."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
    except ImportError:
        print("    Warning: youtube-transcript-api not installed")
        return None

    # Extract video ID
    patterns = [
        r"(?:v=|/v/|youtu\.be/)([a-zA-Z0-9_-]{11})",
        r"(?:embed/)([a-zA-Z0-9_-]{11})",
    ]

    video_id = None
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            video_id = match.group(1)
            break

    if not video_id:
        return None

    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

        # Prefer English, then German, then auto-generated
        for lang in ["en", "de"]:
            try:
                transcript = transcript_list.find_transcript([lang])
                entries = transcript.fetch()
                text = " ".join(e["text"] for e in entries)
                return text[:5000]  # Limit length
            except Exception:
                continue

        # Try auto-generated transcripts
        for transcript in transcript_list:
            if transcript.is_generated:
                entries = transcript.fetch()
                text = " ".join(e["text"] for e in entries)
                return text[:5000]

        return None
    except (TranscriptsDisabled, NoTranscriptFound):
        return None
    except Exception as e:
        print(f"    YouTube transcript error: {e}")
        return None


def fetch_webpage_content(url: str) -> Optional[str]:
    """Fetch webpage main content."""
    import requests
    from bs4 import BeautifulSoup

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "lxml")

        # Remove irrelevant elements
        for tag in soup(["script", "style", "nav", "header", "footer", "aside", "ads"]):
            tag.decompose()

        # Try to find article body
        article = soup.find("article") or soup.find("main") or soup.find("body")

        if article:
            # Extract paragraph text
            paragraphs = article.find_all("p")
            text = "\n".join(p.get_text().strip() for p in paragraphs if p.get_text().strip())
            return text[:5000] if text else None

        return None
    except Exception as e:
        print(f"    Webpage fetch error for {url}: {e}")
        return None


def enhance_hn_articles(stories: list[dict], max_items: int = 30) -> list[dict]:
    """Add full content and comments to HN articles."""
    enhanced = []

    for i, story in enumerate(stories[:max_items]):
        print(f"  [{i+1}/{min(len(stories), max_items)}] Processing: {story['title'][:50]}...")

        content_type = detect_content_type(story["link"])
        content = None

        if content_type == "youtube":
            content = fetch_youtube_transcript(story["link"])
            if content:
                print(f"    ✓ YouTube transcript: {len(content)} chars")

        elif content_type == "webpage":
            content = fetch_webpage_content(story["link"])
            if content:
                print(f"    ✓ Webpage content: {len(content)} chars")

        elif content_type == "podcast":
            print("    ⊘ Skipping podcast")

        elif content_type == "pdf":
            print("    ⊘ Skipping PDF (TODO)")

        elif content_type == "twitter":
            print("    ⊘ Skipping Twitter/X")

        elif content_type == "empty":
            print("    ⊘ No URL")

        # Fetch HN comments
        comments = []
        if story.get("hn_id"):
            comments = fetch_hn_comments(story["hn_id"], limit=3)
            if comments:
                print(f"    ✓ HN comments: {len(comments)} top comments")

        # Combine content
        full_content = []
        if content:
            full_content.append(f"[Article Content]\n{content}")
        if comments:
            full_content.append(f"[HN Discussion Highlights]\n" + "\n---\n".join(comments))

        story["summary"] = "\n\n".join(full_content) if full_content else story["title"]
        story["content_type"] = content_type
        story["has_full_content"] = bool(content)

        enhanced.append(story)

    return enhanced


def fetch_all_sources(sources: dict, enhance_hn: bool = True) -> list[dict]:
    """Fetch ALL feeds from ALL sections, deduplicate by URL.

    Each article is tagged with its source name and the original section
    hint from sources.yaml (used as a hint for LLM classification).

    If enhance_hn is True, uses Algolia API for HN with deep content fetching.
    """
    all_articles = []
    seen_urls = set()

    # First, handle HN with enhancement if enabled
    if enhance_hn:
        print("\n=== Fetching Hacker News (Enhanced) ===")
        hn_stories = fetch_hn_top_stories(
            query="AI",  # Simple query works better with Algolia
            min_points=100,
            days=7,
            limit=50,
        )
        print(f"  Found {len(hn_stories)} top HN stories")

        hn_enhanced = enhance_hn_articles(hn_stories, max_items=30)

        for story in hn_enhanced:
            if story["link"] and story["link"] not in seen_urls:
                seen_urls.add(story["link"])
                story["original_section"] = "tech"  # HN is primarily tech content
                all_articles.append(story)
            elif story.get("hn_url"):
                # For stories without external links (Ask HN, etc.), use HN URL
                if story["hn_url"] not in seen_urls:
                    seen_urls.add(story["hn_url"])
                    story["link"] = story["hn_url"]
                    story["original_section"] = "tech"
                    all_articles.append(story)

        print(f"  Added {len([a for a in all_articles if a.get('source') == 'Hacker News'])} HN articles")

    # Then process other RSS sources (skip plain HN if enhanced)
    for section in sources:
        for source in sources[section]:
            # Skip plain HN RSS if using enhanced version
            if source["name"] == "Hacker News" and enhance_hn:
                print(f"  [{section}] Skipping {source['name']} (using enhanced version)")
                continue

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

    classifications = parse_llm_json(response.choices[0].message.content, fallback=None)
    if classifications is None:
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


def _build_cross_section_context(other_sections: Optional[dict]) -> str:
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


def shortlist_articles(client, articles: list[dict], target: int, batch_size: int = 40) -> list[dict]:
    """Read ALL articles and shortlist the most newsworthy ones.

    If articles fit in a single LLM call (≤ batch_size), return as-is.
    Otherwise, batch-process: each batch selects top candidates,
    then merge all candidates for the final processing step.
    """
    if len(articles) <= batch_size:
        return articles

    print(f"    Shortlisting {len(articles)} articles in batches of {batch_size}...")
    batches = [articles[i:i + batch_size] for i in range(0, len(articles), batch_size)]
    # Keep more candidates per batch than the final target to avoid losing good articles
    keep_per_batch = max((target * 2) // len(batches), target)

    all_selected = []

    for batch_idx, batch in enumerate(batches):
        articles_text = "\n".join(
            f"[{i}] {a['title']} (Source: {a['source']})\n    {a['summary'][:300]}"
            for i, a in enumerate(batch)
        )

        prompt = f"""You are selecting the most newsworthy AI articles for a weekly newsletter.
From these {len(batch)} articles, pick the {keep_per_batch} most important/interesting ones.

ARTICLES:
{articles_text}

Return ONLY a JSON array of the selected article indices, e.g. [0, 3, 7, 12].
Output ONLY valid JSON, no explanation."""

        response = client.chat.completions.create(
            model="deepseek/deepseek-v3.2",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
        )

        try:
            indices = parse_llm_json(response.choices[0].message.content, fallback=None)
            if indices is None:
                raise ValueError("Could not parse indices")
            selected = [batch[i] for i in indices if 0 <= i < len(batch)]
            all_selected.extend(selected)
            print(f"    Batch {batch_idx + 1}/{len(batches)}: {len(batch)} articles → {len(selected)} selected")
        except (ValueError, IndexError, TypeError):
            # Fallback: keep all from this batch
            all_selected.extend(batch)
            print(f"    Batch {batch_idx + 1}/{len(batches)}: kept all {len(batch)} (parse error)")

    print(f"    Shortlisted total: {len(all_selected)} candidates for final selection of {target}")
    return all_selected


def process_tech_articles(client, articles: list[dict], other_sections: Optional[dict] = None) -> dict:
    """Use LLM to process tech articles into bilingual feed format."""
    if not articles:
        return {"de": [], "en": []}

    articles_text = "\n\n".join(
        f"Source: {a['source']}\nTitle: {a['title']}\nLink: {a['link']}\nSummary: {a['summary'][:500]}\nDate: {a['published']}"
        for a in articles
    )

    cross_context = _build_cross_section_context(other_sections)

    prompt = f"""You are a tech news editor for a German/English bilingual AI newsletter.
Target audience: Non-technical professionals who want to stay informed about AI.

From the following articles, select EXACTLY 20 of the most important/interesting ones and create feed posts.
You MUST output exactly 20 items in each language array.
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
- You MUST return exactly 20 items in the "de" array and 20 items in the "en" array. Do not return fewer.
- Output ONLY valid JSON, no markdown fences"""

    response = client.chat.completions.create(
        model="deepseek/deepseek-v3.2",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    result = parse_llm_json(response.choices[0].message.content, fallback={"de": [], "en": []})
    return result


def process_investment_articles(client, articles: list[dict], other_sections: Optional[dict] = None) -> dict:
    """Use LLM to process investment articles into bilingual feed format."""
    if not articles:
        return {"primaryMarket": {"de": [], "en": []}, "secondaryMarket": {"de": [], "en": []}, "ma": {"de": [], "en": []}}

    articles_text = "\n\n".join(
        f"Source: {a['source']}\nTitle: {a['title']}\nLink: {a['link']}\nSummary: {a['summary'][:500]}\nDate: {a['published']}"
        for a in articles
    )

    cross_context = _build_cross_section_context(other_sections)

    prompt = f"""You are a financial news editor for a German/English bilingual AI investment newsletter.
Target audience: Non-professional investors interested in AI industry funding and M&A.

From the following articles, categorize into:
1. Primary Market (funding rounds, venture capital)
2. Secondary Market (stock price movements of AI companies)
3. M&A (mergers, acquisitions, partnerships)

Select the most relevant articles. Include up to 7 items per category — aim for as many as the data supports.
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
- Aim for 5-7 items per category. Only return fewer if there truly aren't enough relevant articles.
- sourceUrl: copy the exact Link URL from the original article. Do NOT make up URLs.
- Output ONLY valid JSON, no markdown fences"""

    response = client.chat.completions.create(
        model="deepseek/deepseek-v3.2",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    fallback = {"primaryMarket": {"de": [], "en": []}, "secondaryMarket": {"de": [], "en": []}, "ma": {"de": [], "en": []}}
    return parse_llm_json(response.choices[0].message.content, fallback=fallback)


def process_tips_articles(client, articles: list[dict], other_sections: Optional[dict] = None) -> dict:
    """Use LLM to process tips articles into bilingual feed format."""
    if not articles:
        return {"de": [], "en": []}

    articles_text = "\n\n".join(
        f"Source: {a['source']}\nTitle: {a['title']}\nLink: {a['link']}\nSummary: {a['summary'][:500]}\nDate: {a['published']}"
        for a in articles
    )

    cross_context = _build_cross_section_context(other_sections)

    prompt = f"""You are an AI tips editor for a German/English bilingual newsletter.
Target audience: Non-technical professionals who want practical AI tips they can use immediately.

From the following articles, extract EXACTLY 20 of the most useful, practical AI tips.
You MUST output exactly 20 items in each language array.
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
- You MUST return exactly 20 tips in the "de" array and 20 tips in the "en" array. Do not return fewer.
- Output ONLY valid JSON, no markdown fences"""

    response = client.chat.completions.create(
        model="deepseek/deepseek-v3.2",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    return parse_llm_json(response.choices[0].message.content, fallback={"de": [], "en": []})


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

    context = "\n".join(all_content[:30])

    prompt = f"""Based on this week's AI news content, generate EXACTLY 10 trending topics.
You MUST output exactly 10 items in each language array.

CONTENT:
{context}

Output JSON:
{{
  "trends": {{
    "de": [
      {{"category": "KI · Trend", "title": "Topic Name"}}
    ],
    "en": [
      {{"category": "AI · Trending", "title": "Topic Name"}}
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

    result = parse_llm_json(response.choices[0].message.content, fallback={"trends": {"de": [], "en": []}})

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
    parser.add_argument("--no-enhance-hn", action="store_true", help="Disable HN Algolia API enhancement (use plain RSS)")
    args = parser.parse_args()

    week_id = args.week or current_week_id()
    print(f"Collecting content for {week_id}")

    # Load sources
    sources = load_sources()

    # Stage 0: Unified fetch + dedup
    print("\n--- Stage 0: Fetching all feeds (unified) ---")
    enhance_hn = not args.no_enhance_hn
    all_articles = fetch_all_sources(sources, enhance_hn=enhance_hn)
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

    # Stage 2: Shortlisting + Processing
    print("\n--- Stage 2: Shortlisting + Processing ---")

    print("  [tech] Shortlisting...")
    tech_shortlisted = shortlist_articles(client, tech_articles, target=20)
    print("  [investment] Shortlisting...")
    investment_shortlisted = shortlist_articles(client, investment_articles, target=21)
    print("  [tips] Shortlisting...")
    tips_shortlisted = shortlist_articles(client, tips_articles, target=20)

    print("\n  Processing tech...")
    tech_data = process_tech_articles(
        client, tech_shortlisted,
        other_sections={"investment": investment_articles, "tips": tips_articles},
    )

    print("\n  Processing investment...")
    investment_data = process_investment_articles(
        client, investment_shortlisted,
        other_sections={"tech": tech_articles, "tips": tips_articles},
    )

    print("\n  Processing tips...")
    tips_data = process_tips_articles(
        client, tips_shortlisted,
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
