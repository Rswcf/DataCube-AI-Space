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

    # BUG-H5: Fixed regex to avoid corrupting URLs
    # Only remove // comments that start after whitespace at beginning of line or after certain JSON tokens
    # This preserves URLs like https:// while removing actual comments
    cleaned = re.sub(r'^\s*//[^\n]*', "", extracted, flags=re.MULTILINE)
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
        # Free model for classification (simple task)
        self.classifier_model = "z-ai/glm-4.5-air:free"
        # High-quality model for content processing
        self.processor_model = "deepseek/deepseek-v3.2"

    def _call_llm(self, prompt: str, temperature: float = 0.3, use_classifier: bool = False, timeout: float = 120.0) -> str:
        """Make an LLM API call.

        Args:
            prompt: The prompt to send
            temperature: Sampling temperature
            use_classifier: If True, use free classifier model; otherwise use processor model
            timeout: Request timeout in seconds (default 120s)

        Returns:
            LLM response content string

        Raises:
            Exception: Re-raises after logging if API call fails
        """
        model = self.classifier_model if use_classifier else self.processor_model
        # BUG-H6: Add try/except and timeout to LLM API calls
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                timeout=timeout,
            )
            # Handle empty response
            if not response.choices or not response.choices[0].message:
                logger.warning(f"Empty response from LLM model {model}")
                return ""
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"LLM API call failed (model={model}): {e}")
            raise

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

        response = self._call_llm(prompt, temperature=0.1, use_classifier=True)
        classifications = parse_llm_json(response, fallback=None)

        if classifications is None:
            logger.warning("Could not parse classification response, using hints")
            for a in articles:
                a["section"] = a.get("original_section", "tech")
                a["relevance"] = 0.5
            return articles

        classified = []
        # BUG-H7: Validate classification_map structure before use
        if not isinstance(classifications, list):
            logger.warning("Classification result is not a list, using hints")
            for a in articles:
                a["section"] = a.get("original_section", "tech")
                a["relevance"] = 0.5
            return articles

        classification_map = {}
        for c in classifications:
            if isinstance(c, dict) and "index" in c:
                # Handle index as string or int
                idx = c["index"]
                if isinstance(idx, str) and idx.isdigit():
                    idx = int(idx)
                classification_map[idx] = c

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
- source: Copy the original source name from the article (e.g., "MIT Technology Review", "The Decoder")
- sourceUrl: Copy the exact Link URL from the original article
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
Content may be in English OR Chinese (from 36Kr) - process both languages equally.

Categorize these articles into:
1. Primary Market (funding rounds, venture capital investments)
2. Secondary Market (stock price movements, IPOs, public company news)
3. M&A (mergers, acquisitions, buyouts)

ARTICLES:
{articles_text}

Output a JSON object with this EXACT structure:
{{
  "primaryMarket": {{
    "de": [
      {{
        "id": 1,
        "company": "Company Name",
        "amount": "$50 Mio.",
        "round": "Series B",
        "roundCategory": "Series B",
        "investors": ["Investor 1", "Investor 2"],
        "valuation": "$500 Mio.",
        "content": "German description (2-3 sentences)",
        "author": {{"name": "Source Name", "handle": "@source", "avatar": "XX", "verified": true}},
        "timestamp": "YYYY-MM-DD",
        "sourceUrl": "https://...",
        "metrics": {{"comments": 0, "retweets": 0, "likes": 0, "views": "0"}}
      }}
    ],
    "en": [
      {{
        "id": 1,
        "company": "Company Name",
        "amount": "$50M",
        "round": "Series B",
        "roundCategory": "Series B",
        "investors": ["Investor 1", "Investor 2"],
        "valuation": "$500M",
        "content": "English description (2-3 sentences)",
        "author": {{"name": "Source Name", "handle": "@source", "avatar": "XX", "verified": true}},
        "timestamp": "YYYY-MM-DD",
        "sourceUrl": "https://...",
        "metrics": {{"comments": 0, "retweets": 0, "likes": 0, "views": "0"}}
      }}
    ]
  }},
  "secondaryMarket": {{
    "de": [
      {{
        "id": 1,
        "ticker": "NVDA",
        "price": "$850",
        "change": "+5.2%",
        "direction": "up",
        "marketCap": "$2,1 Bio.",
        "content": "German description",
        "author": {{"name": "Source Name", "handle": "@source", "avatar": "XX", "verified": true}},
        "timestamp": "YYYY-MM-DD",
        "sourceUrl": "https://...",
        "metrics": {{"comments": 0, "retweets": 0, "likes": 0, "views": "0"}}
      }}
    ],
    "en": [
      {{
        "id": 1,
        "ticker": "NVDA",
        "price": "$850",
        "change": "+5.2%",
        "direction": "up",
        "marketCap": "$2.1T",
        "content": "English description",
        "author": {{"name": "Source Name", "handle": "@source", "avatar": "XX", "verified": true}},
        "timestamp": "YYYY-MM-DD",
        "sourceUrl": "https://...",
        "metrics": {{"comments": 0, "retweets": 0, "likes": 0, "views": "0"}}
      }}
    ]
  }},
  "ma": {{
    "de": [
      {{
        "id": 1,
        "acquirer": "Acquiring Company",
        "target": "Target Company",
        "dealValue": "$1,5 Mrd.",
        "dealType": "Akquisition",
        "industry": "Enterprise",
        "content": "German description",
        "author": {{"name": "Source Name", "handle": "@source", "avatar": "XX", "verified": true}},
        "timestamp": "YYYY-MM-DD",
        "sourceUrl": "https://...",
        "metrics": {{"comments": 0, "retweets": 0, "likes": 0, "views": "0"}}
      }}
    ],
    "en": [
      {{
        "id": 1,
        "acquirer": "Acquiring Company",
        "target": "Target Company",
        "dealValue": "$1.5B",
        "dealType": "Acquisition",
        "industry": "Enterprise",
        "content": "English description",
        "author": {{"name": "Source Name", "handle": "@source", "avatar": "XX", "verified": true}},
        "timestamp": "YYYY-MM-DD",
        "sourceUrl": "https://...",
        "metrics": {{"comments": 0, "retweets": 0, "likes": 0, "views": "0"}}
      }}
    ]
  }}
}}

Rules:
- Include up to 7 items per category
- Use German number formatting for 'de' (e.g., $2,75 Mrd., $500 Mio.)
- Use English number formatting for 'en' (e.g., $2.75B, $500M)
- direction: "up" or "down" based on price change
- dealType German: "Akquisition", "Fusion", "Übernahme"
- dealType English: "Acquisition", "Merger", "Buyout"
- sourceUrl: copy the exact Link URL from the article
- IMPORTANT: Each category MUST have both "de" and "en" arrays, even if empty

ROUND CATEGORY CLASSIFICATION (for Primary Market):
- "Early": Pre-Seed, Seed, Angel, Accelerator (keywords: seed, angel, pre-seed, accelerator, 种子, 天使, 孵化)
- "Series A": Series A, A+ rounds (keywords: series a, a round, a1, A轮, A+轮)
- "Series B": Series B, B+ rounds (keywords: series b, b round, B轮, B+轮)
- "Series C+": Series C, D, E, F and beyond (keywords: series c/d/e/f, C轮, D轮, E轮)
- "Late/PE": Growth, Pre-IPO, Buyout, LBO (keywords: growth, pre-ipo, buyout, lbo, 成长轮, 上市前, 收购)
- "Unknown": If round cannot be determined

INDUSTRY CLASSIFICATION (for M&A):
- "Healthcare": healthcare, biotech, medical, pharma, life sciences (keywords: healthcare, biotech, medical, pharma, 医疗, 生物)
- "FinTech": fintech, banking, payments, insurance tech (keywords: fintech, banking, payments, 金融, 支付)
- "Enterprise": enterprise software, SaaS, B2B, cloud (keywords: enterprise, saas, b2b, cloud, 企业服务)
- "Consumer": consumer tech, retail, e-commerce, social (keywords: consumer, retail, e-commerce, 消费, 零售)
- "Other": default if no clear match

Output ONLY valid JSON."""

        response = self._call_llm(prompt, temperature=0.3)
        fallback = {
            "primaryMarket": {"de": [], "en": []},
            "secondaryMarket": {"de": [], "en": []},
            "ma": {"de": [], "en": []},
        }
        return parse_llm_json(response, fallback=fallback)

    def process_tips_articles(self, articles: list[dict], count: int = 10) -> dict:
        """Process tips articles into bilingual feed format."""
        if not articles:
            return {"de": [], "en": []}

        def sanitize(text: str) -> str:
            """Remove characters that might break JSON output."""
            if not text:
                return ""
            # Remove control characters, quotes, and backslashes
            text = re.sub(r'[\x00-\x1f\x7f"\\]', ' ', text)
            return ' '.join(text.split())[:200]

        # Build simple article list
        article_lines = []
        for i, a in enumerate(articles[:15]):
            article_lines.append(
                f"{i+1}. [{a['source']}] {sanitize(a['title'])} - {sanitize(a['summary'][:100])}"
            )
        articles_text = "\n".join(article_lines)

        prompt = f"""Extract {count} AI tips from these articles. Output JSON only.

ARTICLES:
{articles_text}

Output format:
{{"de":[{{"id":1,"content":"German tip description","tip":"The tip in German","category":"Produktivität","platform":"Reddit","sourceUrl":"url"}}],"en":[{{"id":1,"content":"English tip description","tip":"The tip in English","category":"Productivity","platform":"Reddit","sourceUrl":"url"}}]}}

Rules:
- {count} items in both de and en arrays
- category: Produktivität/Productivity, Prompt-Tipps/Prompt Tips, Kreativität/Creativity
- platform: Reddit, Blog, or X
- Keep tips short and actionable
- No special characters in strings

JSON:"""

        response = self._call_llm(prompt, temperature=0.2)
        result = parse_llm_json(response, fallback={"de": [], "en": []})

        # Add missing fields with defaults
        for lang in ["de", "en"]:
            for i, tip in enumerate(result.get(lang, [])):
                tip.setdefault("id", i + 1)
                tip.setdefault("author", {"name": "AI Tips", "handle": "@tips", "avatar": "TI", "verified": True})
                tip.setdefault("difficulty", "Mittel" if lang == "de" else "Intermediate")
                tip.setdefault("timestamp", "2026-02-01")
                tip.setdefault("metrics", {"comments": 0, "retweets": 0, "likes": 0, "views": "0"})

        return result

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
        # BUG-H8: Handle non-dict trends result
        if not isinstance(result, dict):
            logger.warning(f"Trends result is not a dict (got {type(result).__name__}), using fallback")
            result = {"trends": {"de": [], "en": []}}
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
