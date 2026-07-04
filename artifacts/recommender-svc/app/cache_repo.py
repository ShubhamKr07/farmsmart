import json
from app.db import get_pool


async def search_cache(embedding: list[float], limit: int = 5, min_similarity: float = 0.75) -> list[dict]:
    """
    Vector-similarity search over recommender_cache using pgvector's cosine
    distance operator (<=>). Returns the closest `limit` docs whose cosine
    similarity (1 - distance) is at least `min_similarity` — below that, the
    cached corpus doesn't have anything relevant and R2's live-search
    fallback should kick in instead.
    """
    pool = await get_pool()
    vector_literal = json.dumps(embedding)
    rows = await pool.fetch(
        """
        SELECT id, source_url, title, content, search_provider, query_text,
               1 - (embedding <=> $1::vector) AS similarity
        FROM recommender_cache
        ORDER BY embedding <=> $1::vector
        LIMIT $2
        """,
        vector_literal,
        limit,
    )
    return [dict(r) for r in rows if r["similarity"] >= min_similarity]
