"""Unit tests for player-scoped / public views."""

from secret_cards.engine.start import start_game
from secret_cards.engine.vote import cast_vote, resolve_votes
from secret_cards.engine.nominate import nominate_chancellor
from secret_cards.model import Settings
from secret_cards.views import (
    legislative_hand,
    public_view,
    role_for_player,
    role_reveal_in_entry_order,
)


def test_role_reveal_in_entry_order_ignores_seat_shuffle() -> None:
    import random

    names = ["Ada", "Bo", "Cy", "Di", "Ed"]
    state = start_game(
        Settings(player_count=5),
        names,
        rng=random.Random(99),
    )
    reveal = role_reveal_in_entry_order(state, names)
    assert [p["name"] for p in reveal] == names
    assert {p["id"] for p in reveal} == {p.id for p in state.players}


def test_public_view_omits_roles() -> None:
    state = start_game(Settings(player_count=5), ["A", "B", "C", "D", "E"])
    view = public_view(state, game_id="g1")
    for player in view["players"]:
        assert set(player.keys()) == {"id", "name"}
    assert view["laws_on_table"] == []


def test_public_view_includes_enacted_law_ranks() -> None:
    from secret_cards.laws.law_card import LawColor, make_law_card

    state = start_game(Settings(player_count=5), ["A", "B", "C", "D", "E"])
    state.law_table.play(make_law_card(LawColor.RED, 2, card_id=99))
    view = public_view(state, game_id="g1")
    assert view["reds_on_table"] == 1
    assert view["laws_on_table"] == [
        {"id": 99, "type": "law", "number": 2, "color": "red"}
    ]


def test_role_for_player_only_returns_that_player() -> None:
    state = start_game(Settings(player_count=5), ["A", "B", "C", "D", "E"])
    pid = state.players[0].id
    payload = role_for_player(state, pid)
    assert payload is not None
    assert payload["id"] == pid
    assert payload["role"] == state.players[0].role.value


def test_legislative_hand_hidden_from_non_office() -> None:
    import random

    from secret_cards.engine.nominate import eligible_chancellor_ids

    state = start_game(
        Settings(player_count=5),
        ["A", "B", "C", "D", "E"],
        rng=random.Random(0),
    )
    nominee = eligible_chancellor_ids(state)[0]
    nominate_chancellor(state, nominee)
    for p in state.players:
        cast_vote(state, p.id, True)
    resolve_votes(state)

    president_id = state.players[state.president_index].id
    other = next(p.id for p in state.players if p.id != president_id)
    assert legislative_hand(state, president_id) is not None
    assert legislative_hand(state, other) is None
