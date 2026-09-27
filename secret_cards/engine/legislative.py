from __future__ import annotations

import random

from secret_cards.actions import record_action
from secret_cards.engine.advance import advance_round
from secret_cards.engine.win import apply_win, check_win_condition
from secret_cards.errors import InvalidCardChoiceError, InvalidPhaseError
from secret_cards.model import GameState, Phase


def president_discard(
    state: GameState,
    card_id: str,
    rng: random.Random | None = None,
) -> GameState:
    """
    President discards one of three drawn LawCards back into the deck.

    The discarded card is returned via return_and_shuffle. The remaining two
    stay in drawn_law_cards; phase becomes LEGISLATIVE_CHANCELLOR.

    Args:
        state: Must be in LEGISLATIVE_PRESIDENT with exactly 3 drawn cards.
        card_id: Id of the LawCard to discard (must be in the hand).
        rng: Optional RNG for shuffling the discard back into the deck.

    Returns:
        The same state object, mutated.
    """
    if state.phase is not Phase.LEGISLATIVE_PRESIDENT:
        raise InvalidPhaseError(
            f"president_discard requires phase="
            f"{Phase.LEGISLATIVE_PRESIDENT.value}, got {state.phase.value}"
        )
    if len(state.drawn_law_cards) != 3:
        raise InvalidPhaseError(
            f"president_discard expects 3 drawn LawCards, "
            f"got {len(state.drawn_law_cards)}"
        )

    discarded = _take_from_hand(state, card_id)
    state.law_deck.return_and_shuffle([discarded], rng=rng)
    state.phase = Phase.LEGISLATIVE_CHANCELLOR
    record_action(
        state,
        "president_discard",
        {
            "card_id": discarded.id,
            "remaining_ids": [c.id for c in state.drawn_law_cards],
        },
    )
    return state


def chancellor_enact(
    state: GameState,
    card_id: str,
    rng: random.Random | None = None,
) -> GameState:
    """
    Chancellor enacts one of the two remaining LawCards onto the table.

    The unchosen LawCard is returned to the deck (discard back to pool).
    Then win conditions are checked; if none, the round advances.

    Args:
        state: Must be in LEGISLATIVE_CHANCELLOR with exactly 2 drawn cards.
        card_id: Id of the LawCard to enact (must be in the hand).
        rng: Optional RNG for shuffling the unchosen card back into the deck.

    Returns:
        The same state object, mutated.
    """
    if state.phase is not Phase.LEGISLATIVE_CHANCELLOR:
        raise InvalidPhaseError(
            f"chancellor_enact requires phase="
            f"{Phase.LEGISLATIVE_CHANCELLOR.value}, got {state.phase.value}"
        )
    if len(state.drawn_law_cards) != 2:
        raise InvalidPhaseError(
            f"chancellor_enact expects 2 drawn LawCards, "
            f"got {len(state.drawn_law_cards)}"
        )

    enacted = _take_from_hand(state, card_id)
    leftover = list(state.drawn_law_cards)
    state.drawn_law_cards.clear()
    if leftover:
        state.law_deck.return_and_shuffle(leftover, rng=rng)

    state.law_table.play(enacted)
    record_action(
        state,
        "chancellor_enact",
        {
            "card_id": enacted.id,
            "color": enacted.color,
            "number": enacted.number,
            "returned_ids": [c.id for c in leftover],
        },
    )

    win = check_win_condition(state, trigger="enactment")
    if win is not None:
        return apply_win(state, win[0], win[1])

    return advance_round(state, after_auto_enact=False)


def _take_from_hand(state: GameState, card_id: str):
    for i, card in enumerate(state.drawn_law_cards):
        if card.id == card_id:
            return state.drawn_law_cards.pop(i)
    raise InvalidCardChoiceError(
        f"Card {card_id!r} is not in the legislative hand; "
        f"hand={[c.id for c in state.drawn_law_cards]}"
    )
