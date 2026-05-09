"""Centralized settings — loaded once at import time."""

from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _find_repo_env() -> list[Path]:
    """Walk up from this file to find the repo-root .env."""
    here = Path(__file__).resolve()
    candidates: list[Path] = []
    for parent in [here.parent, *here.parents]:
        candidates.append(parent / ".env")
        if (parent / "pnpm-workspace.yaml").exists():
            break
    return candidates


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=tuple(_find_repo_env()),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    supabase_url: str = Field(default="", alias="NEXT_PUBLIC_SUPABASE_URL")
    supabase_service_role_key: str = Field(default="", alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_db_url: str = Field(default="", alias="SUPABASE_DB_URL")
    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    scraper_user_agent: str = Field(
        default="ComputeTerminalBot/0.1 (+https://computeterminal.io)",
        alias="SCRAPER_USER_AGENT",
    )
    scraper_request_timeout_s: float = Field(default=20.0, alias="SCRAPER_REQUEST_TIMEOUT_S")


settings = Settings()
