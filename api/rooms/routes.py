"""HTTP routes for multi-device lobby rooms. Session required."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from api.auth.deps import require_user
from api.auth.service import UserRecord
from api.rooms import service as rooms_service
from api.rooms.store import Room
from api.schemas import (
    ClaimSeatRequest,
    CreateRoomRequest,
    JoinRoomRequest,
    JoinTableRequest,
    PublicViewOut,
    RoomOut,
    RoomSeatOut,
    StartRoomRequest,
    StartRoomResponse,
)
from secret_cards.views import public_view

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


def _room_out(room: Room) -> RoomOut:
    seats: list[RoomSeatOut] = []
    for seat_index in range(room.player_count):
        claim = room.seats.get(seat_index)
        seats.append(
            RoomSeatOut(
                seat_index=seat_index,
                player_id=rooms_service.player_id_for_seat(seat_index),
                user_id=claim.user_id if claim else None,
                display_name=claim.display_name if claim else None,
            )
        )
    table_count = len(room.table_display_user_ids)
    return RoomOut(
        room_id=room.room_id,
        join_code=room.join_code,
        host_user_id=room.host_user_id,
        player_count=room.player_count,
        game_id=room.game_id,
        seats=seats,
        table_attached=table_count > 0,
        table_display_count=table_count,
    )


def _map_room_error(exc: Exception) -> HTTPException:
    if isinstance(exc, rooms_service.RoomInputError):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, rooms_service.RoomNotFoundError):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, rooms_service.RoomForbiddenError):
        return HTTPException(status_code=403, detail=str(exc))
    if isinstance(exc, rooms_service.SeatTakenError):
        return HTTPException(status_code=409, detail=str(exc))
    raise exc


@router.post("", response_model=RoomOut, status_code=201)
def create_room_route(
    body: CreateRoomRequest,
    user: UserRecord = Depends(require_user),
) -> RoomOut:
    try:
        room = rooms_service.create_room(user, body.player_count)
    except rooms_service.RoomInputError as exc:
        raise _map_room_error(exc) from exc
    return _room_out(room)


@router.post("/join", response_model=RoomOut)
def join_room_route(
    body: JoinRoomRequest,
    user: UserRecord = Depends(require_user),
) -> RoomOut:
    try:
        room = rooms_service.join_room(user, body.code)
    except (
        rooms_service.RoomInputError,
        rooms_service.RoomNotFoundError,
    ) as exc:
        raise _map_room_error(exc) from exc
    return _room_out(room)


@router.post("/join-table", response_model=RoomOut)
def join_table_route(
    body: JoinTableRequest,
    user: UserRecord = Depends(require_user),
) -> RoomOut:
    """Attach as table display by code — no seat; allowed after start."""
    try:
        room = rooms_service.attach_table_display_by_code(user, body.code)
    except (
        rooms_service.RoomInputError,
        rooms_service.RoomNotFoundError,
    ) as exc:
        raise _map_room_error(exc) from exc
    return _room_out(room)


@router.post("/{room_id}/table", response_model=RoomOut)
def attach_table_route(
    room_id: str,
    user: UserRecord = Depends(require_user),
) -> RoomOut:
    try:
        room = rooms_service.attach_table_display(user, room_id)
    except rooms_service.RoomNotFoundError as exc:
        raise _map_room_error(exc) from exc
    return _room_out(room)


@router.delete("/{room_id}/table", response_model=RoomOut)
def detach_table_route(
    room_id: str,
    user: UserRecord = Depends(require_user),
) -> RoomOut:
    try:
        room = rooms_service.detach_table_display(user, room_id)
    except (
        rooms_service.RoomNotFoundError,
        rooms_service.RoomForbiddenError,
    ) as exc:
        raise _map_room_error(exc) from exc
    return _room_out(room)


@router.get("/{room_id}", response_model=RoomOut)
def get_room_route(
    room_id: str,
    user: UserRecord = Depends(require_user),
) -> RoomOut:
    try:
        room = rooms_service.get_room(user, room_id)
    except (
        rooms_service.RoomNotFoundError,
        rooms_service.RoomForbiddenError,
    ) as exc:
        raise _map_room_error(exc) from exc
    return _room_out(room)


@router.post("/{room_id}/claim", response_model=RoomOut)
def claim_seat_route(
    room_id: str,
    body: ClaimSeatRequest,
    user: UserRecord = Depends(require_user),
) -> RoomOut:
    try:
        room = rooms_service.claim_seat(user, room_id, body.seat_index)
    except (
        rooms_service.RoomInputError,
        rooms_service.RoomNotFoundError,
        rooms_service.RoomForbiddenError,
        rooms_service.SeatTakenError,
    ) as exc:
        raise _map_room_error(exc) from exc
    return _room_out(room)


@router.post("/{room_id}/start", response_model=StartRoomResponse)
def start_room_route(
    room_id: str,
    user: UserRecord = Depends(require_user),
    body: StartRoomRequest = StartRoomRequest(),
) -> StartRoomResponse:
    try:
        _room, session = rooms_service.start_room_game(
            user, room_id, seed=body.seed
        )
    except (
        rooms_service.RoomInputError,
        rooms_service.RoomNotFoundError,
        rooms_service.RoomForbiddenError,
    ) as exc:
        raise _map_room_error(exc) from exc
    view = PublicViewOut.model_validate(
        public_view(session.state, game_id=session.game_id)
    )
    return StartRoomResponse(game_id=session.game_id, view=view)
