"""
Application configuration loaded from environment variables.
"""

from functools import lru_cache
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

    # CORS
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3002",
        "https://www.datacubeai.space",
        "https://ai-information-hub.vercel.app",
    ]

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
    llm_max_workers: int = 4

    # HTTP timeouts (seconds)
    rss_request_timeout_seconds: int = 20
    hn_request_timeout_seconds: int = 30

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
