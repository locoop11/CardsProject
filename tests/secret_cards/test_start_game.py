from __future__ import annotations

import random
from collections import Counter

import pytest

from secret_cards.engine.start import start_game
from secret_cards.model import Phase, Role, Settings, Team, team_for_role
from secret_cards.roles import (
    ROLE_DISTRIBUTION,
    SUPPORTED_PLAYER_COUNTS,
    assign_roles,
)


@pytest.mark.parametrize("player_count", SUPPORTED_PLAYER_COUNTS)
def test_assign_roles_matches_distribution_table(player_count: int) -> None:
    roles = assign_roles(player_count, rng=random.Random(player_count))
    communist_count, fascist_including_hitler = ROLE_DISTRIBUTION[player_count]
    counts = Counter(roles)
    assert len(roles) == player_count
    assert counts[Role.HITLER] == 1
    assert counts[Role.COMMUNIST] == communist_count
    assert counts[Role.FASCIST] == fascist_including_hitler - 1


def test_assign_roles_rejects_unsupported_count() -> None:
    with pytest.raises(ValueError, match="Unsupported player_count"):
        assign_roles(4)


def test_assign_roles_shuffle_is_deterministic_with_seed() -> None:
    a = assign_roles(7, rng=random.Random(11))
    b = assign_roles(7, rng=random.Random(11))
    assert a == b


def test_start_game_builds_valid_initial_state() -> None:
    names = ["Alice", "Bob", "Cara", "Dan", "Eve"]
    state = start_game(
        Settings(player_count=5), names, rng=random.Random(42)
    )
    assert state.phase is Phase.NOMINATION
    assert state.round_number == 1
    assert state.president_index == 0
    assert len(state.players) == 5
    assert len(state.law_deck) == 17
    assert len(state.law_table) == 0
    assert state.drawn_law_cards == []
    assert state.rejected_nominee_ids == []
    assert state.nominated_chancellor_id is None
    assert state.action_log[0].type == "start_game"

    counts = Counter(p.role for p in state.players)
    assert counts[Role.HITLER] == 1
    assert counts[Role.COMMUNIST] == 3
    assert counts[Role.FASCIST] == 1
    assert team_for_role(Role.HITLER) is Team.FASCIST


def test_start_game_rejects_unsupported_player_count() -> None:
    with pytest.raises(ValueError, match="Unsupported player_count"):
        start_game(Settings(player_count=3), ["a", "b", "c"])


def test_start_game_rejects_name_count_mismatch() -> None:
    with pytest.raises(ValueError, match="Expected 5 names"):
        start_game(Settings(player_count=5), ["a", "b"])


def test_start_game_autofills_blank_names() -> None:
    state = start_game(
        Settings(player_count=5),
        ["Alice", "", "  ", "Dan", "Eve"],
        rng=random.Random(1),
    )
    assert all(p.name.strip() for p in state.players)
    # Placeholders used for the blank slots (order shuffled, so check set)
    assert "Player 2" in {p.name for p in state.players}
    assert "Player 3" in {p.name for p in state.players}
