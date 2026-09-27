from __future__ import annotations

import random

import pytest

from secret_cards.engine.legislative import chancellor_enact, president_discard
from secret_cards.engine.nominate import eligible_chancellor_ids, nominate_chancellor
from secret_cards.engine.start import start_game
from secret_cards.engine.vote import cast_vote, resolve_votes
from secret_cards.errors import InvalidCardChoiceError, InvalidPhaseError
from secret_cards.laws.law_card import LawColor, make_law_card
from secret_cards.model import Phase, Settings, Team


def _legislative_hand(seed: int = 0):
    names = [f"P{i}" for i in range(5)]
    state = start_game(
        Settings(player_count=5), names, rng=random.Random(seed)
    )
    nominate_chancellor(state, eligible_chancellor_ids(state)[0])
    for p in state.players:
        cast_vote(state, p.id, True)
    resolve_votes(state)
    assert state.phase is Phase.LEGISLATIVE_PRESIDENT
    assert len(state.drawn_law_cards) == 3
    return state


def test_president_discard_returns_card_and_leaves_two() -> None:
    state = _legislative_hand()
    discard = state.drawn_law_cards[0]
    remaining_ids = {c.id for c in state.drawn_law_cards[1:]}
    deck_before = len(state.law_deck)

    president_discard(state, discard.id, rng=random.Random(1))

    assert state.phase is Phase.LEGISLATIVE_CHANCELLOR
    assert len(state.drawn_law_cards) == 2
    assert {c.id for c in state.drawn_law_cards} == remaining_ids
    assert len(state.law_deck) == deck_before + 1
    assert discard.id in {c.id for c in state.law_deck.cards}


def test_president_discard_rejects_unknown_card() -> None:
    state = _legislative_hand()
    with pytest.raises(InvalidCardChoiceError):
        president_discard(state, "not-in-hand")


def test_president_discard_wrong_phase() -> None:
    state = _legislative_hand()
    state.phase = Phase.VOTING
    with pytest.raises(InvalidPhaseError):
        president_discard(state, state.drawn_law_cards[0].id)


def test_chancellor_enact_puts_card_on_table_and_advances() -> None:
    state = _legislative_hand()
    president_discard(state, state.drawn_law_cards[0].id, rng=random.Random(2))
    enact = state.drawn_law_cards[0]
    other = state.drawn_law_cards[1]
    chancellor_id = state.chancellor_id
    president_id = state.players[state.president_index].id

    chancellor_enact(state, enact.id, rng=random.Random(3))

    assert len(state.law_table) == 1
    assert state.law_table.cards[0].id == enact.id
    assert other.id in {c.id for c in state.law_deck.cards}
    assert state.phase is Phase.NOMINATION
    assert state.round_number == 2
    assert state.president_index == 1
    assert state.previous_chancellor_id == chancellor_id
    assert state.previous_president_id == president_id
    assert state.drawn_law_cards == []


def test_chancellor_enact_fifth_red_ends_game() -> None:
    state = _legislative_hand(seed=7)
    for n in range(1, 5):
        state.law_table.play(make_law_card(LawColor.RED, n + 100))

    # Force a red into the hand after discard
    president_discard(state, state.drawn_law_cards[0].id, rng=random.Random(4))
    red = make_law_card(LawColor.RED, 200)
    state.drawn_law_cards[0] = red

    chancellor_enact(state, red.id, rng=random.Random(5))
    assert state.phase is Phase.GAME_OVER
    assert state.winner is Team.COMMUNIST
    assert state.win_reason == "communist_laws"
