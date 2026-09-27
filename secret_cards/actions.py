from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from secret_cards.model import GameState


@dataclass
class GameAction:
    """
    One recorded engine action for future replay / persistence.

    Appended to GameState.action_log by engine helpers. Persistence of the
    log is post-v1; recording in v1 keeps replay cheap later.
    """

    type: str
    payload: dict[str, Any] = field(default_factory=dict)
    index: int = 0  # sequential position in the log when recorded


def record_action(
    state: GameState, action_type: str, payload: dict[str, Any] | None = None
) -> GameAction:
    """
    Append a GameAction to state.action_log and return it.

    Args:
        state: Mutable game state (log is updated in place).
        action_type: Short name, e.g. "nominate", "cast_vote", "advance_round".
        payload: Serializable details (ids, card ids, votes, …).

    Returns:
        The recorded GameAction (also stored on state.action_log).
    """
    action = GameAction(
        type=action_type,
        payload=dict(payload or {}),
        index=len(state.action_log),
    )
    state.action_log.append(action)
    return action
