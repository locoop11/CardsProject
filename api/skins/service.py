"""Skin ownership and Hitler/role equip rules. No SQL and no HTTP."""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass

from api.db import STARTER_SKIN_PACK_CODES
from api.session import store
from api.skins.repository import (
    EquipSlotRecord,
    SkinPackRecord,
    get_pack,
    grant_packs,
    list_active_packs,
    list_equips,
    list_equips_for_users,
    list_owned_packs,
    packs_by_codes,
    transaction,
    upsert_equip,
    user_owns_pack,
)

# Hitler and role equip apply to Secret Cards only. Laws stay on User.card_skin.
SECRET_CARDS_GAME_SLUG = "secret-cards"
SLOT_HITLER = "hitler"
SLOT_ROLE = "role"


class SkinInputError(Exception):
    """Invalid equip input (HTTP 400)."""


class SkinForbiddenError(Exception):
    """Caller may not equip this pack or read this game (HTTP 403)."""


class SkinNotFoundError(Exception):
    """Game id is unknown (HTTP 404)."""


class SkinUnavailableError(Exception):
    """Starter packs are missing from the database."""


@dataclass(frozen=True)
class EquipSummary:
    hitler_pack_id: str | None
    role_pack_id: str | None
    hitler_pack_code: str | None
    role_pack_code: str | None


@dataclass(frozen=True)
class SkinProfile:
    owned_packs: list[SkinPackRecord]
    equip: EquipSummary


@dataclass(frozen=True)
class SeatEquip:
    player_id: str
    hitler_pack_id: str | None
    hitler_pack_code: str | None
    role_pack_id: str | None
    role_pack_code: str | None


def _summary_from_slots(slots: list[EquipSlotRecord]) -> EquipSummary:
    hitler_pack_id = None
    hitler_pack_code = None
    role_pack_id = None
    role_pack_code = None
    for slot in slots:
        if slot.slot == SLOT_HITLER:
            hitler_pack_id = slot.skin_pack_id
            hitler_pack_code = slot.code
        elif slot.slot == SLOT_ROLE:
            role_pack_id = slot.skin_pack_id
            role_pack_code = slot.code
    return EquipSummary(
        hitler_pack_id=hitler_pack_id,
        role_pack_id=role_pack_id,
        hitler_pack_code=hitler_pack_code,
        role_pack_code=role_pack_code,
    )


def grant_starter_packs(
    conn: sqlite3.Connection,
    *,
    user_id: str,
    acquired_at: str,
) -> None:
    """Grant seeded packs on an existing transaction (register)."""
    packs = packs_by_codes(conn, STARTER_SKIN_PACK_CODES)
    found = {pack.code for pack in packs}
    missing = [code for code in STARTER_SKIN_PACK_CODES if code not in found]
    if missing:
        raise SkinUnavailableError(
            "Starter skin packs are not seeded: " + ", ".join(missing)
        )
    grant_packs(
        conn,
        user_id=user_id,
        skin_pack_ids=[pack.id for pack in packs],
        acquired_at=acquired_at,
    )


def profile_for_user(user_id: str) -> SkinProfile:
    with transaction() as conn:
        owned = list_owned_packs(conn, user_id)
        slots = list_equips(conn, user_id, SECRET_CARDS_GAME_SLUG)
    return SkinProfile(owned_packs=owned, equip=_summary_from_slots(slots))


def catalog_active_packs() -> list[SkinPackRecord]:
    return list_active_packs()


def _require_equipable(
    conn: sqlite3.Connection,
    user_id: str,
    pack_id: str,
) -> None:
    if not pack_id:
        raise SkinInputError("skin pack id cannot be empty")
    pack = get_pack(conn, pack_id)
    if pack is None or not pack.active:
        raise SkinInputError("Unknown skin pack")
    if not user_owns_pack(conn, user_id, pack_id):
        raise SkinForbiddenError("You do not own this skin pack")


def equip(
    user_id: str,
    *,
    hitler_pack_id: str | None = None,
    role_pack_id: str | None = None,
) -> EquipSummary:
    """Set Hitler and/or role pack. Omitted slots stay as they are."""
    updates: list[tuple[str, str]] = []
    if hitler_pack_id is not None:
        updates.append((SLOT_HITLER, hitler_pack_id.strip()))
    if role_pack_id is not None:
        updates.append((SLOT_ROLE, role_pack_id.strip()))
    if not updates:
        raise SkinInputError("Provide hitler_pack_id and/or role_pack_id")

    with transaction() as conn:
        for _slot, pack_id in updates:
            _require_equipable(conn, user_id, pack_id)
        for slot, pack_id in updates:
            upsert_equip(
                conn,
                user_id=user_id,
                game_slug=SECRET_CARDS_GAME_SLUG,
                slot=slot,
                skin_pack_id=pack_id,
            )
        slots = list_equips(conn, user_id, SECRET_CARDS_GAME_SLUG)
    return _summary_from_slots(slots)


def seat_equips_for_game(game_id: str, caller_user_id: str) -> list[SeatEquip]:
    """Pack ids equipped by each bound seat. Does not include roles or ownership."""
    session = store.get(game_id)
    if session is None:
        raise SkinNotFoundError("Game not found")
    if session.is_local():
        raise SkinInputError("Seat equips are only available for online games")
    bindings = session.user_id_by_player_id
    if bindings is None or caller_user_id not in bindings.values():
        raise SkinForbiddenError("Not bound to a seat in this game")

    user_ids = list(dict.fromkeys(bindings.values()))
    with transaction() as conn:
        slots = list_equips_for_users(conn, user_ids, SECRET_CARDS_GAME_SLUG)

    by_user: dict[str, EquipSummary] = {}
    grouped: dict[str, list[EquipSlotRecord]] = {}
    for slot in slots:
        grouped.setdefault(slot.user_id, []).append(slot)
    for user_id, user_slots in grouped.items():
        by_user[user_id] = _summary_from_slots(user_slots)

    seats: list[SeatEquip] = []
    for player in session.state.players:
        # id only — role stays on the engine and is not part of this payload.
        summary = by_user.get(bindings.get(player.id, ""))
        if summary is None:
            seats.append(
                SeatEquip(
                    player_id=player.id,
                    hitler_pack_id=None,
                    hitler_pack_code=None,
                    role_pack_id=None,
                    role_pack_code=None,
                )
            )
            continue
        seats.append(
            SeatEquip(
                player_id=player.id,
                hitler_pack_id=summary.hitler_pack_id,
                hitler_pack_code=summary.hitler_pack_code,
                role_pack_id=summary.role_pack_id,
                role_pack_code=summary.role_pack_code,
            )
        )
    return seats
