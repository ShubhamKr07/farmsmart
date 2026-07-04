from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI

from app.auth import require_internal_key
from app.cache_repo import search_cache
from app.db import close_pool, get_pool
from app.embeddings import embed
from app.models import RecommendRequest, RecommendResponse, Source


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await get_pool()  # warm the connection pool on startup
    yield
    await close_pool()


app = FastAPI(title="FarmSmart Recommender", lifespan=lifespan)


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.post("/recommend", response_model=RecommendResponse, dependencies=[Depends(require_internal_key)])
async def recommend(req: RecommendRequest) -> RecommendResponse:
    """
    Phase R1: cache-only. Embeds the question, vector-searches
    recommender_cache, and returns the closest matches as-is (no LLM
    synthesis yet — that's R3). If the cache has nothing relevant, says so
    plainly rather than fabricating an answer; live search-API fallback on a
    miss is R2.
    """
    question_embedding = await embed(req.question)
    hits = await search_cache(question_embedding, limit=5)

    if not hits:
        return RecommendResponse(
            answer="No cached knowledge matches this question yet. Live search + synthesis is coming in a later phase.",
            sources=[],
            cache_hit=False,
        )

    top = hits[0]
    answer = f"Closest cached match: {top['title'] or top['source_url']}\n\n{top['content'][:500]}"
    sources = [
        Source(title=h["title"], url=h["source_url"], similarity=round(h["similarity"], 3))
        for h in hits
    ]
    return RecommendResponse(answer=answer, sources=sources, cache_hit=True)
