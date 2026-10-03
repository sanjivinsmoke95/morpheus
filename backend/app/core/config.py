"""Application configuration, read once from the environment.

Phase 1 foundation. Defaults are safe for local dev; anything security-sensitive
(SECRET_KEY, seed passwords) MUST be overridden for a real deployment.
"""

from __future__ import annotations

import os
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def is_serverless() -> bool:
    """True on Vercel (and when MORPHEUS_SERVERLESS=1 in tests)."""
    for key in ("VERCEL", "MORPHEUS_SERVERLESS"):
        if os.environ.get(key, "").lower() in {"1", "true", "yes"}:
            return True
    return False


def normalize_database_url(url: str) -> str:
    """Accept postgres:// / postgresql:// (Supabase) and pin the SQLAlchemy driver."""
    url = (url or "").strip()
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://") and "+" not in url.split("://", 1)[0]:
        url = "postgresql+psycopg2://" + url[len("postgresql://"):]
    host = url.split("@")[-1] if "@" in url else url
    if any(h in host for h in ("supabase.co", "supabase.com")) and "sslmode=" not in url:
        url += ("&" if "?" in url else "?") + "sslmode=require"
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    # App
    app_name: str = "MORPHEUS"
    environment: str = "development"  # development | test | production
    api_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:5174,http://127.0.0.1:5174"
    cors_origin_regex: str = r"https://.*\.vercel\.app"

    # Auth
    secret_key: str = "dev-insecure-secret-change-me"
    access_token_expire_minutes: int = 60 * 12
    jwt_algorithm: str = "HS256"
    # Dev convenience: any password logs in the seeded demo users. MUST be False in
    # production, where verify_password() is enforced (mission Phase 21).
    auth_dev_mode: bool = True

    # Database — default Postgres (docker-compose); local dev overrides with SQLite.
    # Supabase: paste the URI from Project Settings → Database (pooler recommended).
    database_url: str = "postgresql+psycopg2://morpheus:morpheus@localhost:5432/morpheus"
    auto_migrate: bool = False  # create tables + seed on boot (set true for first Vercel deploy)
    seed_demo_data: bool = True

    # Supabase Storage (used when both URL and service role key are set).
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "morpheus"

    # Neo4j (graph projection). Optional in Phase 1 — health reports its status.
    neo4j_uri: str = ""  # e.g. bolt://localhost:7687
    neo4j_user: str = "neo4j"
    neo4j_password: str = ""

    # AI + embedding providers (abstracted; stub fallback runs with no keys).
    llm_provider: str = "stub"        # stub | openai_compatible | gemini
    embedding_provider: str = "stub"  # stub | openai_compatible | gemini
    embedding_dim: int = 768
    llm_api_key: str = ""
    llm_base_url: str = ""             # OpenAI-compatible base, e.g. https://api.openai.com/v1
    llm_model: str = ""
    embedding_api_key: str = ""
    embedding_base_url: str = ""
    embedding_model: str = ""

    # Object storage (uploaded documents, reports).
    object_store_dir: str = "./storage"

    # Uploads
    max_upload_mb: int = 25
    allowed_upload_types: str = (
        "application/pdf,"
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document,"
        "text/plain"
    )

    # Demo/seed users (dev only — override in production).
    # NOTE: `.local`/`.test` TLDs are rejected by email-validator; use a real TLD.
    seed_admin_email: str = "admin@morpheus.example.com"
    seed_admin_password: str = "morpheus-admin"
    seed_officer_email: str = "officer@morpheus.example.com"
    seed_officer_password: str = "morpheus-officer"
    seed_reviewer_email: str = "reviewer@morpheus.example.com"
    seed_reviewer_password: str = "morpheus-reviewer"

    @field_validator("database_url")
    @classmethod
    def _normalize_db_url(cls, v: str) -> str:
        return normalize_database_url(v)

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def allowed_upload_type_list(self) -> list[str]:
        return [t.strip() for t in self.allowed_upload_types.split(",") if t.strip()]

    @property
    def defer_pipeline(self) -> bool:
        """Serverless hosts have no background workers — advance the pipeline on poll."""
        return is_serverless()

    @property
    def effective_max_upload_mb(self) -> int:
        # Vercel serverless request bodies are capped around 4.5 MB.
        if is_serverless():
            return min(self.max_upload_mb, 4)
        return self.max_upload_mb

    @property
    def uses_supabase_storage(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
