"""Unit checks for seat display rotation (mirrors frontend/src/seatLayout.ts)."""

from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[2] / "frontend"
SEAT_LAYOUT = FRONTEND / "src" / "seatLayout.ts"


def rotate_players_for_viewer(
    players: list[dict[str, str]], viewer_player_id: str
) -> list[dict[str, str]]:
    """Python mirror of rotatePlayersForViewer — keep in sync with seatLayout.ts."""
    ids = [p["id"] for p in players]
    try:
        i = ids.index(viewer_player_id)
    except ValueError:
        return list(players)
    return players[i:] + players[:i]


def test_seat_layout_module_exports_helper() -> None:
    src = SEAT_LAYOUT.read_text(encoding="utf-8")
    assert "export function rotatePlayersForViewer" in src
    assert "players.slice(i).concat(players.slice(0, i))" in src


def test_viewer_moves_to_index_zero() -> None:
    players = [{"id": "p0"}, {"id": "p1"}, {"id": "p2"}, {"id": "p3"}, {"id": "p4"}]
    rotated = rotate_players_for_viewer(players, "p2")
    assert [p["id"] for p in rotated] == ["p2", "p3", "p4", "p0", "p1"]


def test_clockwise_neighbors_preserved() -> None:
    players = [{"id": f"p{i}"} for i in range(5)]
    rotated = rotate_players_for_viewer(players, "p3")
    # After p3: p4, then wrap to p0 — same clockwise ring as original.
    assert [p["id"] for p in rotated] == ["p3", "p4", "p0", "p1", "p2"]


def test_viewer_already_first_unchanged_order() -> None:
    players = [{"id": "a"}, {"id": "b"}, {"id": "c"}]
    rotated = rotate_players_for_viewer(players, "a")
    assert [p["id"] for p in rotated] == ["a", "b", "c"]


def test_unknown_viewer_returns_original_order() -> None:
    players = [{"id": "p0"}, {"id": "p1"}]
    rotated = rotate_players_for_viewer(players, "missing")
    assert [p["id"] for p in rotated] == ["p0", "p1"]


def test_player_ids_travel_with_objects() -> None:
    players = [
        {"id": "p0", "name": "Ann"},
        {"id": "p1", "name": "Bob"},
        {"id": "p2", "name": "Cat"},
    ]
    rotated = rotate_players_for_viewer(players, "p1")
    assert rotated[0] == {"id": "p1", "name": "Bob"}
    assert rotated[0]["id"] == "p1"
