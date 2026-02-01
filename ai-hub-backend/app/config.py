"""
Application configuration loaded from environment variables.
"""

import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "postgresql://localhost/ai_hub"

    # API Keys
    openrouter_api_key: str = ""
    youtube_api_key: str = ""

    # Admin
    admin_api_key: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "https://ai-hub.vercel.app"]

    # Collection settings
    hn_min_points: int = 100
    hn_days: int = 7
    hn_limit: int = 50
    youtube_max_results: int = 10
    tech_output_count: int = 20
    video_output_count: int = 5

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
