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
