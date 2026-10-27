"""Pinned task-specific models, price ceilings and an emergency legacy profile."""

DEEPSEEK = "deepseek/deepseek-v4.1-flash-1017"
QWEN = "qwen/qwen3.7-flash"
OLD_DEEPSEEK = "deepseek/deepseek-v4-flash-0731"
FREE_MODELS = ["nvidia/nemotron-3.5-super-vl:free", "google/gemma-4-31b-it:free"]


def model_chains(profile: str) -> dict[str, list[str]]:
    if profile not in {"balanced", "legacy"}:
        raise ValueError(f"Unknown LLM model profile: {profile}")
    # Legacy restores the previous working paid order, not the two dead free IDs.
    primary = OLD_DEEPSEEK if profile == "legacy" else DEEPSEEK
    generation = [primary, QWEN, *FREE_MODELS]
    cheap = [QWEN, primary, *FREE_MODELS]
    # Qwen misclassified IPO discussion holdouts; classification keeps DeepSeek.
    return {"processor": generation, "classifier": generation.copy(),
            "translator": generation.copy() if profile == "legacy" else cheap.copy(), "cheap": cheap.copy()}


def request_options(model: str) -> dict:
    options = {"reasoning": {"enabled": False}}
    if model == DEEPSEEK:
        options["provider"] = {
            "order": ["deepinfra/fp8"],
            "allow_fallbacks": True,
            # USD per million tokens. Avoid unbounded provider/peak premiums.
            "max_price": {"prompt": 0.15, "completion": 0.60},
        }
    elif model == QWEN:
        # Covers Alibaba's long-context tiers as well as the short-prompt tier.
        options["provider"] = {"allow_fallbacks": True, "max_price": {"prompt": 0.23, "completion": 0.92}}
    return options
