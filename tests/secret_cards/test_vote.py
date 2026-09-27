from __future__ import annotations

import random

import pytest

from secret_cards.engine.nominate import (
    eligible_chancellor_ids,
    nominate_chancellor,
)
from secret_cards.engine.start import start_game
from secret_cards.engine.vote import cast_vote, resolve_votes
from secret_cards.errors import (
    InvalidPhaseError,
    VoteAlreadyCastError,
)
from secret_cards.laws.law_card import LawColor, make_law_card
from secret_cards.model import Phase, Role, Settings, Team


def _nominated_game(n: int = 5, seed: int = 0):
    names = [f"P{i}" for i in range(n)]
    state = start_game(Settings(player_count=n), names, rng=random.Random(seed))
    nominee = eligible_chancellor_ids(state)[0]
    nominate_chancellor(state, nominee)
    return state, nominee


def _all_vote(state, ja: bool) -> None:
    for player in state.players:
        cast_vote(state, player.id, ja)


def test_cast_vote_records_and_locks() -> None:
    state, _ = _nominated_game()
    pid = state.players[0].id
    cast_vote(state, pid, True)
    assert state.votes[pid] is True
    with pytest.raises(VoteAlreadyCastError):
        cast_vote(state, pid, False)


def test_cast_vote_wrong_phase() -> None:
    state, _ = _nominated_game()
    state.phase = Phase.NOMINATION
    with pytest.raises(InvalidPhaseError):
        cast_vote(state, state.players[0].id, True)


def test_resolve_majority_ja_draws_three_and_enters_legislative() -> None:
    state, nominee = _nominated_game()
    _all_vote(state, ja=True)
    resolve_votes(state)
    assert state.chancellor_id == nominee
    assert state.phase is Phase.LEGISLATIVE_PRESIDENT
    assert len(state.drawn_law_cards) == 3
    assert len(state.law_deck) == 14


def test_resolve_tie_is_rejected() -> None:
    # 6 players → 3 Ja / 3 Nein possible
    state, nominee = _nominated_game(n=6, seed=1)
    assert len(state.players) == 6
    for i, player in enumerate(state.players):
        cast_vote(state, player.id, i < 3)
    resolve_votes(state)
    assert state.phase is Phase.NOMINATION
    assert nominee in state.rejected_nominee_ids
    assert state.nominated_chancellor_id is None
    assert state.president_index == 0  # same president


def test_resolve_missing_votes_count_as_nein() -> None:
    state, nominee = _nominated_game()
    # Only one Ja; everyone else missing → Nein → reject
    cast_vote(state, state.players[0].id, True)
    resolve_votes(state)
    assert state.phase is Phase.NOMINATION
    assert nominee in state.rejected_nominee_ids


def test_reject_until_none_eligible_auto_enacts() -> None:
    state, _ = _nominated_game()
    president = state.players[state.president_index].id
    # Reject every eligible nominee one by one
    while state.phase is Phase.VOTING or (
        state.phase is Phase.NOMINATION and eligible_chancellor_ids(state)
    ):
        if state.phase is Phase.NOMINATION:
            nominate_chancellor(state, eligible_chancellor_ids(state)[0])
        _all_vote(state, ja=False)
        resolve_votes(state)

    assert any(a.type == "top_law_enact" for a in state.action_log)
    assert state.phase in (Phase.NOMINATION, Phase.GAME_OVER)
    assert president == state.players[0].id or state.round_number >= 2


def test_hitler_elected_with_three_black_wins_before_draw() -> None:
    state, nominee = _nominated_game()
    # Put three black laws on the table
    for n in range(1, 4):
        state.law_table.play(make_law_card(LawColor.BLACK, n + 50))
    # Make nominee Hitler
    for p in state.players:
        if p.id == nominee:
            p.role = Role.HITLER
            break

    deck_before = len(state.law_deck)
    _all_vote(state, ja=True)
    resolve_votes(state)

    assert state.phase is Phase.GAME_OVER
    assert state.winner is Team.FASCIST
    assert state.win_reason == "hitler_elected"
    assert len(state.law_deck) == deck_before  # no draw
    assert state.drawn_law_cards == []


def test_hitler_elected_before_three_black_does_not_win() -> None:
    state, nominee = _nominated_game()
    state.law_table.play(make_law_card(LawColor.BLACK, 80))
    for p in state.players:
        if p.id == nominee:
            p.role = Role.HITLER
            break
    _all_vote(state, ja=True)
    resolve_votes(state)
    assert state.phase is Phase.LEGISLATIVE_PRESIDENT
    assert state.winner is None
