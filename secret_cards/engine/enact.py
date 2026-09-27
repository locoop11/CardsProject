from __future__ import annotations

from secret_cards.actions import record_action
from secret_cards.engine.advance import advance_round
from secret_cards.engine.win import apply_win, check_win_condition
from secret_cards.model import GameState


def enact_top_law_after_exhausted_nominees(state: GameState) -> GameState:
    """
    When no eligible chancellor remains, enact the top LawCard immediately.

    Skips legislative discard/enact. Then checks win conditions; if none,
    advances the round (clearing chancellor term limit per settings).

    Mutates state in place and returns it.
    """
    card = state.law_deck.draw_top_for_auto_enact()
    state.law_table.play(card)
    state.drawn_law_cards.clear()
    record_action(
        state,
        "top_law_enact",
        {"card_id": card.id, "color": card.color, "number": card.number},
    )

    win = check_win_condition(state, trigger="enactment")
    if win is not None:
        return apply_win(state, win[0], win[1])

    return advance_round(state, after_auto_enact=True)
