from __future__ import annotations

from secret_cards.actions import record_action
from secret_cards.model import (
    GameState,
    Phase,
    Role,
    Team,
    blacks_on_table,
    reds_on_table,
    team_for_role,
)


def check_win_condition(
    state: GameState, *, trigger: str
) -> tuple[Team, str] | None:
    """
    Check win conditions for a specific trigger point.

    Args:
        state: Current game state.
        trigger: "election" (after government approved, before draw) or
            "enactment" (after a LawCard is placed on the table).

    Returns:
        (winning team, win_reason) or None if the game continues.
    """
    if trigger == "election":
        if state.chancellor_id is None:
            return None
        if blacks_on_table(state) < 3:
            return None
        chancellor = next(
            (p for p in state.players if p.id == state.chancellor_id), None
        )
        if chancellor is not None and chancellor.role is Role.HITLER:
            return Team.FASCIST, "hitler_elected"
        return None

    if trigger == "enactment":
        if reds_on_table(state) >= 5:
            return Team.COMMUNIST, "communist_laws"
        if blacks_on_table(state) >= 6:
            return Team.FASCIST, "fascist_laws"
        return None

    raise ValueError(f"Unknown win trigger: {trigger!r}")


def apply_win(state: GameState, team: Team, reason: str) -> GameState:
    """
    End the game: set GAME_OVER, winner, win_reason, and result object.

    Mutates state in place. Does nothing if already GAME_OVER with a result.
    """
    if state.phase is Phase.GAME_OVER and state.result is not None:
        return state

    state.phase = Phase.GAME_OVER
    state.winner = team
    state.win_reason = reason
    state.result = {
        "winner": team,
        "win_reason": reason,
        "round_count": state.round_number,
        "players": [
            {
                "name": p.name,
                "role": p.role,
                "team": team_for_role(p.role),
            }
            for p in state.players
        ],
        "reds_on_table": reds_on_table(state),
        "blacks_on_table": blacks_on_table(state),
    }
    record_action(
        state,
        "game_over",
        {"winner": team.value, "win_reason": reason},
    )
    return state
