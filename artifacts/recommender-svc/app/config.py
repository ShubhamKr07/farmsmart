from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Env vars (Render): DATABASE_URL (same Neon connection string as
    api-server), GEMINI_API_KEY (embeddings + synthesis — one provider, one
    key), TAVILY_API_KEY (live search on cache miss — optional),
    INTERNAL_API_KEY (shared secret validating requests came from
    api-server, not the public internet).
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    gemini_api_key: str
    tavily_api_key: str | None = None
    internal_api_key: str
    embedding_model: str = "gemini-embedding-001"
    embedding_dimensions: int = 1536
    gemini_chat_model: str = "gemini-2.5-flash"


settings = Settings()  # type: ignore[call-arg]
