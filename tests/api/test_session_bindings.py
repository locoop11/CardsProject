"""Unit tests for optional multi-device seat bindings on GameSession."""

from __future__ import annotations

import random

from api.session import GameSession, SessionStore
from secret_cards.engine.start import start_game
from secret_cards.model import Settings


def _state():
    return start_game(
        Settings(player_count=5),
        ["A", "B", "C", "D", "E"],
        rng=random.Random(0),
    )


def test_create_defaults_to_local_no_bindings() -> None:
    store = SessionStore()
    session = store.create(_state())
    assert session.user_id_by_player_id is None
    assert session.is_local() is True
    assert session.bound_player_id("any-user") is None
    assert session.bound_user_id("p0") is None


def test_create_with_bindings_enables_lookups() -> None:
    store = SessionStore()
    bindings = {"p0": "user-a", "p1": "user-b", "p2": "user-c", "p3": "user-d", "p4": "user-e"}
    session = store.create(_state(), user_id_by_player_id=bindings)
    assert session.is_local() is False
    assert session.bound_user_id("p1") == "user-b"
    assert session.bound_player_id("user-c") == "p2"
    assert session.bound_player_id("unknown") is None
    assert session.bound_user_id("p9") is None


def test_game_session_dataclass_accepts_explicit_none() -> None:
    session = GameSession(game_id="abc", state=_state(), user_id_by_player_id=None)
    assert session.is_local() is True
