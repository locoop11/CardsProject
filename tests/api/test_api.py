"""API integration tests for Phase 4.1 local transport."""

from __future__ import annotations

from fastapi.testclient import TestClient

from api.app import app
from api.session import store

client = TestClient(app)


def setup_function() -> None:
    store._games.clear()


def _create(seed: int = 1) -> dict:
    res = client.post(
        "/api/games",
        json={
            "player_count": 5,
            "player_names": ["A", "B", "C", "D", "E"],
            "seed": seed,
        },
    )
    assert res.status_code == 200, res.text
    return res.json()


def test_health() -> None:
    assert client.get("/health").json() == {"status": "ok"}


def test_create_game_returns_public_view_without_roles_on_players() -> None:
    data = _create()
    assert "game_id" in data
    for p in data["view"]["players"]:
        assert set(p.keys()) == {"id", "name"}
    assert len(data["role_reveal"]) == 5
    assert data["view"]["phase"] == "nomination"
    assert data["view"]["reds_on_table"] == 0


def test_role_reveal_follows_name_entry_order_not_seat_shuffle() -> None:
    """Pass-and-play reveal must match typed seats even when seats shuffle."""
    names = ["Ada", "Bo", "Cy", "Di", "Ed"]
    res = client.post(
        "/api/games",
        json={"player_count": 5, "player_names": names, "seed": 42},
    )
    assert res.status_code == 200
    data = res.json()
    assert [p["name"] for p in data["role_reveal"]] == names
    # Seat order on the board may differ after shuffle.
    seat_names = [p["name"] for p in data["view"]["players"]]
    assert sorted(seat_names) == sorted(names)


def test_player_role_endpoint_scoped() -> None:
    data = _create()
    gid = data["game_id"]
    pid = data["role_reveal"][0]["id"]
    expected = data["role_reveal"][0]
    res = client.get(f"/api/games/{gid}/role/{pid}")
    assert res.status_code == 200
    assert res.json() == expected


def test_hand_forbidden_for_wrong_viewer() -> None:
    data = _create(seed=7)
    gid = data["game_id"]
    view = data["view"]
    president_id = view["president_id"]
    # Nominate eligible non-president and approve all Ja → legislative
    nominee = view["eligible_chancellor_ids"][0]
    assert client.post(
        f"/api/games/{gid}/nominate", json={"nominee_id": nominee}
    ).status_code == 200
    for p in view["players"]:
        assert (
            client.post(
                f"/api/games/{gid}/vote",
                json={"player_id": p["id"], "vote": True},
            ).status_code
            == 200
        )
    resolved = client.post(f"/api/games/{gid}/resolve-votes")
    assert resolved.status_code == 200
    body = resolved.json()
    assert body["view"]["phase"] == "legislative_president"
    assert body["hand"] is not None and len(body["hand"]) == 3

    wrong = next(p["id"] for p in view["players"] if p["id"] != president_id)
    forbidden = client.get(f"/api/games/{gid}/hand", params={"viewer_id": wrong})
    assert forbidden.status_code == 403

    ok = client.get(
        f"/api/games/{gid}/hand", params={"viewer_id": president_id}
    )
    assert ok.status_code == 200
    assert len(ok.json()["cards"]) == 3


def test_legislative_pipeline_enacts_real_deck_card() -> None:
    data = _create(seed=99)
    gid = data["game_id"]
    view = data["view"]
    nominee = view["eligible_chancellor_ids"][0]
    client.post(f"/api/games/{gid}/nominate", json={"nominee_id": nominee})
    for p in view["players"]:
        client.post(
            f"/api/games/{gid}/vote",
            json={"player_id": p["id"], "vote": True},
        )
    resolved = client.post(f"/api/games/{gid}/resolve-votes").json()
    hand3 = resolved["hand"]
    discard = hand3[0]["id"]
    after_pres = client.post(
        f"/api/games/{gid}/president-discard", json={"card_id": discard}
    ).json()
    assert after_pres["view"]["phase"] == "legislative_chancellor"
    hand2 = after_pres["hand"]
    assert len(hand2) == 2
    enact_id = hand2[0]["id"]
    leftover_color = hand2[0]["color"]
    final = client.post(
        f"/api/games/{gid}/chancellor-enact", json={"card_id": enact_id}
    ).json()
    assert final["enacted"]["id"] == enact_id
    assert final["enacted"]["color"] == leftover_color
    assert final["view"]["phase"] in ("nomination", "game_over")
    tracks = final["view"]["reds_on_table"] + final["view"]["blacks_on_table"]
    assert tracks == 1 or final["view"]["phase"] == "game_over"
