"""
LLM processing service using DeepSeek via OpenRouter.
"""

import json
import re
import logging
from typing import Optional
from openai import OpenAI

from app.config import get_settings

logger = logging.getLogger(__name__)


def parse_llm_json(text: str, fallback=None):
    """Parse JSON from LLM output, handling common issues."""
    decoder = json.JSONDecoder(strict=False)

    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)

    try:
        return decoder.decode(text)
    except json.JSONDecodeError:
        pass

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

    try:
        return decoder.decode(extracted)
    except json.JSONDecodeError:
        pass

    cleaned = re.sub(r'(?<!")//[^\n]*', "", extracted)
    cleaned = re.sub(r",\s*([}\]])", r"\1", cleaned)

    try:
        return decoder.decode(cleaned)
    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse failed after cleanup: {e}")
        return fallback


class LLMProcessor:
    """LLM processing service for content generation."""

    def __init__(self):
        settings = get_settings()
        if not settings.openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY not configured")

        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key,
        )
        self.model = "deepseek/deepseek-v3.2"

    def _call_llm(self, prompt: str, temperature: float = 0.3) -> str:
        """Make an LLM API call."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
        )
        return response.choices[0].message.content

    def classify_articles(self, articles: list[dict]) -> list[dict]:
        """Classify articles into sections (tech/investment/tips)."""
        if not articles:
            return []

        article_entries = []
        for i, a in enumerate(articles):
            article_entries.append(
                f"[{i}] Source: {a['source']} (hint: {a.get('original_section', 'unknown')})\n"
                f"    Title: {a['title']}\n"
                f"    Summary: {a['summary'][:300]}"
            )
        articles_text = "\n\n".join(article_entries)

        prompt = f"""You are an AI news classifier for a bilingual (German/English) weekly newsletter.

Your task: classify each article into EXACTLY ONE section.

SECTION DEFINITIONS:
- "tech": AI technology breakthroughs, new models, research papers, product launches, technical infrastructure.
- "investment": Funding rounds, venture capital, IPOs, stock movements of AI companies, M&A deals.
- "tips": Practical AI usage tips, prompt engineering, productivity workflows, tool tutorials.

ARTICLES:
{articles_text}

Output a JSON array with one entry per article:
[{{"index": 0, "section": "tech", "relevance": 0.9, "duplicate_of": null}}]

Fields:
- index: article index
- section: "tech" | "investment" | "tips"
- relevance: 0.0-1.0 how relevant/important
- duplicate_of: index of better article covering same event, or null

Output ONLY the JSON array, no markdown fences."""

        response = self._call_llm(prompt, temperature=0.1)
        classifications = parse_llm_json(response, fallback=None)

        if classifications is None:
            logger.warning("Could not parse classification response, using hints")
            for a in articles:
                a["section"] = a.get("original_section", "tech")
                a["relevance"] = 0.5
            return articles

        classified = []
        classification_map = {c["index"]: c for c in classifications}

        for i, article in enumerate(articles):
            c = classification_map.get(i)
            if c is None:
                article["section"] = article.get("original_section", "tech")
                article["relevance"] = 0.5
                classified.append(article)
                continue

            if c.get("duplicate_of") is not None:
                continue

            article["section"] = c["section"]
            article["relevance"] = c.get("relevance", 0.5)
            classified.append(article)

        classified.sort(key=lambda a: a.get("relevance", 0), reverse=True)
        return classified

    def process_tech_articles(
        self,
        articles: list[dict],
        count: int = 20,
    ) -> dict:
        """Process tech articles into bilingual feed format."""
        if not articles:
            return {"de": [], "en": []}

        articles_text = "\n\n".join(
            f"Source: {a['source']}\nTitle: {a['title']}\nLink: {a['link']}\nSummary: {a['summary'][:500]}\nDate: {a['published']}"
            for a in articles[:40]
        )

        prompt = f"""You are a tech news editor for a German/English bilingual AI newsletter.
Target audience: Non-technical professionals who want to stay informed about AI.

From the following articles, select EXACTLY {count} of the most important/interesting ones.

ARTICLES:
{articles_text}

Output a JSON object with this structure:
{{
  "de": [
    {{
      "id": 1,
      "author": {{"name": "Source Name", "handle": "@source", "avatar": "XX", "verified": true}},
      "content": "German summary (2-3 sentences, non-technical)",
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
    // Same structure but English content
  ]
}}

Rules:
- iconType: Brain (LLM/AI models), Server (infrastructure), Zap (research), Cpu (safety/technical)
- impact: critical (industry-changing), high (significant), medium (notable), low (informational)
- sourceUrl: copy the exact Link URL from the original article
- Output ONLY valid JSON"""

        response = self._call_llm(prompt, temperature=0.3)
        return parse_llm_json(response, fallback={"de": [], "en": []})

    def process_youtube_videos(
        self,
        videos: list[dict],
        count: int = 5,
    ) -> dict:
        """Process YouTube videos into bilingual feed format."""
        if not videos:
            return {"de": [], "en": []}

        videos_text = "\n\n".join(
            f"VideoID: {v['video_id']}\nTitle: {v['original_title']}\nChannel: {v['channel_name']}\n"
            f"Views: {v['view_count_formatted']}\nDuration: {v['duration_formatted']}\n"
            f"Description: {v.get('description', '')[:300]}"
            for v in videos[:20]
        )

        prompt = f"""You are a video content curator for a German/English bilingual AI newsletter.
Target audience: Non-technical professionals interested in AI.

From these YouTube videos, select the {count} most valuable and relevant ones.
Create bilingual summaries for each.

VIDEOS:
{videos_text}

Output a JSON object:
{{
  "de": [
    {{
      "video_id": "XXXXX",
      "title": "German title (translated/adapted)",
      "summary": "German summary (2-3 sentences explaining value for viewers)",
      "category": "Category in German"
    }}
  ],
  "en": [
    {{
      "video_id": "XXXXX",
      "title": "English title (can match original or be improved)",
      "summary": "English summary (2-3 sentences)",
      "category": "Category in English"
    }}
  ]
}}

Select videos that:
- Explain AI concepts clearly
- Provide practical tutorials
- Cover important news
- Are from reputable channels

Output ONLY valid JSON."""

        response = self._call_llm(prompt, temperature=0.3)
        return parse_llm_json(response, fallback={"de": [], "en": []})

    def process_investment_articles(self, articles: list[dict]) -> dict:
        """Process investment articles into bilingual feed format."""
        if not articles:
            return {
                "primaryMarket": {"de": [], "en": []},
                "secondaryMarket": {"de": [], "en": []},
                "ma": {"de": [], "en": []},
            }

        articles_text = "\n\n".join(
            f"Source: {a['source']}\nTitle: {a['title']}\nLink: {a['link']}\nSummary: {a['summary'][:500]}\nDate: {a['published']}"
            for a in articles[:40]
        )

        prompt = f"""You are a financial news editor for a German/English bilingual AI investment newsletter.

Categorize these articles into:
1. Primary Market (funding rounds)
2. Secondary Market (stock movements)
3. M&A (mergers, acquisitions)

ARTICLES:
{articles_text}

Output JSON with structure for primaryMarket, secondaryMarket, and ma.
Each category has "de" and "en" arrays with appropriate fields.

Include up to 7 items per category.
Use German number formatting for 'de' (e.g., $2,75 Mrd.)
Use English number formatting for 'en' (e.g., $2.75B)
sourceUrl: copy the exact Link URL

Output ONLY valid JSON."""

        response = self._call_llm(prompt, temperature=0.3)
        fallback = {
            "primaryMarket": {"de": [], "en": []},
            "secondaryMarket": {"de": [], "en": []},
            "ma": {"de": [], "en": []},
        }
        return parse_llm_json(response, fallback=fallback)

    def process_tips_articles(self, articles: list[dict], count: int = 20) -> dict:
        """Process tips articles into bilingual feed format."""
        if not articles:
            return {"de": [], "en": []}

        articles_text = "\n\n".join(
            f"Source: {a['source']}\nTitle: {a['title']}\nLink: {a['link']}\nSummary: {a['summary'][:500]}\nDate: {a['published']}"
            for a in articles[:40]
        )

        prompt = f"""You are an AI tips editor for a German/English bilingual newsletter.
Target audience: Non-technical professionals wanting practical AI tips.

Extract EXACTLY {count} useful, practical AI tips from these articles.
Focus on: ChatGPT/Claude/Gemini usage, prompt techniques, productivity workflows.

ARTICLES:
{articles_text}

Output JSON:
{{
  "de": [
    {{
      "id": 1,
      "author": {{"name": "Source", "handle": "@source", "avatar": "XX", "verified": true}},
      "platform": "X|Reddit",
      "content": "German description (2-3 sentences)",
      "tip": "The actual tip/prompt template",
      "category": "Category in German",
      "difficulty": "Anfänger|Mittel|Fortgeschritten",
      "timestamp": "YYYY-MM-DD",
      "metrics": {{"comments": 0, "retweets": 0, "likes": 0, "views": "0"}},
      "sourceUrl": "https://original-url"
    }}
  ],
  "en": [/* same but English, difficulty: Beginner|Intermediate|Advanced */]
}}

Tips should be immediately actionable (no coding required).
Output ONLY valid JSON."""

        response = self._call_llm(prompt, temperature=0.3)
        return parse_llm_json(response, fallback={"de": [], "en": []})

    def generate_trends(self, tech_data: dict, investment_data: dict) -> dict:
        """Generate trending topics from the week's content."""
        all_content = []
        for post in tech_data.get("en", []):
            all_content.append(post.get("content", ""))
        for section in ["primaryMarket", "secondaryMarket", "ma"]:
            section_data = investment_data.get(section, {})
            # Handle case where LLM returned a list instead of dict
            if isinstance(section_data, dict):
                en_posts = section_data.get("en", [])
            else:
                en_posts = []
            for post in en_posts:
                if isinstance(post, dict):
                    all_content.append(post.get("content", ""))

        if not all_content:
            return self._default_trends()

        context = "\n".join(all_content[:30])

        prompt = f"""Based on this week's AI news, generate EXACTLY 10 trending topics.

CONTENT:
{context}

Output JSON:
{{
  "trends": {{
    "de": [{{"category": "KI · Trend", "title": "Topic Name"}}],
    "en": [{{"category": "AI · Trending", "title": "Topic Name"}}]
  }}
}}

Categories: KI, Technologie, Finanzen, Wissenschaft, Startups (German)
           AI, Technology, Finance, Science, Startups (English)
Output ONLY valid JSON."""

        response = self._call_llm(prompt, temperature=0.5)
        result = parse_llm_json(response, fallback={"trends": {"de": [], "en": []}})
        result["teamMembers"] = self._default_team_members()
        return result

    def _default_trends(self) -> dict:
        """Return default trends structure."""
        return {
            "trends": {"de": [], "en": []},
            "teamMembers": self._default_team_members(),
        }

    def _default_team_members(self) -> dict:
        """Return default team members."""
        return {
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
