"""
Application configuration loaded from environment variables.
"""

from email.utils import formataddr
from functools import lru_cache
from urllib.parse import urlsplit

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "postgresql://localhost/ai_hub"

    # API Keys
    openrouter_api_key: str = ""
    youtube_api_key: str = ""
    polygon_api_key: str = ""  # Polygon.io (Massive.com) API for stock data

    # Admin
    admin_api_key: str = ""
    app_timezone: str = "Europe/Berlin"

    # Brand identity (spec AD1). The defaults are the current brand; a rename changes these values or
    # their environment variables, never the code. Keep in step with ai-information-hub/lib/brand-defaults.json.
    brand_name: str = "Data Cube AI"
    brand_short_name: str = "Data Cube"
    site_url: str = "https://www.datacubeai.space"
    founder_name: str = ""  # "Made by <founder>" renders only when set
    newsletter_from_name: str = "Data Cube AI"
    api_key_prefix: str = Field(default="dcai_", max_length=8)  # new developer keys only; stored keys keep working
    rss_user_agent: str = ""  # empty: "Mozilla/5.0 (compatible; AI-Hub-Bot/1.0; +<site_url>)"
    github_issues_url: str = "https://github.com/Rswcf/DataCube-AI-Space/issues"
    api_title: str = "AI Hub API"

    # Newsletter
    resend_api_key: str = ""
    beehiiv_api_key: str = ""
    beehiiv_publication_id: str = ""
    newsletter_from_email: str = ""  # empty: "<newsletter_from_name> <newsletter@<site domain>>"

    # One-click unsubscribe tokens (HMAC-SHA256, at least 32 characters). Generate with:
    #   python -c "import secrets; print(secrets.token_urlsafe(48))"
    signing_secret: str = ""
    signing_secret_previous: str = ""  # verifies old links during a rotation, only alongside a usable signing_secret

    # Contact form destination (POST /api/contact)
    contact_inbox: str = ""

    # Stripe (unused since R1; membership / SP3a reuses these)
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_premium_price_id: str = ""  # Stripe Price ID for premium subscription
    stripe_api_developer_price_id: str = ""
    stripe_api_business_price_id: str = ""

    # CORS (empty: local dev servers, site_url and the Vercel production alias)
    cors_origins: list[str] = []

    # Collection settings
    hn_min_points: int = 100
    hn_days: int = 1
    hn_limit: int = 50
    youtube_max_results: int = 10

    # Output counts
    tech_output_count: int = 10
    tips_output_count: int = 5
    investment_output_count: int = 5
    video_output_count: int = 2

    # Thread pool and timeout settings
    rss_max_workers: int = 8
    hn_max_workers: int = 8
    hn_enhance_max_workers: int = 6
    llm_max_workers: int = 2

    # HTTP timeouts (seconds)
    rss_request_timeout_seconds: int = 20
    hn_request_timeout_seconds: int = 30

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def site_domain(self) -> str:
        """The site host without a leading "www.", e.g. for sender addresses and link text."""
        host = urlsplit(self.site_url).hostname or ""
        return host.removeprefix("www.")

    @model_validator(mode="after")
    def _derive_brand_defaults(self) -> "Settings":
        self.site_url = self.site_url.rstrip("/")
        # Test membership in model_fields_set, not truthiness: an explicitly supplied empty
        # value (e.g. CORS_ORIGINS=[]) must win over the derived default, same as any other
        # explicit value. Truthiness would treat "explicitly empty" the same as "unset".
        if "newsletter_from_email" not in self.model_fields_set:
            self.newsletter_from_email = formataddr((self.newsletter_from_name, f"newsletter@{self.site_domain}"))
        if "rss_user_agent" not in self.model_fields_set:
            self.rss_user_agent = f"Mozilla/5.0 (compatible; AI-Hub-Bot/1.0; +{self.site_url})"
        if "cors_origins" not in self.model_fields_set:
            self.cors_origins = [
                "http://localhost:3000",
                "http://localhost:3002",
                self.site_url,
                "https://ai-information-hub.vercel.app",
            ]
        return self


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
