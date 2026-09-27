from __future__ import annotations

import random

from cards.table import CardTable
from secret_cards.actions import GameAction, record_action
from secret_cards.laws.law_card import LawColor, make_law_card
from secret_cards.laws.secret_cards_law_deck import SecretCardsLawDeck
from secret_cards.model import (
    Phase,
    Player,
    Role,
    Settings,
    Team,
    GameState,
    blacks_on_table,
    reds_on_table,
    team_for_role,
)


def _minimal_state() -> GameState:
    players = [
        Player(id="p1", name="Alice", role=Role.COMMUNIST),
        Player(id="p2", name="Bob", role=Role.FASCIST),
        Player(id="p3", name="Cara", role=Role.HITLER),
        Player(id="p4", name="Dan", role=Role.COMMUNIST),
        Player(id="p5", name="Eve", role=Role.COMMUNIST),
    ]
    return GameState(
        players=players,
        settings=Settings(player_count=5),
        phase=Phase.NOMINATION,
        round_number=1,
        president_index=0,
        nominated_chancellor_id=None,
        chancellor_id=None,
        previous_president_id=None,
        previous_chancellor_id=None,
        rejected_nominee_ids=[],
        votes={},
        law_deck=SecretCardsLawDeck.new_standard(rng=random.Random(0)),
        law_table=CardTable(),
        drawn_law_cards=[],
    )


def test_team_for_role() -> None:
    assert team_for_role(Role.COMMUNIST) is Team.COMMUNIST
    assert team_for_role(Role.FASCIST) is Team.FASCIST
    assert team_for_role(Role.HITLER) is Team.FASCIST


def test_game_state_starts_in_nomination_with_full_deck() -> None:
    state = _minimal_state()
    assert state.phase is Phase.NOMINATION
    assert len(state.law_deck) == 17
    assert len(state.law_table) == 0
    assert state.action_log == []
    assert state.winner is None


def test_enacted_counts_from_law_table() -> None:
    state = _minimal_state()
    state.law_table.play(make_law_card(LawColor.RED, 1, card_id=101))
    state.law_table.play(make_law_card(LawColor.RED, 2, card_id=102))
    state.law_table.play(make_law_card(LawColor.BLACK, 1, card_id=103))
    assert reds_on_table(state) == 2
    assert blacks_on_table(state) == 1


def test_record_action_appends_with_index() -> None:
    state = _minimal_state()
    first = record_action(state, "nominate", {"nominee_id": "p2"})
    second = record_action(state, "cast_vote", {"player_id": "p1", "vote": True})
    assert isinstance(first, GameAction)
    assert first.index == 0
    assert second.index == 1
    assert len(state.action_log) == 2
    assert state.action_log[0].type == "nominate"
    assert state.action_log[1].payload["vote"] is True


def test_settings_defaults() -> None:
    settings = Settings(player_count=7)
    assert settings.bar_previous_chancellor is True
    assert settings.bar_previous_president is False
    assert settings.clear_term_limits_on_auto_enact is True
    assert settings.voting_window_seconds == 5
