"""Synthetic newsletter content for render tests. Public repository: no real data."""

from types import SimpleNamespace

LANGS = ["de", "en", "zh", "fr", "es", "pt", "ja", "ko"]


def _row(**fields) -> SimpleNamespace:
    fields.setdefault("translations", None)
    return SimpleNamespace(**fields)


def period_data(period_id: str = "2026-09-13") -> dict:
    """One period in the shape `_fetch_period_content` returns."""
    return {
        "period_id": period_id,
        "tech": [
            _row(
                content_en="OpenAI ships a new reasoning model for developers: it adds tool use and a lower price.",
                content_de="OpenAI stellt ein neues Reasoning-Modell vor: mit Tool-Nutzung und niedrigerem Preis.",
                category_en="LLM",
                category_de="LLM",
                impact="high",
                source="Example News",
                source_url="https://example.com/openai-model",
                translations={"zh": {"content": "OpenAI 发布新的推理模型：支持工具调用，价格更低。", "category": "大模型"}},
            ),
            _row(
                content_en="Chip startup expands inference capacity in Europe with a new data center.",
                content_de="Chip-Startup baut Inferenzkapazität in Europa mit einem neuen Rechenzentrum aus.",
                category_en="Infrastructure",
                category_de="Infrastruktur",
                impact="medium",
                source="Example Wire",
                source_url=None,
            ),
        ],
        "videos": [
            _row(
                content_en="How agents plan multi-step tasks, explained with three demos.",
                content_de="Wie Agenten mehrstufige Aufgaben planen, erklärt an drei Demos.",
                video_id="abc123XYZ00",
                source="Example Channel",
            ),
        ],
        "funding": [_row(company="Example AI", amount_en="$50M", amount_de="50 Mio. $", round="Series B")],
        "ma": [
            _row(
                acquirer="Big Cloud",
                target="Example Labs",
                deal_value_en="$1.2B",
                deal_value_de="1,2 Mrd. $",
                content_en="Big Cloud acquires Example Labs to add agent tooling.",
                content_de="Big Cloud übernimmt Example Labs, um Agenten-Werkzeuge zu ergänzen.",
            ),
        ],
        "tips": [
            _row(
                content_en="Use structured outputs to validate agent replies before acting on them.",
                content_de="Strukturierte Ausgaben helfen, Agenten-Antworten vor dem Handeln zu prüfen.",
                category_en="Prompting",
                category_de="Prompting",
            ),
        ],
    }
