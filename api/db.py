"""SQLite persistence for accounts and auth sessions (not game state)."""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path

# Default under project data/; override with SECRET_CARDS_DB for tests / deploy.
_DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "secret_cards.db"

DEFAULT_CARD_SKIN = "default"
ALLOWED_CARD_SKINS = frozenset({"default", "party"})

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    card_skin TEXT NOT NULL DEFAULT 'default',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
"""


def db_path() -> Path:
    override = os.environ.get("SECRET_CARDS_DB")
    if override:
        return Path(override)
    return _DEFAULT_DB_PATH


def connect(path: Path | None = None) -> sqlite3.Connection:
    """Open a connection with foreign keys enabled and row factory set."""
    resolved = path if path is not None else db_path()
    resolved.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(resolved, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(path: Path | None = None) -> None:
    """Create users/sessions tables if missing (additive, idempotent)."""
    conn = connect(path)
    try:
        conn.executescript(SCHEMA_SQL)
        conn.commit()
    finally:
        conn.close()
