"""HTTP routes wrapping the Secret Cards engine."""

from __future__ import annotations

import random

from fastapi import APIRouter, HTTPException, Request

from api.authz import (
    require_bound_chancellor,
    require_bound_president,
    require_bound_seat,
    require_user_if_bound,
)
from api.schemas import (
    ActionResponse,
    CardOut,
    CreateGameRequest,
    CreateGameResponse,
    DiscardRequest,
    EnactRequest,
    HandResponse,
    NominateRequest,
    PublicViewOut,
    RoleRevealOut,
    VoteRequest,
)
from api.session import GameSession, store
from secret_cards.engine.legislative import chancellor_enact, president_discard
from secret_cards.engine.nominate import nominate_chancellor
from secret_cards.engine.start import start_game
from secret_cards.engine.vote import cast_vote, resolve_votes
from secret_cards.errors import EngineError
from secret_cards.model import Phase, Settings
from secret_cards.views import (
    card_to_dict,
    legislative_hand,
    public_view,
    role_for_player,
    role_reveal_in_entry_order,
)

router = APIRouter(prefix="/api")


def _view(game_id: str, state) -> PublicViewOut:
    return PublicViewOut.model_validate(public_view(state, game_id=game_id))


def _get_session(game_id: str) -> GameSession:
    session = store.get(game_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Game not found")
    return session


def _engine_error(exc: EngineError) -> HTTPException:
    return HTTPException(status_code=400, detail=str(exc))


def _hand_if_legislative_local(state) -> list[CardOut] | None:
    """Pass-and-play: shared device may see the current legislative hand."""
    if state.phase not in (
        Phase.LEGISLATIVE_PRESIDENT,
        Phase.LEGISLATIVE_CHANCELLOR,
    ):
        return None
    return [CardOut.model_validate(card_to_dict(c)) for c in state.drawn_law_cards]


def _hand_for_action_response(
    session: GameSession,
    bound_player_id: str | None,
) -> list[CardOut] | None:
    """
    Include hand on ActionResponse only when allowed.

    Local: same as before (office-phase hand on shared device).
    Bound: only if the authenticated caller's seat is the office holder.
    """
    if session.is_local():
        return _hand_if_legislative_local(session.state)
    if bound_player_id is None:
        return None
    cards = legislative_hand(session.state, bound_player_id)
    if cards is None:
        return None
    return [CardOut.model_validate(c) for c in cards]


def _last_enacted_if_grew(state, before_count: int) -> CardOut | None:
    if len(state.law_table.cards) <= before_count:
        return None
    return CardOut.model_validate(card_to_dict(state.law_table.cards[-1]))


@router.post("/games", response_model=CreateGameResponse)
def create_game(body: CreateGameRequest) -> CreateGameResponse:
    if len(body.player_names) != body.player_count:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Expected {body.player_count} names, "
                f"got {len(body.player_names)}"
            ),
        )
    rng = random.Random(body.seed) if body.seed is not None else random.Random()
    try:
        state = start_game(
            Settings(player_count=body.player_count),
            body.player_names,
            rng=rng,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    session = store.create(state)
    return CreateGameResponse(
        game_id=session.game_id,
        view=_view(session.game_id, state),
        # Reveal in typed name order; seats stay shuffled for the game.
        role_reveal=[
            RoleRevealOut.model_validate(p)
            for p in role_reveal_in_entry_order(state, body.player_names)
        ],
    )


@router.get("/games/{game_id}", response_model=PublicViewOut)
def get_game(game_id: str) -> PublicViewOut:
    session = _get_session(game_id)
    return _view(session.game_id, session.state)


@router.get("/games/{game_id}/role/{player_id}", response_model=RoleRevealOut)
def get_player_role(
    game_id: str,
    player_id: str,
    request: Request,
) -> RoleRevealOut:
    """Player-scoped role. Bound games: only the seat's authenticated user."""
    session = _get_session(game_id)
    user = require_user_if_bound(request, session)
    if user is not None:
        require_bound_seat(session, user, player_id)
    payload = role_for_player(session.state, player_id)
    if payload is None:
        raise HTTPException(status_code=404, detail="Player not found")
    return RoleRevealOut.model_validate(payload)


@router.get("/games/{game_id}/hand", response_model=HandResponse)
def get_hand(game_id: str, viewer_id: str, request: Request) -> HandResponse:
    session = _get_session(game_id)
    user = require_user_if_bound(request, session)
    if user is not None:
        require_bound_seat(session, user, viewer_id)
    cards = legislative_hand(session.state, viewer_id)
    if cards is None:
        raise HTTPException(
            status_code=403,
            detail="Viewer is not allowed to see the legislative hand",
        )
    return HandResponse(
        viewer_id=viewer_id,
        cards=[CardOut.model_validate(c) for c in cards],
    )


@router.post("/games/{game_id}/nominate", response_model=ActionResponse)
def nominate(
    game_id: str,
    body: NominateRequest,
    request: Request,
) -> ActionResponse:
    session = _get_session(game_id)
    user = require_user_if_bound(request, session)
    if user is not None:
        require_bound_president(session, user)
    before_table = len(session.state.law_table.cards)
    try:
        nominate_chancellor(session.state, body.nominee_id)
    except EngineError as exc:
        raise _engine_error(exc) from exc

    enacted = _last_enacted_if_grew(session.state, before_table)
    return ActionResponse(view=_view(game_id, session.state), enacted=enacted)


@router.post("/games/{game_id}/vote", response_model=ActionResponse)
def vote(game_id: str, body: VoteRequest, request: Request) -> ActionResponse:
    session = _get_session(game_id)
    user = require_user_if_bound(request, session)
    if user is not None:
        require_bound_seat(session, user, body.player_id)
    try:
        cast_vote(session.state, body.player_id, body.vote)
    except EngineError as exc:
        raise _engine_error(exc) from exc
    return ActionResponse(view=_view(game_id, session.state))


@router.post("/games/{game_id}/resolve-votes", response_model=ActionResponse)
def resolve(game_id: str, request: Request) -> ActionResponse:
    session = _get_session(game_id)
    user = require_user_if_bound(request, session)
    bound_player_id: str | None = None
    if user is not None:
        bound_player_id = require_bound_president(session, user)
    before_table = len(session.state.law_table.cards)
    try:
        resolve_votes(session.state)
    except EngineError as exc:
        raise _engine_error(exc) from exc

    # Reject clears state.votes; approved may keep them. Prefer the snapshot
    # recorded on the resolve_votes action (includes timeout Neins).
    votes_snapshot: dict[str, bool] = {}
    for entry in reversed(session.state.action_log):
        if entry.type == "resolve_votes":
            raw = entry.payload.get("votes") or {}
            votes_snapshot = {str(k): bool(v) for k, v in raw.items()}
            break
    if not votes_snapshot:
        votes_snapshot = dict(session.state.votes)

    enacted = _last_enacted_if_grew(session.state, before_table)
    hand = _hand_for_action_response(session, bound_player_id)
    return ActionResponse(
        view=_view(game_id, session.state),
        votes=votes_snapshot,
        enacted=enacted,
        hand=hand,
    )


@router.post("/games/{game_id}/president-discard", response_model=ActionResponse)
def discard_as_president(
    game_id: str,
    body: DiscardRequest,
    request: Request,
) -> ActionResponse:
    session = _get_session(game_id)
    user = require_user_if_bound(request, session)
    bound_player_id: str | None = None
    if user is not None:
        bound_player_id = require_bound_president(session, user)
    try:
        president_discard(session.state, body.card_id)
    except EngineError as exc:
        raise _engine_error(exc) from exc
    hand = _hand_for_action_response(session, bound_player_id)
    return ActionResponse(view=_view(game_id, session.state), hand=hand)


@router.post("/games/{game_id}/chancellor-enact", response_model=ActionResponse)
def enact_as_chancellor(
    game_id: str,
    body: EnactRequest,
    request: Request,
) -> ActionResponse:
    """Enact the given card_id; the other hand card returns to the deck."""
    session = _get_session(game_id)
    user = require_user_if_bound(request, session)
    if user is not None:
        require_bound_chancellor(session, user)
    before_table = len(session.state.law_table.cards)
    try:
        chancellor_enact(session.state, body.card_id)
    except EngineError as exc:
        raise _engine_error(exc) from exc
    enacted = _last_enacted_if_grew(session.state, before_table)
    return ActionResponse(view=_view(game_id, session.state), enacted=enacted)


@router.delete("/games/{game_id}", status_code=204)
def delete_game(game_id: str) -> None:
    store.delete(game_id)
