from fastapi import Header, HTTPException
from app.config import settings


async def require_internal_key(x_internal_key: str | None = Header(default=None)) -> None:
    """
    Validates the request came from api-server (which holds the shared
    secret), not the public internet. api-server itself validates the
    end-user's Clerk session before calling here — this service trusts
    api-server, it doesn't re-check Clerk.
    """
    if x_internal_key != settings.internal_api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")
