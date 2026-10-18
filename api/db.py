"""SQLite persistence for accounts, sessions, and skin metadata (not game state)."""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

# Default under project data/; override with SECRET_CARDS_DB for tests / deploy.
_DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "secret_cards.db"

DEFAULT_CARD_SKIN = "default"
ALLOWED_CARD_SKINS = frozenset({"default", "party"})

# id, code, title, description. `code` maps to frontend/public/cards/<code>/.
# Bytes stay on disk — these rows are metadata only.
SEEDED_SKIN_PACKS: tuple[tuple[str, str, str, str], ...] = (
    (
        "spk_default",
        "default",
        "Classic poker",
        "Poker faces. Hitler is the ace of spades.",
    ),
    (
        "spk_party",
        "party",
        "Party",
        "Dedicated party art for Hitler and roles.",
    ),
)
STARTER_SKIN_PACK_CODES = tuple(pack[1] for pack in SEEDED_SKIN_PACKS)

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

CREATE TABLE IF NOT EXISTS skin_packs (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_skin_packs (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skin_pack_id TEXT NOT NULL REFERENCES skin_packs(id),
    acquired_at TEXT NOT NULL,
    PRIMARY KEY (user_id, skin_pack_id)
);

CREATE TABLE IF NOT EXISTS user_equip (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_slug TEXT NOT NULL,
    slot TEXT NOT NULL,
    skin_pack_id TEXT NOT NULL REFERENCES skin_packs(id),
    UNIQUE (user_id, game_slug, slot)
);

CREATE INDEX IF NOT EXISTS idx_user_equip_user_id ON user_equip(user_id);
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


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _seed_skin_packs(conn: sqlite3.Connection) -> None:
    """Insert starter packs once. Existing rows are left unchanged."""
    seeded_codes = {pack[1] for pack in SEEDED_SKIN_PACKS}
    if seeded_codes != ALLOWED_CARD_SKINS:
        raise RuntimeError("Seeded skin packs must match ALLOWED_CARD_SKINS")
    now = _utcnow_iso()
    for pack_id, code, title, description in SEEDED_SKIN_PACKS:
        conn.execute(
            """
            INSERT OR IGNORE INTO skin_packs (
                id, code, title, description, active, created_at
            ) VALUES (?, ?, ?, ?, 1, ?)
            """,
            (pack_id, code, title, description, now),
        )


def _backfill_starter_ownership(conn: sqlite3.Connection) -> None:
    """Grant starter packs to users who do not already own them.

    Idempotent: a pack the user already owns is skipped. This plan has no
    revoke path, so a missing starter row is always a grant, including for
    accounts created before these tables existed.
    """
    now = _utcnow_iso()
    placeholders = ", ".join("?" for _ in STARTER_SKIN_PACK_CODES)
    conn.execute(
        f"""
        INSERT OR IGNORE INTO user_skin_packs (user_id, skin_pack_id, acquired_at)
        SELECT u.id, p.id, ?
        FROM users u
        JOIN skin_packs p ON p.code IN ({placeholders})
        """,
        (now, *STARTER_SKIN_PACK_CODES),
    )


def init_db(path: Path | None = None) -> None:
    """Create account and skin tables if missing, then seed packs (additive)."""
    conn = connect(path)
    try:
        conn.executescript(SCHEMA_SQL)
        _seed_skin_packs(conn)
        _backfill_starter_ownership(conn)
        conn.commit()
    finally:
        conn.close()
