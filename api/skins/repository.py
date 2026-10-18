"""SQLite access for skin packs, ownership, and equip. No HTTP."""

from __future__ import annotations

import sqlite3
import uuid
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Iterator

from api.db import connect


@dataclass(frozen=True)
class SkinPackRecord:
    id: str
    code: str
    title: str
    description: str | None
    active: bool


@dataclass(frozen=True)
class EquipSlotRecord:
    user_id: str
    slot: str
    skin_pack_id: str
    code: str


def _pack_from_row(row: sqlite3.Row) -> SkinPackRecord:
    return SkinPackRecord(
        id=row["id"],
        code=row["code"],
        title=row["title"],
        description=row["description"],
        active=bool(row["active"]),
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


def packs_by_codes(
    conn: sqlite3.Connection,
    codes: tuple[str, ...] | list[str],
) -> list[SkinPackRecord]:
    if not codes:
        return []
    placeholders = ", ".join("?" for _ in codes)
    rows = conn.execute(
        f"""
        SELECT id, code, title, description, active
        FROM skin_packs
        WHERE code IN ({placeholders})
        """,
        tuple(codes),
    ).fetchall()
    return [_pack_from_row(row) for row in rows]


def list_active_packs() -> list[SkinPackRecord]:
    conn = connect()
    try:
        rows = conn.execute(
            """
            SELECT id, code, title, description, active
            FROM skin_packs
            WHERE active = 1
            ORDER BY code
            """
        ).fetchall()
        return [_pack_from_row(row) for row in rows]
    finally:
        conn.close()


def get_pack(conn: sqlite3.Connection, pack_id: str) -> SkinPackRecord | None:
    row = conn.execute(
        """
        SELECT id, code, title, description, active
        FROM skin_packs
        WHERE id = ?
        """,
        (pack_id,),
    ).fetchone()
    if row is None:
        return None
    return _pack_from_row(row)


def list_owned_packs(conn: sqlite3.Connection, user_id: str) -> list[SkinPackRecord]:
    rows = conn.execute(
        """
        SELECT sp.id, sp.code, sp.title, sp.description, sp.active
        FROM user_skin_packs usp
        JOIN skin_packs sp ON sp.id = usp.skin_pack_id
        WHERE usp.user_id = ?
        ORDER BY sp.code
        """,
        (user_id,),
    ).fetchall()
    return [_pack_from_row(row) for row in rows]


def user_owns_pack(conn: sqlite3.Connection, user_id: str, pack_id: str) -> bool:
    row = conn.execute(
        """
        SELECT 1
        FROM user_skin_packs
        WHERE user_id = ? AND skin_pack_id = ?
        """,
        (user_id, pack_id),
    ).fetchone()
    return row is not None


def grant_packs(
    conn: sqlite3.Connection,
    *,
    user_id: str,
    skin_pack_ids: list[str],
    acquired_at: str,
) -> None:
    conn.executemany(
        """
        INSERT OR IGNORE INTO user_skin_packs (user_id, skin_pack_id, acquired_at)
        VALUES (?, ?, ?)
        """,
        [(user_id, pack_id, acquired_at) for pack_id in skin_pack_ids],
    )


def list_equips(
    conn: sqlite3.Connection,
    user_id: str,
    game_slug: str,
) -> list[EquipSlotRecord]:
    rows = conn.execute(
        """
        SELECT ue.user_id, ue.slot, ue.skin_pack_id, sp.code
        FROM user_equip ue
        JOIN skin_packs sp ON sp.id = ue.skin_pack_id
        WHERE ue.user_id = ? AND ue.game_slug = ?
        """,
        (user_id, game_slug),
    ).fetchall()
    return [
        EquipSlotRecord(
            user_id=row["user_id"],
            slot=row["slot"],
            skin_pack_id=row["skin_pack_id"],
            code=row["code"],
        )
        for row in rows
    ]


def list_equips_for_users(
    conn: sqlite3.Connection,
    user_ids: list[str],
    game_slug: str,
) -> list[EquipSlotRecord]:
    if not user_ids:
        return []
    placeholders = ", ".join("?" for _ in user_ids)
    rows = conn.execute(
        f"""
        SELECT ue.user_id, ue.slot, ue.skin_pack_id, sp.code
        FROM user_equip ue
        JOIN skin_packs sp ON sp.id = ue.skin_pack_id
        WHERE ue.game_slug = ? AND ue.user_id IN ({placeholders})
        """,
        (game_slug, *user_ids),
    ).fetchall()
    return [
        EquipSlotRecord(
            user_id=row["user_id"],
            slot=row["slot"],
            skin_pack_id=row["skin_pack_id"],
            code=row["code"],
        )
        for row in rows
    ]


def upsert_equip(
    conn: sqlite3.Connection,
    *,
    user_id: str,
    game_slug: str,
    slot: str,
    skin_pack_id: str,
) -> None:
    conn.execute(
        """
        INSERT INTO user_equip (id, user_id, game_slug, slot, skin_pack_id)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id, game_slug, slot)
        DO UPDATE SET skin_pack_id = excluded.skin_pack_id
        """,
        (uuid.uuid4().hex, user_id, game_slug, slot, skin_pack_id),
    )
