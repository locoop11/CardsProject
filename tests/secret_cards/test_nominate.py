from __future__ import annotations

import random

import pytest

from secret_cards.engine.nominate import (
    eligible_chancellor_ids,
    nominate_chancellor,
)
from secret_cards.engine.start import start_game
from secret_cards.errors import InvalidNomineeError, InvalidPhaseError
from secret_cards.laws.law_card import LawColor, make_law_card
from secret_cards.model import Phase, Settings


def _game(n: int = 5, seed: int = 0):
    names = [f"P{i}" for i in range(n)]
    return start_game(Settings(player_count=n), names, rng=random.Random(seed))


def test_eligible_excludes_president() -> None:
    state = _game()
    president = state.players[0].id
    eligible = eligible_chancellor_ids(state)
    assert president not in eligible
    assert len(eligible) == len(state.players) - 1


def test_eligible_excludes_previous_chancellor_when_setting_on() -> None:
    state = _game()
    other = state.players[1].id
    state.previous_chancellor_id = other
    assert other not in eligible_chancellor_ids(state)

    state.settings.bar_previous_chancellor = False
    assert other in eligible_chancellor_ids(state)


def test_eligible_excludes_rejected_this_round() -> None:
    state = _game()
    rejected = state.players[2].id
    state.rejected_nominee_ids.append(rejected)
    assert rejected not in eligible_chancellor_ids(state)


def test_nominate_moves_to_voting() -> None:
    state = _game()
    nominee = eligible_chancellor_ids(state)[0]
    nominate_chancellor(state, nominee)
    assert state.phase is Phase.VOTING
    assert state.nominated_chancellor_id == nominee
    assert state.votes == {}
    assert state.action_log[-1].type == "nominate"


def test_nominate_rejects_barred_nominee() -> None:
    state = _game()
    barred = state.players[1].id
    state.previous_chancellor_id = barred
    with pytest.raises(InvalidNomineeError):
        nominate_chancellor(state, barred)


def test_nominate_rejects_wrong_phase() -> None:
    state = _game()
    state.phase = Phase.VOTING
    with pytest.raises(InvalidPhaseError):
        nominate_chancellor(state, state.players[1].id)


def test_no_eligible_nominees_enacts_top_law_and_advances() -> None:
    state = _game()
    president = state.players[0].id
    state.rejected_nominee_ids = [
        p.id for p in state.players if p.id != president
    ]
    assert eligible_chancellor_ids(state) == []

    top = state.law_deck.peek_top(1)[0]
    deck_before = len(state.law_deck)
    nominate_chancellor(state, nominee_id="ignored")

    assert len(state.law_table) == 1
    assert state.law_table.cards[0].id == top.id
    assert len(state.law_deck) == deck_before - 1
    assert state.phase is Phase.NOMINATION
    assert state.round_number == 2
    assert state.president_index == 1
    assert state.rejected_nominee_ids == []
    assert state.previous_chancellor_id is None
    assert any(a.type == "top_law_enact" for a in state.action_log)


def test_top_enact_can_end_game_on_fifth_red() -> None:
    state = _game()
    for n in range(1, 5):
        state.law_table.play(make_law_card(LawColor.RED, n, card_id=200 + n))
    red = make_law_card(LawColor.RED, 99, card_id=299)
    state.law_deck.cards.insert(0, red)

    president = state.players[0].id
    state.rejected_nominee_ids = [
        p.id for p in state.players if p.id != president
    ]
    nominate_chancellor(state, "ignored")
    assert state.phase is Phase.GAME_OVER
    assert state.win_reason == "communist_laws"
    assert state.result is not None
