"""Pydantic request/response models for the local Secret Cards API."""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


class CreateGameRequest(BaseModel):
    player_count: int = Field(..., ge=5, le=10)
    player_names: list[str]
    seed: Optional[int] = None


class NominateRequest(BaseModel):
    nominee_id: str


class VoteRequest(BaseModel):
    player_id: str
    vote: bool  # True = Ja, False = Nein


class DiscardRequest(BaseModel):
    card_id: int


class EnactRequest(BaseModel):
    """Card id to enact (the LawCard that stays on the table)."""

    card_id: int


class CardOut(BaseModel):
    id: int
    type: str
    number: int
    color: str


class PlayerPublicOut(BaseModel):
    id: str
    name: str


class RoleRevealOut(BaseModel):
    id: str
    name: str
    role: str
    team: str


class PublicViewOut(BaseModel):
    game_id: str
    phase: str
    round_number: int
    president_id: str
    president_name: str
    president_index: int
    nominated_chancellor_id: Optional[str]
    chancellor_id: Optional[str]
    previous_chancellor_id: Optional[str]
    rejected_nominee_ids: list[str]
    rejected_names: list[str]
    eligible_chancellor_ids: list[str]
    players: list[PlayerPublicOut]
    reds_on_table: int
    blacks_on_table: int
    laws_on_table: list[CardOut] = Field(default_factory=list)
    votes_cast: list[str]
    winner: Optional[str] = None
    win_reason: Optional[str] = None
    result: Optional[dict[str, Any]] = None


class CreateGameResponse(BaseModel):
    game_id: str
    view: PublicViewOut
    role_reveal: list[RoleRevealOut]


class ActionResponse(BaseModel):
    """Standard envelope after a mutating engine call."""

    view: PublicViewOut
    votes: Optional[dict[str, bool]] = None
    enacted: Optional[CardOut] = None
    hand: Optional[list[CardOut]] = None


class HandResponse(BaseModel):
    viewer_id: str
    cards: list[CardOut]


# --- Auth (accounts) ---


class RegisterRequest(BaseModel):
    password: str
    username: Optional[str] = None
    email: Optional[str] = None
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    password: str
    username: Optional[str] = None
    email: Optional[str] = None


class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = None
    card_skin: Optional[str] = None


class UserOut(BaseModel):
    id: str
    username: Optional[str] = None
    email: Optional[str] = None
    display_name: str
    card_skin: str


# --- Rooms (multi-device lobby, ephemeral) ---


class CreateRoomRequest(BaseModel):
    player_count: int = Field(..., ge=5, le=10)


class JoinRoomRequest(BaseModel):
    code: str


class JoinTableRequest(BaseModel):
    """Attach as public table display by join code (no seat)."""

    code: str


class ClaimSeatRequest(BaseModel):
    seat_index: int = Field(..., ge=0, le=9)


class RoomSeatOut(BaseModel):
    seat_index: int
    player_id: str
    user_id: Optional[str] = None
    display_name: Optional[str] = None


class RoomOut(BaseModel):
    room_id: str
    join_code: str
    host_user_id: str
    player_count: int
    game_id: Optional[str] = None
    seats: list[RoomSeatOut]
    table_attached: bool = False
    table_display_count: int = 0


class StartRoomRequest(BaseModel):
    """Optional seed for deterministic tests; omitted in normal play."""

    seed: Optional[int] = None


class StartRoomResponse(BaseModel):
    """Multi-device start: public view only — no role_reveal."""

    game_id: str
    view: PublicViewOut


# --- Skins (ownership and equip; image bytes stay on disk) ---


class SkinPackOut(BaseModel):
    id: str
    code: str
    title: str
    description: Optional[str] = None


class EquipOut(BaseModel):
    hitler_pack_id: Optional[str] = None
    role_pack_id: Optional[str] = None
    hitler_pack_code: Optional[str] = None
    role_pack_code: Optional[str] = None


class SkinMeOut(BaseModel):
    owned_packs: list[SkinPackOut]
    equip: EquipOut


class EquipRequest(BaseModel):
    hitler_pack_id: Optional[str] = None
    role_pack_id: Optional[str] = None


class SeatEquipOut(BaseModel):
    """Equipped pack ids for one seat. No role, team, or ownership list."""

    player_id: str
    hitler_pack_id: Optional[str] = None
    hitler_pack_code: Optional[str] = None
    role_pack_id: Optional[str] = None
    role_pack_code: Optional[str] = None


class SeatEquipsOut(BaseModel):
    seats: list[SeatEquipOut]
