"""Application configuration, read once from the environment.

Phase 1 foundation. Defaults are safe for local dev; anything security-sensitive
(SECRET_KEY, seed passwords) MUST be overridden for a real deployment.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    # App
    app_name: str = "MORPHEUS"
    environment: str = "development"  # development | test | production
    api_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:5174,http://127.0.0.1:5174"

    # Auth
    secret_key: str = "dev-insecure-secret-change-me"
    access_token_expire_minutes: int = 60 * 12
    jwt_algorithm: str = "HS256"
    # Dev convenience: any password logs in the seeded demo users. MUST be False in
    # production, where verify_password() is enforced (mission Phase 21).
    auth_dev_mode: bool = True

    # Database — default Postgres (docker-compose); local dev overrides with SQLite.
    database_url: str = "postgresql+psycopg2://morpheus:morpheus@localhost:5432/morpheus"

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

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def allowed_upload_type_list(self) -> list[str]:
        return [t.strip() for t in self.allowed_upload_types.split(",") if t.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
