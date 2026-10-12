"""Authorization helpers for multi-device seat bindings.

Local games (`user_id_by_player_id is None`) stay auth-optional.
Bound games require a session cookie and matching seat for secrets/actors.
"""

from __future__ import annotations

from fastapi import HTTPException, Request

from api.auth.deps import require_user
from api.auth.service import UserRecord
from api.session import GameSession
from secret_cards.engine.nominate import current_president_id
from secret_cards.model import GameState, Phase


def require_user_if_bound(request: Request, session: GameSession) -> UserRecord | None:
    """Return None for local games; require authenticated user when bound."""
    if session.is_local():
        return None
    return require_user(request)


def bound_player_id_or_403(session: GameSession, user: UserRecord) -> str:
    """Seat id for this user, or 403 if not bound to the game."""
    player_id = session.bound_player_id(user.id)
    if player_id is None:
        raise HTTPException(
            status_code=403,
            detail="Not bound to a seat in this game",
        )
    return player_id


def require_bound_seat(
    session: GameSession,
    user: UserRecord,
    player_id: str,
) -> None:
    """403 unless the authenticated user is bound to `player_id`."""
    if session.bound_player_id(user.id) != player_id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized for this seat",
        )


def require_bound_president(session: GameSession, user: UserRecord) -> str:
    """403 unless caller is bound to the current president seat."""
    player_id = bound_player_id_or_403(session, user)
    if player_id != current_president_id(session.state):
        raise HTTPException(
            status_code=403,
            detail="Only the bound president may perform this action",
        )
    return player_id


def require_bound_chancellor(session: GameSession, user: UserRecord) -> str:
    """403 unless caller is bound to the current chancellor seat."""
    player_id = bound_player_id_or_403(session, user)
    chancellor_id = session.state.chancellor_id
    if chancellor_id is None or player_id != chancellor_id:
        raise HTTPException(
            status_code=403,
            detail="Only the bound chancellor may perform this action",
        )
    return player_id


def office_holder_id(state: GameState) -> str | None:
    """Current legislative office holder, if any."""
    if state.phase == Phase.LEGISLATIVE_PRESIDENT:
        return current_president_id(state)
    if state.phase == Phase.LEGISLATIVE_CHANCELLOR:
        return state.chancellor_id
    return None
