import json
from app.db import get_pool
from app.embeddings import embed

MAX_EMBED_CHARS = 8000  # cap content length passed to the embedding model


async def upsert_cache_docs(docs: list[dict]) -> int:
    """
    Embeds and upserts freshly-ingested search-API docs into
    recommender_cache, skipping any source_url already cached — avoids
    re-embedding (paid API call) the same page when it resurfaces for a
    different question. Returns the number of newly embedded docs.
    """
    if not docs:
        return 0

    pool = await get_pool()
    urls = [d["source_url"] for d in docs]
    existing = await pool.fetch(
        "SELECT source_url FROM recommender_cache WHERE source_url = ANY($1::text[])",
        urls,
    )
    existing_urls = {r["source_url"] for r in existing}
    new_docs = [d for d in docs if d["source_url"] not in existing_urls]

    inserted = 0
    for doc in new_docs:
        vector = await embed(doc["content"][:MAX_EMBED_CHARS])
        await pool.execute(
            """
            INSERT INTO recommender_cache
                (source_url, title, content, embedding, search_provider, query_text)
            VALUES ($1, $2, $3, $4::vector, $5, $6)
            """,
            doc["source_url"],
            doc.get("title"),
            doc["content"],
            json.dumps(vector),
            doc["search_provider"],
            doc["query_text"],
        )
        inserted += 1
    return inserted
