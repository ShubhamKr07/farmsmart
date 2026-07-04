from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Env vars (Render): DATABASE_URL (same Neon connection string as
    api-server), GEMINI_API_KEY (embeddings), TAVILY_API_KEY (live search on
    cache miss — optional; unset until the user adds a Tavily key, in which
    case /recommend still works for cache hits and returns a clear "not
    configured" message instead of a live search on a miss), INTERNAL_API_KEY
    (shared secret validating requests came from api-server, not the public
    internet).
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    gemini_api_key: str
    tavily_api_key: str | None = None
    internal_api_key: str
    embedding_model: str = "gemini-embedding-001"
    embedding_dimensions: int = 1536


settings = Settings()  # type: ignore[call-arg]
