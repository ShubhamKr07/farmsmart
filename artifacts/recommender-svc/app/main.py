import asyncio
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI

from app.auth import require_internal_key
from app.cache_repo import search_cache
from app.config import settings
from app.db import close_pool, get_pool
from app.embed_upsert import upsert_cache_docs
from app.embeddings import embed
from app.ingest import run_tavily_ingest
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
    Embeds the question, vector-searches recommender_cache. On a miss, runs
    a live Tavily search (via dlt), embeds + upserts the new docs into
    recommender_cache, and re-searches. Returns the closest matches as-is —
    no LLM synthesis yet (R3); this just surfaces raw cached/fetched docs
    with citations.
    """
    question_embedding = await embed(req.question)
    hits = await search_cache(question_embedding, limit=5)
    used_live_search = False

    if not hits and settings.tavily_api_key:
        docs = await asyncio.to_thread(run_tavily_ingest, req.question)
        await upsert_cache_docs(docs)
        hits = await search_cache(question_embedding, limit=5)
        used_live_search = True

    if not hits:
        message = (
            "No relevant results found, even after a live search."
            if used_live_search
            else "No cached knowledge matches this question yet, and live search isn't configured."
        )
        return RecommendResponse(answer=message, sources=[], cache_hit=False)

    top = hits[0]
    prefix = "Found via live search: " if used_live_search else "Closest cached match: "
    answer = f"{prefix}{top['title'] or top['source_url']}\n\n{top['content'][:500]}"
    sources = [
        Source(title=h["title"], url=h["source_url"], similarity=round(h["similarity"], 3))
        for h in hits
    ]
    return RecommendResponse(answer=answer, sources=sources, cache_hit=not used_live_search)
