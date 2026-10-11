"""Account and session business logic. Persistence via repository only."""

from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone

from api.auth.passwords import MIN_PASSWORD_LENGTH, hash_password, verify_password
from api.auth.repository import (
    DuplicateKeyError,
    UserRecord,
    delete_session,
    get_session_user,
    get_user_auth_by_email,
    get_user_auth_by_username,
    insert_session,
    insert_user,
    transaction,
    update_user_profile,
)
from api.db import ALLOWED_CARD_SKINS, DEFAULT_CARD_SKIN

SESSION_COOKIE_NAME = "session_id"
SESSION_TTL = timedelta(days=30)

# Re-export for deps/routes that import UserRecord from service.
__all__ = [
    "SESSION_COOKIE_NAME",
    "SESSION_TTL",
    "AuthFailedError",
    "AuthInputError",
    "DuplicateUserError",
    "UserRecord",
    "login",
    "logout",
    "register",
    "update_profile",
    "user_for_session",
]


class AuthInputError(Exception):
    """Invalid registration / profile input (HTTP 400)."""


class DuplicateUserError(Exception):
    """Username or email already taken (HTTP 409)."""


class AuthFailedError(Exception):
    """Login failed or session missing (HTTP 401). Generic message only."""


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def _parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _normalize_username(username: str | None) -> str | None:
    """Strip and case-fold so Ada / ada collide on register and login."""
    if username is None:
        return None
    trimmed = username.strip().casefold()
    return trimmed or None


def _normalize_email(email: str | None) -> str | None:
    if email is None:
        return None
    trimmed = email.strip().lower()
    return trimmed or None


def _default_display_name(username: str | None, email: str | None) -> str:
    if username:
        return username
    if email:
        local = email.split("@", 1)[0]
        return local or "Player"
    return "Player"


def register(
    *,
    password: str,
    username: str | None = None,
    email: str | None = None,
    display_name: str | None = None,
) -> tuple[UserRecord, str]:
    """Create user + session. Returns (user, session_token)."""
    username_n = _normalize_username(username)
    email_n = _normalize_email(email)
    if username_n is None and email_n is None:
        raise AuthInputError("Provide username and/or email")
    if len(password) < MIN_PASSWORD_LENGTH:
        raise AuthInputError(
            f"Password must be at least {MIN_PASSWORD_LENGTH} characters"
        )

    name = (display_name or "").strip() or _default_display_name(
        username_n, email_n
    )
    user_id = uuid.uuid4().hex
    now = _utcnow()
    now_iso = _iso(now)
    password_hash = hash_password(password)
    token = secrets.token_urlsafe(32)

    try:
        with transaction() as conn:
            insert_user(
                conn,
                user_id=user_id,
                username=username_n,
                email=email_n,
                password_hash=password_hash,
                display_name=name,
                card_skin=DEFAULT_CARD_SKIN,
                created_at=now_iso,
            )
            insert_session(
                conn,
                session_id=token,
                user_id=user_id,
                expires_at=_iso(now + SESSION_TTL),
                created_at=now_iso,
            )
    except DuplicateKeyError as exc:
        raise DuplicateUserError(str(exc)) from exc

    user = UserRecord(
        id=user_id,
        username=username_n,
        email=email_n,
        display_name=name,
        card_skin=DEFAULT_CARD_SKIN,
    )
    return user, token


def login(
    *,
    password: str,
    username: str | None = None,
    email: str | None = None,
) -> tuple[UserRecord, str]:
    """Verify credentials and create a session. Generic failure on miss."""
    username_n = _normalize_username(username)
    email_n = _normalize_email(email)
    if username_n is None and email_n is None:
        raise AuthFailedError("Invalid credentials")
    if not password:
        raise AuthFailedError("Invalid credentials")

    auth_row = None
    if username_n is not None:
        auth_row = get_user_auth_by_username(username_n)
    if auth_row is None and email_n is not None:
        auth_row = get_user_auth_by_email(email_n)
    if auth_row is None or not verify_password(password, auth_row.password_hash):
        raise AuthFailedError("Invalid credentials")

    token = secrets.token_urlsafe(32)
    now = _utcnow()
    with transaction() as conn:
        insert_session(
            conn,
            session_id=token,
            user_id=auth_row.user.id,
            expires_at=_iso(now + SESSION_TTL),
            created_at=_iso(now),
        )
    return auth_row.user, token


def logout(session_token: str) -> None:
    """Delete the session if present. Idempotent success when already gone."""
    delete_session(session_token)


def user_for_session(session_token: str) -> UserRecord | None:
    """Return the user for a valid, non-expired session token."""
    if not session_token:
        return None
    row = get_session_user(session_token)
    if row is None:
        return None
    expires = _parse_iso(row.expires_at)
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires <= _utcnow():
        delete_session(session_token)
        return None
    return row.user


def update_profile(
    user_id: str,
    *,
    display_name: str | None = None,
    card_skin: str | None = None,
) -> UserRecord:
    """Update display_name and/or card_skin. At least one field required."""
    if display_name is None and card_skin is None:
        raise AuthInputError("Provide display_name and/or card_skin")

    name: str | None = None
    if display_name is not None:
        name = display_name.strip()
        if not name:
            raise AuthInputError("display_name cannot be empty")

    skin: str | None = None
    if card_skin is not None:
        if card_skin not in ALLOWED_CARD_SKINS:
            raise AuthInputError(
                f"card_skin must be one of: {', '.join(sorted(ALLOWED_CARD_SKINS))}"
            )
        skin = card_skin

    updated = update_user_profile(
        user_id,
        display_name=name,
        card_skin=skin,
    )
    if updated is None:
        raise AuthFailedError("Not authenticated")
    return updated
