"""
LLM processing service using DeepSeek via OpenRouter.
"""

import json
import re
import time
import logging
from openai import OpenAI, RateLimitError

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

    # 2026-07-31 refresh — all three chains now share the same paid-first shape:
    #   1. `deepseek/deepseek-v4-flash-0731` (released 2026-07-31; same
    #      $0.14/$0.28 per M and 1M context as the April v4-flash) as primary.
    #   2. `qwen/qwen3.7-flash` (released 2026-07; $0.03/$0.13 per M, 1M
    #      context) as the paid buffer — deliberately a different vendor than
    #      DeepSeek so a family-wide outage/regression doesn't drop us straight
    #      to free tier; also the strongest ZH/JA/KO of the cheap flash class.
    #   3. The three surviving free models as last-resort fallback.
    # Removed (delisted from the OpenRouter catalog, free tiers dropped):
    #   `z-ai/glm-4.5-air:free`, `meta-llama/llama-3.3-70b-instruct:free`,
    #   `qwen/qwen3-coder:free`, `minimax/minimax-m2.5:free`,
    #   `qwen/qwen3-next-80b-a3b-instruct:free`.
    # Removed (superseded paid models): `deepseek/deepseek-v4-flash` (April
    # snapshot) and `deepseek/deepseek-v3.2`.
    # Prompts are short (classification ~0.5k, translation ~1-2k tokens), so
    # paid-first adds roughly $0.15-0.50/day total across all three chains.
    CLASSIFIER_MODELS = [
        "deepseek/deepseek-v4-flash-0731",
        "qwen/qwen3.7-flash",
        "nvidia/nemotron-3-super-120b-a12b:free",
        "nvidia/nemotron-3-nano-30b-a3b:free",
        "google/gemma-4-31b-it:free",
    ]

    # Stage 3.5 fans out 24 (4 sections × 6 langs) JSON-translation tasks via
    # 3 ThreadPool workers. Free-first ordering caused two full Stage 3.5
    # wipeouts under peak-time 429 cascades (2026-04-15, 2026-04-24); paid-first
    # eliminates that failure mode for ~$0.05-0.15/day.
    TRANSLATOR_MODELS = [
        "deepseek/deepseek-v4-flash-0731",
        "qwen/qwen3.7-flash",
        "nvidia/nemotron-3-super-120b-a12b:free",
        "nvidia/nemotron-3-nano-30b-a3b:free",
        "google/gemma-4-31b-it:free",
    ]

    PROCESSOR_MODELS = [
        "deepseek/deepseek-v4-flash-0731",
        "qwen/qwen3.7-flash",
        "nvidia/nemotron-3-super-120b-a12b:free",
        "nvidia/nemotron-3-nano-30b-a3b:free",
        "google/gemma-4-31b-it:free",
    ]

    def __init__(self):
        settings = get_settings()
        if not settings.openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY not configured")

        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key,
        )

    def _call_llm(self, prompt: str, temperature: float = 0.3, use_classifier: bool = False,
                  timeout: float = 120.0, expect_json: bool = True) -> str:
        """Make an LLM API call with retry and fallback logic.

        Both classifier and processor use fallback chains.

        Args:
            prompt: The prompt to send
            temperature: Sampling temperature
            use_classifier: If True, use CLASSIFIER_MODELS; otherwise PROCESSOR_MODELS
            timeout: Request timeout in seconds (default 120s)
            expect_json: If True (default for processor), validate the response
                parses as JSON. Invalid JSON on a model is treated as a
                retriable failure before falling back to the next model.
                Previously the processor path accepted ANY non-blank string —
                when the paid model was rate-limited / out-of-credits and the
                chain fell back to smaller free models (gemma, qwen) they
                often returned explanation text instead of valid JSON,
                upstream `parse_llm_json` coerced it to `{}`, and tech/invest
                silently ended up with 0 items.

        Returns:
            LLM response content string

        Raises:
            Exception: Re-raises after all models/retries are exhausted
        """
        if use_classifier:
            return self._call_with_fallback(prompt, temperature, timeout, expect_json=expect_json)

        # Processor model: fallback chain with retries
        models = self.PROCESSOR_MODELS
        retries_per_model = 2
        base_delay = 2
        last_error = None

        for model in models:
            for attempt in range(retries_per_model):
                try:
                    response = self.client.chat.completions.create(
                        model=model,
                        messages=[{"role": "user", "content": prompt}],
                        temperature=temperature,
                        timeout=timeout,
                    )
                    if not response.choices or not response.choices[0].message:
                        logger.warning(f"Empty response from processor model {model}")
                        last_error = RuntimeError(f"Empty response from {model}")
                        break  # try next model
                    content = response.choices[0].message.content or ""
                    if not content.strip():
                        logger.warning(f"Blank content from processor model {model}")
                        last_error = RuntimeError(f"Blank content from {model}")
                        break  # try next model

                    if expect_json:
                        parsed = parse_llm_json(content, fallback=None)
                        if parsed is None:
                            logger.warning(
                                f"Invalid JSON from processor {model}, attempt "
                                f"{attempt + 1}/{retries_per_model}. Content head: "
                                f"{content[:200]!r}"
                            )
                            last_error = ValueError(f"Invalid JSON from {model}")
                            if attempt < retries_per_model - 1:
                                time.sleep(base_delay * (2 ** attempt))
                                continue  # retry same model
                            else:
                                logger.warning(
                                    f"Processor {model} exhausted (bad JSON), trying next fallback..."
                                )
                                break  # next model

                    logger.info(f"Processor succeeded with model: {model}")
                    return content
                except RateLimitError as e:
                    last_error = e
                    delay = base_delay * (2 ** attempt)
                    logger.warning(f"Rate limited (429) on {model}, attempt {attempt + 1}/{retries_per_model}. "
                                   f"Retrying in {delay}s...")
                    if attempt < retries_per_model - 1:
                        time.sleep(delay)
                    else:
                        logger.warning(f"Processor model {model} exhausted, trying next fallback...")
                except Exception as e:
                    logger.error(f"Processor call failed on {model}: {e}")
                    last_error = e
                    break  # non-rate-limit error: skip to next model

        logger.error(f"All {len(models)} processor models exhausted")
        raise last_error or RuntimeError("All processor models failed")

    def _call_with_fallback(self, prompt: str, temperature: float, timeout: float,
                            expect_json: bool = False,
                            models: "list[str] | None" = None,
                            chain_name: str = "classifier") -> str:
        """Try a model chain in order, falling back on rate limits or bad JSON.

        Each model gets 2 retry attempts with exponential backoff before
        moving to the next model in the chain.

        Args:
            prompt: The prompt to send.
            temperature: Sampling temperature.
            timeout: Request timeout in seconds.
            expect_json: If True, validate that the response parses as JSON.
                         Invalid JSON is treated as a retriable failure.
            models: Optional explicit chain. Defaults to CLASSIFIER_MODELS.
                    Translator path passes TRANSLATOR_MODELS (free chain + paid tail).
            chain_name: Label used in log lines for diagnostics ("classifier" / "translator").
        """
        chain = models if models is not None else self.CLASSIFIER_MODELS
        retries_per_model = 2
        base_delay = 2
        last_error = None

        for model in chain:
            for attempt in range(retries_per_model):
                try:
                    response = self.client.chat.completions.create(
                        model=model,
                        messages=[{"role": "user", "content": prompt}],
                        temperature=temperature,
                        timeout=timeout,
                    )
                    if not response.choices or not response.choices[0].message:
                        logger.warning(f"Empty response from {chain_name} model {model}")
                        return ""
                    content = response.choices[0].message.content or ""

                    # Validate JSON if required
                    if expect_json and content:
                        parsed = parse_llm_json(content, fallback=None)
                        if parsed is None:
                            logger.warning(
                                f"Invalid JSON from {model}, attempt {attempt + 1}/{retries_per_model}"
                            )
                            last_error = ValueError(f"Invalid JSON from {model}")
                            if attempt < retries_per_model - 1:
                                time.sleep(base_delay * (2 ** attempt))
                                continue  # retry same model
                            else:
                                logger.warning(f"Model {model} exhausted (bad JSON), trying next fallback...")
                                break  # try next model

                    logger.info(f"{chain_name.capitalize()} succeeded with model: {model}")
                    return content
                except RateLimitError as e:
                    last_error = e
                    delay = base_delay * (2 ** attempt)
                    logger.warning(f"Rate limited (429) on {model}, attempt {attempt + 1}/{retries_per_model}. "
                                   f"Retrying in {delay}s...")
                    if attempt < retries_per_model - 1:
                        time.sleep(delay)
                    else:
                        logger.warning(f"Model {model} exhausted, trying next fallback...")
                except Exception as e:
                    logger.error(f"{chain_name.capitalize()} call failed on {model}: {e}")
                    last_error = e
                    # Non-rate-limit error: skip to next model immediately
                    break

        logger.error(f"All {len(chain)} {chain_name} models exhausted")
        raise last_error or RuntimeError(f"All {chain_name} models failed")

    def _try_translate_batch(
        self,
        batch: list[dict],
        target_lang: str,
        fields: list[str],
        lang_name: str,
    ) -> "list[dict] | None":
        """Attempt to translate a single batch. Returns list of translated dicts or None on failure.

        Uses expect_json=True so _call_with_fallback retries on unparseable JSON.
        """
        source_items = []
        for i, item in enumerate(batch):
            entry = {"_idx": i}
            for f in fields:
                val = item.get(f)
                if val is not None:
                    entry[f] = val
            source_items.append(entry)

        source_json = json.dumps(source_items, ensure_ascii=False)

        prompt = f"""Translate the following JSON items from English to {lang_name}.
Translate ONLY the text values. Keep these unchanged: _idx, numbers, URLs, proper nouns (company names, person names, ticker symbols), JSON structure.
For array fields (like tags), translate each element.

Input:
{source_json}

Output the translated JSON array with the same structure. Output ONLY the JSON array, no explanation."""

        try:
            response = self._call_with_fallback(
                prompt, temperature=0.2, timeout=120.0, expect_json=True,
                models=self.TRANSLATOR_MODELS, chain_name="translator",
            )
            translated = parse_llm_json(response, fallback=None)

            if translated and isinstance(translated, list):
                # Map by _idx for robustness
                idx_map = {}
                for t in translated:
                    if isinstance(t, dict) and "_idx" in t:
                        idx_map[t["_idx"]] = t

                result = []
                for i in range(len(batch)):
                    t = idx_map.get(i, {})
                    t.pop("_idx", None)
                    result.append(t)
                return result
            else:
                logger.warning(f"Translation to {target_lang} returned non-list for batch of {len(batch)}")
                return None
        except Exception as e:
            logger.error(f"Translation to {target_lang} error for batch of {len(batch)}: {e}")
            return None

    def translate_batch(
        self,
        items: list[dict],
        target_lang: str,
        fields: list[str],
        batch_size: int = 10,
    ) -> list[dict]:
        """Translate specific fields of items from English to target language.

        Uses the free classifier model chain (_call_with_fallback) for zero-cost translation.
        On failure, retries with smaller batch chunks (size=3) for simpler JSON output.

        Args:
            items: List of dicts with English field values to translate.
            target_lang: Target language code (zh, fr, es, pt, ja, ko).
            fields: List of field names to translate in each item.
            batch_size: Number of items per LLM call.

        Returns:
            List of dicts containing only the translated fields for each item.
        """
        from app.services.i18n_utils import LANGUAGE_NAMES

        lang_name = LANGUAGE_NAMES.get(target_lang, target_lang)
        all_translated: list[dict] = []
        mini_batch_size = 3

        for start in range(0, len(items), batch_size):
            batch = items[start:start + batch_size]
            translated = self._try_translate_batch(batch, target_lang, fields, lang_name)

            # If full batch failed and it's larger than mini_batch_size, retry with smaller chunks
            if translated is None and len(batch) > mini_batch_size:
                logger.info(
                    f"Retrying {target_lang} batch at offset {start} with smaller chunks (size={mini_batch_size})"
                )
                translated = []
                for mini_start in range(0, len(batch), mini_batch_size):
                    mini_batch = batch[mini_start:mini_start + mini_batch_size]
                    mini_result = self._try_translate_batch(
                        mini_batch, target_lang, fields, lang_name,
                    )
                    if mini_result:
                        translated.extend(mini_result)
                    else:
                        translated.extend([{} for _ in mini_batch])

            if translated:
                all_translated.extend(translated)
            else:
                all_translated.extend([{} for _ in batch])

        return all_translated

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

        prompt = f"""You are an AI news classifier for DataCube AI, a daily AI briefing for a global audience.

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
        count: int = 30,
    ) -> dict:
        """Process tech articles into the EN-native feed format.

        Returns {"de": [], "en": [...]} — the DE array is filled later by
        Stage 3.5 translation + `_mirror_de_from_translations`.
        """
        if not articles:
            return {"de": [], "en": []}

        articles_text = "\n\n".join(
            f"Source: {a['source']}\nTitle: {a['title']}\nLink: {a['link']}\nSummary: {a['summary'][:500]}\nDate: {a['published']}"
            for a in articles[:40]
        )

        prompt = f"""You are an editor for DataCube AI, a daily AI news briefing read by a global
audience of professionals, developers, and AI enthusiasts.

From the following articles, select EXACTLY {count} of the most important ones.

ARTICLES:
{articles_text}

Output a JSON object with this structure:
{{
  "en": [
    {{
      "id": 1,
      "content": "English summary (2-3 sentences)",
      "tags": ["Tag1", "Tag2", "Tag3"],
      "category": "Category name",
      "iconType": "Brain|Server|Zap|Cpu",
      "impact": "critical|high|medium|low",
      "timestamp": "YYYY-MM-DD",
      "source": "Source Name",
      "sourceUrl": "https://original-article-url"
    }}
  ]
}}

Editorial voice:
- Clear, direct, specific. Lead with what happened, then why it matters.
- Include concrete numbers, model names, and company names when available.
- No hype, no marketing language, no rhetorical questions.

Rules:
- iconType: Brain (LLM/AI models), Server (infrastructure), Zap (research), Cpu (safety/technical)
- impact: critical (industry-changing), high (significant), medium (notable), low (informational)
- source: Copy the original source name from the article (e.g., "MIT Technology Review", "The Decoder")
- sourceUrl: Copy the exact Link URL from the original article
- Output ONLY valid JSON"""

        response = self._call_llm(prompt, temperature=0.3)
        result = parse_llm_json(response, fallback={"en": []})
        if isinstance(result, dict):
            result.setdefault("de", [])
            result.setdefault("en", [])
        return result

    def process_youtube_videos(
        self,
        videos: list[dict],
        count: int = 5,
    ) -> dict:
        """Process YouTube videos into the EN-native feed format."""
        if not videos:
            return {"de": [], "en": []}

        videos_text = "\n\n".join(
            f"VideoID: {v['video_id']}\nTitle: {v['original_title']}\nChannel: {v['channel_name']}\n"
            f"Views: {v['view_count_formatted']}\nDuration: {v['duration_formatted']}\n"
            f"Description: {v.get('description', '')[:300]}"
            for v in videos[:20]
        )

        prompt = f"""You are a video curator for DataCube AI, a daily AI briefing for a global
audience of professionals, developers, and AI enthusiasts.

From these YouTube videos, select the {count} most valuable and relevant ones.

VIDEOS:
{videos_text}

Output a JSON object:
{{
  "en": [
    {{
      "video_id": "XXXXX",
      "title": "English title (can match original or be improved)",
      "summary": "English summary (2-3 sentences, specific about what the viewer learns)",
      "category": "Category"
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
        result = parse_llm_json(response, fallback={"en": []})
        if isinstance(result, dict):
            result.setdefault("de", [])
            result.setdefault("en", [])
        return result

    def process_investment_articles(self, articles: list[dict], count: int = 10) -> dict:
        """Process investment articles into the EN-native feed format."""
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

        prompt = f"""You are a financial news editor for DataCube AI, a daily AI briefing read by a
global audience of investors, founders, and technology professionals.
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
    "en": [
      {{
        "id": 1,
        "company": "Company Name",
        "amount": "$50M",
        "round": "Series B",
        "roundCategory": "Series B",
        "investors": ["Investor 1", "Investor 2"],
        "valuation": "$500M",
        "content": "English description (2-3 sentences, specific numbers and investors)",
        "timestamp": "YYYY-MM-DD",
        "sourceUrl": "https://..."
      }}
    ]
  }},
  "secondaryMarket": {{
    "en": [
      {{
        "id": 1,
        "ticker": "NVDA",
        "content": "English description of stock news/movement (2-3 sentences)",
        "timestamp": "YYYY-MM-DD",
        "sourceUrl": "https://..."
      }}
    ]
  }},
  "ma": {{
    "en": [
      {{
        "id": 1,
        "acquirer": "Acquiring Company",
        "target": "Target Company",
        "dealValue": "$1.5B",
        "dealType": "Acquisition",
        "industry": "Enterprise",
        "content": "English description",
        "timestamp": "YYYY-MM-DD",
        "sourceUrl": "https://..."
      }}
    ]
  }}
}}

Rules:
- Include EXACTLY {count} items per category (primaryMarket, secondaryMarket, ma) - select the most important/newsworthy ones
- Use English number formatting (e.g., $2.75B, $500M)
- dealType: "Acquisition", "Merger", "Buyout"
- sourceUrl: copy the exact Link URL from the article
- IMPORTANT: Each category MUST have an "en" array, even if empty
- For secondaryMarket: ONLY include ticker and content. Price/change/marketCap will be fetched from real-time API.

ROUND CATEGORY CLASSIFICATION (for Primary Market):
- "Early": Pre-Seed, Seed, Angel, Accelerator (keywords: seed, angel, pre-seed, accelerator, 种子, 天使, 孵化)
- "Series A": Series A, A+ rounds (keywords: series a, a round, a1, A轮, A+轮)
- "Series B": Series B, B+ rounds (keywords: series b, b round, B轮, B+轮)
- "Series C+": Series C, D, E, F and beyond (keywords: series c/d/e/f, C轮, D轮, E轮)
- "Late/PE": Growth, Pre-IPO, Buyout, LBO (keywords: growth, pre-ipo, buyout, lbo, 成长轮, 上市前, 收购)
- "Unknown": If round cannot be determined

AI APPLICATION DOMAIN CLASSIFICATION (for M&A):
IMPORTANT: Only classify deals involving AI companies or AI technology. Return null for industry if the deal is NOT AI-related.

- "AI Healthcare": Medical AI, biotech AI, drug discovery AI, clinical AI, diagnostics AI
  (keywords: medical AI, biotech AI, drug discovery, clinical AI, diagnostics, 医疗AI, 生物AI, AI制药)
- "AI Finance": FinTech AI, algorithmic trading, risk assessment AI, fraud detection AI
  (keywords: fintech AI, trading AI, risk AI, fraud detection, 金融AI, 交易AI, 风控AI)
- "AI Enterprise": Enterprise AI, SaaS AI, workflow automation, document AI, B2B AI
  (keywords: enterprise AI, saas AI, automation, document AI, 企业AI, 自动化)
- "AI Consumer": Consumer AI, recommendation systems, voice assistants, smart home AI
  (keywords: consumer AI, recommendation, voice assistant, smart home, 消费AI, 语音助手)
- "AI Infrastructure": GPU, cloud AI, ML platforms, data infrastructure, AI chips
  (keywords: gpu, cloud AI, ml platform, infrastructure, 算力, 云AI, 平台, AI芯片)
- "AI Robotics": Industrial robots, autonomous vehicles, drones, robotic manipulation
  (keywords: robot, autonomous, drone, manipulation, 机器人, 自动驾驶, 无人机)
- "AI Security": Cybersecurity AI, identity verification AI, threat detection AI
  (keywords: security AI, identity, threat, cyber, 安全AI, 身份验证)
- "AI Creative": Generative AI, content generation, design AI, music AI, video AI
  (keywords: generative AI, content, design AI, music AI, AIGC, 生成AI, 内容创作)
- "AI Education": EdTech AI, AI tutoring, learning platforms, assessment AI
  (keywords: edtech, tutoring, learning, assessment, 教育AI, 学习平台)
- "Other AI": AI-related but doesn't fit above categories
- null: NOT AI-related at all (e.g., traditional media, non-tech acquisitions)

Output ONLY valid JSON."""

        response = self._call_llm(prompt, temperature=0.3)
        fallback = {
            "primaryMarket": {"de": [], "en": []},
            "secondaryMarket": {"de": [], "en": []},
            "ma": {"de": [], "en": []},
        }
        result = parse_llm_json(response, fallback=fallback)
        if isinstance(result, dict):
            for key in ["primaryMarket", "secondaryMarket", "ma"]:
                section = result.get(key)
                if isinstance(section, dict):
                    section.setdefault("de", [])
                    section.setdefault("en", [])
                    arr = section.get("en")
                    if isinstance(arr, list) and len(arr) > count:
                        section["en"] = arr[:count]
        return result

    def process_ma_articles(self, articles: list[dict], count: int = 10) -> dict:
        """Process only M&A articles into the EN-native feed format."""
        if not articles:
            return {"ma": {"de": [], "en": []}}

        articles_text = "\n\n".join(
            f"Source: {a['source']}\nTitle: {a['title']}\nLink: {a['link']}\nSummary: {a['summary'][:500]}\nDate: {a['published']}"
            for a in articles  # Use all articles
        )

        prompt = f"""You are a financial news editor for DataCube AI, a daily AI briefing read by a
global audience of investors, founders, and technology professionals.
Your task: extract up to {count} notable M&A and investment deals from the articles below.

ARTICLES:
{articles_text}

Output a JSON object with EXACTLY this structure:
{{
  "ma": {{
    "en": [
      {{
        "id": 1,
        "acquirer": "Acquirer/Investor",
        "target": "Target",
        "dealValue": "$1.2B",
        "dealType": "Acquisition|Merger|Buyout|Investment|Stake|Partnership",
        "industry": "AI Infrastructure|AI Healthcare|AI Finance|AI Enterprise|AI Consumer|AI Robotics|AI Security|AI Creative|AI Education|Other AI|null",
        "content": "English summary (2-3 sentences, specific about terms and strategy)",
        "timestamp": "YYYY-MM-DD",
        "sourceUrl": "https://..."
      }}
    ]
  }}
}}

Rules:
- ONLY include AI-related M&A deals and investments (companies developing, using, or investing in AI technology)
- Skip deals that have no clear AI connection
- industry: MUST be one of the AI categories below (do NOT use null)
- Prioritize deals with clear financial terms or strategic AI importance
- Limit to at most {count} items per language

AI INDUSTRY TAXONOMY (required - skip deal if none apply):
- AI Infrastructure, AI Healthcare, AI Finance, AI Enterprise, AI Consumer, AI Robotics, AI Security, AI Creative, AI Education, Other AI

Output ONLY valid JSON."""

        response = self._call_llm(prompt, temperature=0.3)
        result = parse_llm_json(response, fallback={"ma": {"de": [], "en": []}})
        if isinstance(result, dict):
            ma = result.get("ma")
            if isinstance(ma, dict):
                ma.setdefault("de", [])
                ma.setdefault("en", [])
                arr = ma.get("en")
                if isinstance(arr, list) and len(arr) > count:
                    ma["en"] = arr[:count]
        return result

    def process_tips_articles(self, articles: list[dict], count: int = 15) -> dict:
        """Process tips articles into the EN-native feed format."""
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

        prompt = f"""Extract {count} practical AI tips from these articles for a global audience of
AI users (from beginners to power users). Output JSON only.

ARTICLES:
{articles_text}

Output format:
{{"en":[{{"id":1,"content":"English tip description","tip":"The tip, concrete and actionable","category":"Productivity","platform":"Reddit","sourceUrl":"url"}}]}}

Rules:
- {count} items in the en array
- category: Productivity, Prompt Tips, Creativity
- platform: Reddit, Blog, or X
- Keep tips short, specific, and actionable (name the tool and the exact technique)
- No special characters in strings

JSON:"""

        response = self._call_llm(prompt, temperature=0.2)
        result = parse_llm_json(response, fallback={"en": []})
        if isinstance(result, dict):
            result.setdefault("de", [])
            result.setdefault("en", [])

        # Add missing fields with defaults
        for i, tip in enumerate(result.get("en", [])):
            tip.setdefault("id", i + 1)
            tip.setdefault("difficulty", "Intermediate")
            tip.setdefault("timestamp", "2026-02-01")

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

        prompt = f"""Based on this period's AI news, generate EXACTLY 10 trending topics.

CONTENT:
{context}

Output JSON:
{{
  "trends": {{
    "en": [{{"category": "AI · Trending", "title": "Topic Name"}}]
  }}
}}

Categories: AI, Technology, Finance, Science, Startups
Topic titles: short, specific, entity-first (e.g. "GPT-5.6 price cuts", not "Big AI news").
Output ONLY valid JSON."""

        response = self._call_llm(prompt, temperature=0.5)
        result = parse_llm_json(response, fallback={"trends": {"de": [], "en": []}})
        if isinstance(result, dict) and isinstance(result.get("trends"), dict):
            result["trends"].setdefault("de", [])
            result["trends"].setdefault("en", [])
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
        """Team members are gone — the roster used to contain fictional people
        (an internal-tool artifact), which is an E-E-A-T liability on a public
        site. Kept as empty lists for response-shape compatibility until the
        table and model are fully removed."""
        return {"de": [], "en": []}
