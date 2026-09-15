"""Backend identity strings come from the brand settings (spec AD1 and §6.2)."""

import pytest

from app.config import Settings
from app.routers import deals, developer
from app.services import collector, rss_fetcher
from app.services.llm_processor import LLMProcessor

ACME = Settings(
    _env_file=None,
    brand_name="Acme News",
    site_url="https://www.acme.example",
    api_key_prefix="acme_",
    github_issues_url="https://github.com/acme/news/issues",
)

ARTICLE = {
    "source": "Example News",
    "title": "Startup reportedly in talks to raise $50M",
    "link": "https://example.com/story",
    "summary": "The startup is reportedly in talks to raise $50M, according to people familiar with the matter.",
    "published": "2026-09-12",
}
VIDEO = {
    "video_id": "abc123XYZ00",
    "original_title": "How agents plan",
    "channel_name": "Example Channel",
    "view_count_formatted": "1K",
    "duration_formatted": "10:00",
    "description": "A walkthrough.",
}


def test_disclosure_links_the_site_and_the_issue_tracker():
    text = deals._disclosure(ACME)
    assert "(https://www.acme.example/funding)" in text
    assert text.endswith("Report errors: https://github.com/acme/news/issues")


def test_export_filename_is_derived_from_the_brand_name():
    assert deals._export_filename(ACME) == "acme-news-deals.csv"
    assert deals._export_filename(Settings(_env_file=None)) == "data-cube-ai-deals.csv"


def test_new_api_keys_use_the_configured_prefix(monkeypatch):
    monkeypatch.setattr(developer, "get_settings", lambda: ACME)
    key = developer._generate_api_key()
    assert key.startswith("acme_")
    assert len(key) == len("acme_") + 32


def test_rss_requests_send_the_configured_user_agent(monkeypatch):
    seen = {}

    class FakeResponse:
        content = b"<rss></rss>"

        def raise_for_status(self):
            return None

    def fake_get(url, headers=None, timeout=None):
        seen["user_agent"] = headers["User-Agent"]
        return FakeResponse()

    monkeypatch.setattr(rss_fetcher, "get_settings", lambda: ACME)
    monkeypatch.setattr(rss_fetcher.requests, "get", fake_get)

    rss_fetcher.fetch_feed_with_timeout("https://example.com/feed.xml")

    assert seen["user_agent"] == "Mozilla/5.0 (compatible; AI-Hub-Bot/1.0; +https://www.acme.example)"


def test_source_author_falls_back_to_the_brand_name(monkeypatch):
    monkeypatch.setattr(collector, "get_settings", lambda: ACME)
    assert collector._source_author({})["name"] == "Acme News"


@pytest.mark.parametrize(
    "call, response",
    [
        (lambda p: p.classify_articles([dict(ARTICLE)]), "[]"),
        (lambda p: p.process_tech_articles([ARTICLE], count=5), '{"en": []}'),
        (lambda p: p.process_youtube_videos([VIDEO], count=1), '{"en": []}'),
        (lambda p: p.process_investment_articles([ARTICLE], count=5),
         '{"primaryMarket": {"en": []}, "secondaryMarket": {"en": []}, "ma": {"en": []}}'),
        (lambda p: p.process_ma_articles([ARTICLE], count=5), '{"ma": {"en": []}}'),
        (lambda p: p.generate_editorial({"en": [{"impact": "high", "content": ARTICLE["summary"]}]}, {}, {}), '{"bullets": []}'),
    ],
    ids=["classify", "tech", "videos", "investment", "ma", "editorial"],
)
def test_prompts_name_the_configured_brand(monkeypatch, call, response):
    monkeypatch.setattr("app.services.llm_processor.get_settings", lambda: ACME)
    processor = LLMProcessor.__new__(LLMProcessor)  # skip __init__: no API key, no client
    prompts = []
    monkeypatch.setattr(processor, "_call_llm", lambda prompt, temperature=0.3, **kwargs: prompts.append(prompt) or response)
    monkeypatch.setattr(
        processor, "_call_with_fallback", lambda prompt, temperature, timeout, **kwargs: prompts.append(prompt) or response
    )

    call(processor)

    assert prompts
    assert "Acme News" in prompts[0]
    assert "DataCube" not in prompts[0]
    assert "Data Cube" not in prompts[0]
