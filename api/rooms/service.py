"""Room lobby business rules. Persistence via in-memory store only."""

from __future__ import annotations

import random
import secrets
import string
import uuid

from api.auth.service import UserRecord
from api.rooms.store import Room, SeatClaim, store
from api.session import GameSession
from api.session import store as game_store
from secret_cards.engine.start import start_game
from secret_cards.model import Settings
from secret_cards.roles import SUPPORTED_PLAYER_COUNTS

# Temporary names so start_game seat shuffle keeps claim↔user identity.
_SEAT_PLACEHOLDER = "__seat_{index}__"

JOIN_CODE_LENGTH = 6
JOIN_CODE_ALPHABET = string.ascii_uppercase + string.digits
_MAX_CODE_ATTEMPTS = 32


class RoomInputError(Exception):
    """Invalid lobby input (HTTP 400)."""


class RoomNotFoundError(Exception):
    """Unknown room or join code (HTTP 404)."""


class RoomForbiddenError(Exception):
    """Caller is not a room member (HTTP 403)."""


class SeatTakenError(Exception):
    """Seat already claimed by another user (HTTP 409)."""


def _display_label(user: UserRecord) -> str:
    name = (user.display_name or "").strip()
    if name:
        return name
    if user.username:
        return user.username
    if user.email:
        return user.email
    return "Player"


def _new_join_code() -> str:
    for _ in range(_MAX_CODE_ATTEMPTS):
        code = "".join(
            secrets.choice(JOIN_CODE_ALPHABET) for _ in range(JOIN_CODE_LENGTH)
        )
        if not store.code_taken(code):
            return code
    raise RoomInputError("Could not allocate a unique join code")


def create_room(host: UserRecord, player_count: int) -> Room:
    if player_count not in SUPPORTED_PLAYER_COUNTS:
        raise RoomInputError(
            f"Unsupported player_count={player_count}; "
            f"supported={SUPPORTED_PLAYER_COUNTS}"
        )
    room = Room(
        room_id=uuid.uuid4().hex[:12],
        join_code=_new_join_code(),
        host_user_id=host.id,
        player_count=player_count,
    )
    return store.add(room)


def join_room(user: UserRecord, code: str) -> Room:
    normalized = (code or "").strip().upper()
    if not normalized:
        raise RoomInputError("Join code is required")
    room = store.get_by_code(normalized)
    if room is None:
        raise RoomNotFoundError("Room not found")
    if room.game_id is not None:
        raise RoomInputError("Game already started")
    room.member_user_ids.add(user.id)
    return room


def get_room(user: UserRecord, room_id: str) -> Room:
    room = store.get(room_id)
    if room is None:
        raise RoomNotFoundError("Room not found")
    if user.id not in room.member_user_ids:
        raise RoomForbiddenError("Not a member of this room")
    return room


def claim_seat(user: UserRecord, room_id: str, seat_index: int) -> Room:
    room = get_room(user, room_id)
    if room.game_id is not None:
        raise RoomInputError("Game already started")
    if seat_index < 0 or seat_index >= room.player_count:
        raise RoomInputError(
            f"seat_index must be between 0 and {room.player_count - 1}"
        )

    existing_index = next(
        (
            idx
            for idx, claim in room.seats.items()
            if claim is not None and claim.user_id == user.id
        ),
        None,
    )
    if existing_index is not None and existing_index != seat_index:
        raise RoomInputError("You already claimed a different seat")

    current = room.seats.get(seat_index)
    if current is not None and current.user_id != user.id:
        raise SeatTakenError("Seat already claimed")

    room.seats[seat_index] = SeatClaim(
        user_id=user.id,
        display_name=_display_label(user),
    )
    return room


def player_id_for_seat(seat_index: int) -> str:
    return f"p{seat_index}"


def start_room_game(
    host: UserRecord,
    room_id: str,
    *,
    seed: int | None = None,
) -> tuple[Room, GameSession]:
    """
    Host starts the game when every seat is claimed by a distinct user.

    Builds engine state, attaches player_id→user_id bindings on the game
    session, and sets room.game_id. Does not expose role_reveal (callers
    must use authorized role GET later).
    """
    room = get_room(host, room_id)
    if host.id != room.host_user_id:
        raise RoomForbiddenError("Only the host can start the game")
    if room.game_id is not None:
        raise RoomInputError("Game already started")

    claims: list[SeatClaim] = []
    for seat_index in range(room.player_count):
        claim = room.seats.get(seat_index)
        if claim is None:
            raise RoomInputError("All seats must be claimed before start")
        claims.append(claim)

    user_ids = [claim.user_id for claim in claims]
    if len(set(user_ids)) != room.player_count:
        raise RoomInputError("Each seat must be claimed by a distinct user")

    placeholders = [
        _SEAT_PLACEHOLDER.format(index=i) for i in range(room.player_count)
    ]
    rng = random.Random(seed) if seed is not None else random.Random()
    try:
        state = start_game(
            Settings(player_count=room.player_count),
            placeholders,
            rng=rng,
        )
    except ValueError as exc:
        raise RoomInputError(str(exc)) from exc

    bindings: dict[str, str] = {}
    for player in state.players:
        if not (
            player.name.startswith("__seat_") and player.name.endswith("__")
        ):
            raise RoomInputError("Internal seat mapping failed")
        seat_index = int(player.name.removeprefix("__seat_").removesuffix("__"))
        claim = claims[seat_index]
        player.name = claim.display_name
        bindings[player.id] = claim.user_id

    session = game_store.create(state, user_id_by_player_id=bindings)
    room.game_id = session.game_id
    return room, session
