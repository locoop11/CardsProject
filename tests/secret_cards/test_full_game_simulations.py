"""Task 2.8 — seeded full-game simulations through public engine APIs only."""

from __future__ import annotations

import random

from secret_cards.engine.legislative import chancellor_enact, president_discard
from secret_cards.engine.nominate import eligible_chancellor_ids, nominate_chancellor
from secret_cards.engine.start import start_game
from secret_cards.engine.vote import cast_vote, resolve_votes
from secret_cards.laws.law_card import LawColor, law_color
from secret_cards.model import (
    GameState,
    Phase,
    Role,
    Settings,
    Team,
    blacks_on_table,
)


def _start(seed: int, n: int = 5) -> GameState:
    names = [f"P{i}" for i in range(n)]
    return start_game(
        Settings(player_count=n), names, rng=random.Random(seed)
    )


def _pick_nominee(state: GameState) -> str:
    """Prefer a non-Hitler nominee once 3+ black LawCards are on the table."""
    eligible = eligible_chancellor_ids(state)
    if not eligible:
        return "ignored"
    if blacks_on_table(state) >= 3:
        by_id = {p.id: p for p in state.players}
        non_hitler = [
            pid for pid in eligible if by_id[pid].role is not Role.HITLER
        ]
        if non_hitler:
            return non_hitler[0]
    return eligible[0]


def _card_id_to_discard(hand, prefer: LawColor | None) -> int:
    """President discards a non-preferred card when possible."""
    if prefer is None:
        return hand[0].id
    for card in hand:
        if law_color(card) is not prefer:
            return card.id
    return hand[0].id


def _card_id_to_enact(hand, prefer: LawColor | None) -> int:
    """Chancellor enacts a preferred-color card when possible."""
    if prefer is None:
        return hand[0].id
    for card in hand:
        if law_color(card) is prefer:
            return card.id
    return hand[0].id


def _cast_all(state: GameState, ja: bool) -> None:
    for player in state.players:
        cast_vote(state, player.id, ja)


def _play_until_over(
    state: GameState,
    *,
    prefer_color: LawColor | None = None,
    always_reject: bool = False,
    max_rounds: int = 200,
    rng_seed: int = 1,
) -> GameState:
    """
    Drive nomination → vote → legislative (or top-enact) until GAME_OVER.

    Uses only public engine functions. Card choices bias toward prefer_color
    when set. If always_reject, every election is Nein until top-of-deck enact
    (and eventual track win).
    """
    rng = random.Random(rng_seed)
    steps = 0
    while state.phase is not Phase.GAME_OVER:
        steps += 1
        if steps > max_rounds * 20:
            raise AssertionError(
                f"Simulation exceeded step budget; phase={state.phase.value} "
                f"round={state.round_number} table={len(state.law_table)}"
            )

        if state.phase is Phase.NOMINATION:
            nominate_chancellor(state, _pick_nominee(state))
            continue

        if state.phase is Phase.VOTING:
            _cast_all(state, ja=not always_reject)
            resolve_votes(state)
            continue

        if state.phase is Phase.LEGISLATIVE_PRESIDENT:
            discard_id = _card_id_to_discard(state.drawn_law_cards, prefer_color)
            president_discard(state, discard_id, rng=rng)
            continue

        if state.phase is Phase.LEGISLATIVE_CHANCELLOR:
            enact_id = _card_id_to_enact(state.drawn_law_cards, prefer_color)
            chancellor_enact(state, enact_id, rng=rng)
            continue

        raise AssertionError(f"Unexpected phase during sim: {state.phase}")

    return state


def _assert_result_shape(state: GameState, *, winner: Team, reason: str) -> None:
    assert state.phase is Phase.GAME_OVER
    assert state.winner is winner
    assert state.win_reason == reason
    assert state.result is not None
    result = state.result
    assert result["winner"] is winner
    assert result["win_reason"] == reason
    assert isinstance(result["round_count"], int)
    assert result["round_count"] >= 1
    assert len(result["players"]) == len(state.players)
    for entry in result["players"]:
        assert "name" in entry and "role" in entry and "team" in entry
    assert isinstance(result["reds_on_table"], int)
    assert isinstance(result["blacks_on_table"], int)


def test_sim_exhausted_nominees_top_law_then_game_over() -> None:
    """Reject every election until top LawCards enact; play to GAME_OVER."""
    state = _start(seed=42)
    _play_until_over(state, always_reject=True, prefer_color=None, rng_seed=42)

    top_enacts = [a for a in state.action_log if a.type == "top_law_enact"]
    assert len(top_enacts) >= 1
    assert state.phase is Phase.GAME_OVER
    assert state.winner is not None
    assert state.win_reason in ("fascist_laws", "communist_laws")
    _assert_result_shape(state, winner=state.winner, reason=state.win_reason)


def test_sim_legislative_fascist_laws_win() -> None:
    """Approve governments and prefer black LawCards until fascist_laws."""
    state = _start(seed=7)
    _play_until_over(
        state,
        prefer_color=LawColor.BLACK,
        always_reject=False,
        rng_seed=7,
    )
    _assert_result_shape(state, winner=Team.FASCIST, reason="fascist_laws")
    assert state.result["blacks_on_table"] >= 6


def test_sim_legislative_communist_laws_win() -> None:
    """Approve governments and prefer red LawCards until communist_laws."""
    state = _start(seed=11)
    _play_until_over(
        state,
        prefer_color=LawColor.RED,
        always_reject=False,
        rng_seed=11,
    )
    _assert_result_shape(state, winner=Team.COMMUNIST, reason="communist_laws")
    assert state.result["reds_on_table"] >= 5
