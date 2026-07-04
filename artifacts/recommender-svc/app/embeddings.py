from google import genai
from google.genai import types
from app.config import settings

_client = genai.Client(api_key=settings.gemini_api_key)


async def embed(text: str) -> list[float]:
    """
    Embed a single string via Gemini (gemini-embedding-001), requesting
    output_dimensionality=1536 to match the recommender_cache.embedding
    column (vector(1536)) — the model defaults to 3072 dims otherwise.
    """
    resp = await _client.aio.models.embed_content(
        model=settings.embedding_model,
        contents=[text],
        config=types.EmbedContentConfig(output_dimensionality=settings.embedding_dimensions),
    )
    values = resp.embeddings[0].values
    assert values is not None
    return values
