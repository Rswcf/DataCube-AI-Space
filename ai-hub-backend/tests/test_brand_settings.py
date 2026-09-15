"""Brand identity settings: legacy defaults, overrides and derived values (spec AD1 and §6.2)."""

import pytest
from pydantic import ValidationError

from app.config import Settings

BRAND_ENV = (
    "BRAND_NAME", "BRAND_SHORT_NAME", "SITE_URL", "FOUNDER_NAME", "NEWSLETTER_FROM_NAME", "NEWSLETTER_FROM_EMAIL",
    "API_KEY_PREFIX", "RSS_USER_AGENT", "GITHUB_ISSUES_URL", "API_TITLE", "CORS_ORIGINS",
)


@pytest.fixture(autouse=True)
def no_brand_environment(monkeypatch):
    for name in BRAND_ENV:
        monkeypatch.delenv(name, raising=False)


def _settings(**overrides) -> Settings:
    return Settings(_env_file=None, **overrides)


def test_defaults_reproduce_the_current_identity():
    settings = _settings()
    assert settings.brand_name == "Data Cube AI"
    assert settings.brand_short_name == "Data Cube"
    assert settings.site_url == "https://www.datacubeai.space"
    assert settings.site_domain == "datacubeai.space"
    assert settings.founder_name == ""
    assert settings.newsletter_from_name == "Data Cube AI"
    assert settings.newsletter_from_email == "Data Cube AI <newsletter@datacubeai.space>"
    assert settings.api_key_prefix == "dcai_"
    assert settings.rss_user_agent == "Mozilla/5.0 (compatible; AI-Hub-Bot/1.0; +https://www.datacubeai.space)"
    assert settings.github_issues_url == "https://github.com/Rswcf/DataCube-AI-Space/issues"
    assert settings.api_title == "AI Hub API"
    assert settings.cors_origins == [
        "http://localhost:3000",
        "http://localhost:3002",
        "https://www.datacubeai.space",
        "https://ai-information-hub.vercel.app",
    ]


def test_values_derived_from_the_site_follow_a_new_site_and_sender_name():
    settings = _settings(site_url="https://www.acme.example/", newsletter_from_name="Acme News")
    assert settings.site_url == "https://www.acme.example"
    assert settings.site_domain == "acme.example"
    assert settings.newsletter_from_email == "Acme News <newsletter@acme.example>"
    assert settings.rss_user_agent == "Mozilla/5.0 (compatible; AI-Hub-Bot/1.0; +https://www.acme.example)"
    assert "https://www.acme.example" in settings.cors_origins


def test_explicit_environment_values_win_over_derived_defaults(monkeypatch):
    monkeypatch.setenv("SITE_URL", "https://www.acme.example")
    monkeypatch.setenv("NEWSLETTER_FROM_EMAIL", "Legacy <news@example.com>")
    monkeypatch.setenv("CORS_ORIGINS", '["https://only.example"]')
    settings = _settings()
    assert settings.site_url == "https://www.acme.example"
    assert settings.newsletter_from_email == "Legacy <news@example.com>"
    assert settings.cors_origins == ["https://only.example"]


def test_api_key_prefix_is_at_most_eight_characters():
    assert _settings(api_key_prefix="abcdefg_").api_key_prefix == "abcdefg_"
    with pytest.raises(ValidationError) as excinfo:
        _settings(api_key_prefix="toolong_x")
    assert [error["type"] for error in excinfo.value.errors()] == ["string_too_long"]


def test_api_title_comes_from_the_settings():
    from app.config import get_settings
    from app.main import app

    assert app.title == get_settings().api_title == "AI Hub API"
