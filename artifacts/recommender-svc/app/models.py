from pydantic import BaseModel


class RecommendRequest(BaseModel):
    clerk_user_id: str
    question: str


class Source(BaseModel):
    title: str | None = None
    url: str
    similarity: float


class RecommendResponse(BaseModel):
    answer: str
    sources: list[Source]
    cache_hit: bool
