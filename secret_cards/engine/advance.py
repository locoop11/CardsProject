from __future__ import annotations

from secret_cards.actions import record_action
from secret_cards.model import GameState, Phase


def advance_round(
    state: GameState, *, after_auto_enact: bool = False
) -> GameState:
    """
    End the current round and rotate the presidency.

    Sets previous office holders (or clears chancellor term limit after
    auto-enact when settings say so), advances president_index, increments
    round_number, clears nomination/vote/hand state, and returns to
    NOMINATION.

    Args:
        state: Mutable game state.
        after_auto_enact: True when this follows a top-of-deck enact with no
            elected chancellor.
    """
    finishing_president = state.players[state.president_index]

    if after_auto_enact and state.settings.clear_term_limits_on_auto_enact:
        state.previous_president_id = finishing_president.id
        state.previous_chancellor_id = None
    else:
        state.previous_president_id = finishing_president.id
        if state.chancellor_id is not None:
            state.previous_chancellor_id = state.chancellor_id

    state.president_index = (state.president_index + 1) % len(state.players)
    state.round_number += 1
    state.phase = Phase.NOMINATION
    state.nominated_chancellor_id = None
    state.chancellor_id = None
    state.rejected_nominee_ids.clear()
    state.votes.clear()
    state.drawn_law_cards.clear()

    record_action(
        state,
        "advance_round",
        {
            "round_number": state.round_number,
            "president_id": state.players[state.president_index].id,
            "after_auto_enact": after_auto_enact,
        },
    )
    return state
