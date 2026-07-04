import logging
from anthropic import AsyncAnthropic
from app.config import settings

logger = logging.getLogger(__name__)

_client = AsyncAnthropic(api_key=settings.anthropic_api_key) if settings.anthropic_api_key else None


async def synthesize_answer(question: str, docs: list[dict], farm_context_text: str | None) -> str | None:
    """
    Grounds an answer in the cached/fetched external docs (cited by [n]) and
    the farm's own operational data, if any matched. Returns None if
    ANTHROPIC_API_KEY isn't configured, OR if the Claude call fails for any
    reason (billing, rate limit, transient outage) — caller falls back to
    the raw top-match answer (R2 behavior) rather than 500ing the whole
    request over a third-party API hiccup.
    """
    if _client is None:
        return None

    doc_block = "\n\n".join(
        f"[{i + 1}] {d['title'] or d['source_url']} ({d['source_url']})\n{d['content'][:1500]}"
        for i, d in enumerate(docs)
    )
    farm_block = f"\n\nFarm data:\n{farm_context_text}" if farm_context_text else ""

    try:
        resp = await _client.messages.create(
            model=settings.claude_model,
            max_tokens=600,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "You are a vertical-farming operations assistant. Answer the "
                        "grower's question using ONLY the external knowledge and farm "
                        "data below. Cite external sources by their [n] marker inline. "
                        "If the farm's own data conflicts with the general external "
                        "knowledge, prefer the farm's own data and say so explicitly.\n\n"
                        f"Question: {question}\n\n"
                        f"External knowledge:\n{doc_block}"
                        f"{farm_block}\n\n"
                        "Answer concisely, 3-6 sentences."
                    ),
                }
            ],
        )
    except Exception:
        logger.exception("Claude synthesis failed, falling back to raw top-match answer")
        return None

    block = resp.content[0]
    return block.text if hasattr(block, "text") else str(block)
