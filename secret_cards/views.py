"""Player-scoped and public projections of GameState (Phase 4).

Never return raw GameState to clients. Pass-and-play v1 may still fetch a
one-shot role-reveal list for the shared device; multi-device privacy is Task 4.2.
"""

from __future__ import annotations

from typing import Any, Optional

from cards.card import Card

from secret_cards.engine.nominate import (
    current_president_id,
    eligible_chancellor_ids,
)
from secret_cards.model import (
    GameState,
    Phase,
    Player,
    blacks_on_table,
    reds_on_table,
    team_for_role,
)


def card_to_dict(card: Card) -> dict[str, Any]:
    """Serialize a LawCard/Card for UI visuals (id + kind)."""
    return {
        "id": card.id,
        "type": card.type,
        "number": card.number,
        "color": card.color,
    }


def player_public(player: Player) -> dict[str, str]:
    """Public seat info — never includes role/team."""
    return {"id": player.id, "name": player.name}


def player_role_reveal(player: Player) -> dict[str, str]:
    """One player's private role for pass-and-play reveal."""
    return {
        "id": player.id,
        "name": player.name,
        "role": player.role.value,
        "team": team_for_role(player.role).value,
    }


def normalize_entry_names(player_names: list[str]) -> list[str]:
    """Match start_game blank-name filling (Player 1, Player 2, …)."""
    return [
        name.strip() if name.strip() else f"Player {i + 1}"
        for i, name in enumerate(player_names)
    ]


def role_reveal_in_entry_order(
    state: GameState, player_names: list[str]
) -> list[dict[str, str]]:
    """
    Role-reveal list in name-entry order (pass-and-play friendly).

    Seats may be shuffled for presidency; reveal still follows the order
    names were typed so the device is passed around the same way.
    Duplicate names are matched in entry order (first unused seat each time).
    """
    remaining: dict[str, list[Player]] = {}
    for player in state.players:
        remaining.setdefault(player.name, []).append(player)

    ordered: list[dict[str, str]] = []
    for name in normalize_entry_names(player_names):
        bucket = remaining.get(name)
        if not bucket:
            continue
        ordered.append(player_role_reveal(bucket.pop(0)))
    return ordered


def public_view(state: GameState, *, game_id: str) -> dict[str, Any]:
    """
    Board / phase snapshot safe to show the whole table.

    Omits roles, deck contents, and legislative hand.
    """
    president = state.players[state.president_index]
    by_id = {p.id: p for p in state.players}
    rejected_names = [
        by_id[i].name for i in state.rejected_nominee_ids if i in by_id
    ]

    view: dict[str, Any] = {
        "game_id": game_id,
        "phase": state.phase.value,
        "round_number": state.round_number,
        "president_id": president.id,
        "president_name": president.name,
        "president_index": state.president_index,
        "nominated_chancellor_id": state.nominated_chancellor_id,
        "chancellor_id": state.chancellor_id,
        "previous_chancellor_id": state.previous_chancellor_id,
        "rejected_nominee_ids": list(state.rejected_nominee_ids),
        "rejected_names": rejected_names,
        "eligible_chancellor_ids": eligible_chancellor_ids(state)
        if state.phase is Phase.NOMINATION
        else [],
        "players": [player_public(p) for p in state.players],
        "reds_on_table": reds_on_table(state),
        "blacks_on_table": blacks_on_table(state),
        "laws_on_table": [card_to_dict(c) for c in state.law_table.cards],
        "votes_cast": sorted(state.votes.keys()),
        "winner": state.winner.value if state.winner else None,
        "win_reason": state.win_reason,
        "result": _serialize_result(state.result),
    }
    return view


def legislative_hand(
    state: GameState, viewer_id: str
) -> Optional[list[dict[str, Any]]]:
    """
    Return drawn LawCards only if viewer is the office holder for this phase.

    President sees the hand in LEGISLATIVE_PRESIDENT; chancellor in
    LEGISLATIVE_CHANCELLOR. Anyone else gets None (caller should 403 / empty).
    """
    if state.phase is Phase.LEGISLATIVE_PRESIDENT:
        if viewer_id != current_president_id(state):
            return None
        return [card_to_dict(c) for c in state.drawn_law_cards]

    if state.phase is Phase.LEGISLATIVE_CHANCELLOR:
        if state.chancellor_id is None or viewer_id != state.chancellor_id:
            return None
        return [card_to_dict(c) for c in state.drawn_law_cards]

    return None


def role_for_player(state: GameState, player_id: str) -> Optional[dict[str, str]]:
    """Single-player role projection (Task 4.2 building block)."""
    for player in state.players:
        if player.id == player_id:
            return player_role_reveal(player)
    return None


def _serialize_result(result: Optional[dict[str, Any]]) -> Optional[dict[str, Any]]:
    if result is None:
        return None
    winner = result.get("winner")
    players = []
    for p in result.get("players", []):
        role = p["role"]
        team = p["team"]
        players.append(
            {
                "name": p["name"],
                "role": role.value if hasattr(role, "value") else role,
                "team": team.value if hasattr(team, "value") else team,
            }
        )
    return {
        "winner": winner.value if hasattr(winner, "value") else winner,
        "win_reason": result.get("win_reason"),
        "round_count": result.get("round_count"),
        "players": players,
        "reds_on_table": result.get("reds_on_table"),
        "blacks_on_table": result.get("blacks_on_table"),
    }
