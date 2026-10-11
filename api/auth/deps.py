"""FastAPI dependencies for cookie-based auth sessions."""

from __future__ import annotations

from fastapi import HTTPException, Request

from api.auth.service import SESSION_COOKIE_NAME, UserRecord, user_for_session


def require_user(request: Request) -> UserRecord:
    """Resolve the current user from the session cookie, or 401."""
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = user_for_session(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def session_token_from_request(request: Request) -> str | None:
    return request.cookies.get(SESSION_COOKIE_NAME)
