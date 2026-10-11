"""SQLite data access for users and auth sessions. No HTTP / password policy."""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Iterator

from api.db import connect


class DuplicateKeyError(Exception):
    """Unique constraint violation on username or email."""


@dataclass(frozen=True)
class UserRecord:
    id: str
    username: str | None
    email: str | None
    display_name: str
    card_skin: str


@dataclass(frozen=True)
class UserAuthRow:
    """User row including password_hash for credential checks."""

    user: UserRecord
    password_hash: str


@dataclass(frozen=True)
class SessionUserRow:
    user: UserRecord
    expires_at: str


def _row_to_user(row: sqlite3.Row) -> UserRecord:
    return UserRecord(
        id=row["id"],
        username=row["username"],
        email=row["email"],
        display_name=row["display_name"],
        card_skin=row["card_skin"],
    )


@contextmanager
def transaction() -> Iterator[sqlite3.Connection]:
    """Open a connection, commit on success, rollback on error."""
    conn = connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def insert_user(
    conn: sqlite3.Connection,
    *,
    user_id: str,
    username: str | None,
    email: str | None,
    password_hash: str,
    display_name: str,
    card_skin: str,
    created_at: str,
) -> None:
    try:
        conn.execute(
            """
            INSERT INTO users (
                id, username, email, password_hash,
                display_name, card_skin, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                username,
                email,
                password_hash,
                display_name,
                card_skin,
                created_at,
            ),
        )
    except sqlite3.IntegrityError as exc:
        raise DuplicateKeyError("Username or email already registered") from exc


def insert_session(
    conn: sqlite3.Connection,
    *,
    session_id: str,
    user_id: str,
    expires_at: str,
    created_at: str,
) -> None:
    conn.execute(
        """
        INSERT INTO sessions (id, user_id, expires_at, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (session_id, user_id, expires_at, created_at),
    )


def get_user_auth_by_username(username: str) -> UserAuthRow | None:
    conn = connect()
    try:
        row = conn.execute(
            "SELECT * FROM users WHERE username = ?",
            (username,),
        ).fetchone()
        if row is None:
            return None
        return UserAuthRow(user=_row_to_user(row), password_hash=row["password_hash"])
    finally:
        conn.close()


def get_user_auth_by_email(email: str) -> UserAuthRow | None:
    conn = connect()
    try:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ?",
            (email,),
        ).fetchone()
        if row is None:
            return None
        return UserAuthRow(user=_row_to_user(row), password_hash=row["password_hash"])
    finally:
        conn.close()


def delete_session(session_id: str) -> None:
    conn = connect()
    try:
        conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        conn.commit()
    finally:
        conn.close()


def get_session_user(session_id: str) -> SessionUserRow | None:
    conn = connect()
    try:
        row = conn.execute(
            """
            SELECT
                u.id, u.username, u.email, u.display_name, u.card_skin,
                s.expires_at AS session_expires_at
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.id = ?
            """,
            (session_id,),
        ).fetchone()
        if row is None:
            return None
        return SessionUserRow(
            user=_row_to_user(row),
            expires_at=row["session_expires_at"],
        )
    finally:
        conn.close()


def update_user_profile(
    user_id: str,
    *,
    display_name: str | None = None,
    card_skin: str | None = None,
) -> UserRecord | None:
    """Update provided fields. Returns updated user, or None if missing."""
    updates: list[str] = []
    values: list[str] = []
    if display_name is not None:
        updates.append("display_name = ?")
        values.append(display_name)
    if card_skin is not None:
        updates.append("card_skin = ?")
        values.append(card_skin)
    if not updates:
        return get_user_by_id(user_id)

    values.append(user_id)
    conn = connect()
    try:
        conn.execute(
            f"UPDATE users SET {', '.join(updates)} WHERE id = ?",
            values,
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if row is None:
            return None
        return _row_to_user(row)
    finally:
        conn.close()


def get_user_by_id(user_id: str) -> UserRecord | None:
    conn = connect()
    try:
        row = conn.execute(
            "SELECT * FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if row is None:
            return None
        return _row_to_user(row)
    finally:
        conn.close()
