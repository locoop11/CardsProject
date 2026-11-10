"""Hybrid v3 table display: public board only; no seat; no secrets."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.app import app
from api.db import init_db
from api.rooms.store import store as room_store
from api.session import store as game_store


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db_file = tmp_path / "table_display_test.db"
    monkeypatch.setenv("SECRET_CARDS_DB", str(db_file))
    init_db()
    game_store._games.clear()
    room_store.clear()
    with TestClient(app) as test_client:
        yield test_client


def _register(client: TestClient, username: str, display_name: str | None = None):
    res = client.post(
        "/api/auth/register",
        json={
            "username": username,
            "password": "secret1",
            "display_name": display_name or username.title(),
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def _login(client: TestClient, username: str) -> None:
    client.cookies.clear()
    res = client.post(
        "/api/auth/login",
        json={"username": username, "password": "secret1"},
    )
    assert res.status_code == 200, res.text


def _fill_five_seats(client: TestClient) -> tuple[str, str, list[dict]]:
    """Host + 4 players claim all seats. Returns room_id, code, users. Host logged in."""
    users: list[dict] = []
    host = _register(client, "host0", "Host0")
    users.append(host)
    created = client.post("/api/rooms", json={"player_count": 5})
    assert created.status_code == 201, created.text
    room = created.json()
    assert room["table_attached"] is False
    assert room["table_display_count"] == 0
    room_id = room["room_id"]
    code = room["join_code"]
    assert (
        client.post(
            f"/api/rooms/{room_id}/claim", json={"seat_index": 0}
        ).status_code
        == 200
    )

    for i in range(1, 5):
        client.cookies.clear()
        user = _register(client, f"u{i}", f"User{i}")
        users.append(user)
        assert client.post("/api/rooms/join", json={"code": code}).status_code == 200
        assert (
            client.post(
                f"/api/rooms/{room_id}/claim", json={"seat_index": i}
            ).status_code
            == 200
        )

    _login(client, "host0")
    return room_id, code, users


def test_attach_table_does_not_count_as_seat_and_start_still_needs_all_seats(
    client: TestClient,
) -> None:
    host = _register(client, "host0")
    created = client.post("/api/rooms", json={"player_count": 5})
    room_id = created.json()["room_id"]

    attached = client.post(f"/api/rooms/{room_id}/table")
    assert attached.status_code == 200, attached.text
    body = attached.json()
    assert body["table_attached"] is True
    assert body["table_display_count"] == 1
    assert all(s["user_id"] is None for s in body["seats"])
    assert body["seats"][0]["user_id"] is None

    # Host claims seat 0; table attach did not fill any seat.
    claimed = client.post(
        f"/api/rooms/{room_id}/claim", json={"seat_index": 0}
    )
    assert claimed.status_code == 200
    assert claimed.json()["seats"][0]["user_id"] == host["id"]
    assert claimed.json()["table_display_count"] == 1

    early = client.post(f"/api/rooms/{room_id}/start", json={"seed": 1})
    assert early.status_code == 400
    assert "All seats must be claimed" in early.json()["detail"]


def test_table_can_poll_public_view_but_not_role_hand_or_nominate(
    client: TestClient,
) -> None:
    room_id, code, _users = _fill_five_seats(client)
    started = client.post(f"/api/rooms/{room_id}/start", json={"seed": 7})
    assert started.status_code == 200, started.text
    game_id = started.json()["game_id"]
    view = started.json()["view"]
    player_ids = [p["id"] for p in view["players"]]

    client.cookies.clear()
    table_user = _register(client, "tabletv", "Table TV")
    joined = client.post("/api/rooms/join-table", json={"code": code})
    assert joined.status_code == 200, joined.text
    assert joined.json()["game_id"] == game_id
    assert joined.json()["table_attached"] is True
    assert joined.json()["table_display_count"] >= 1

    # Public board OK (open GET; membership proven via room).
    public = client.get(f"/api/games/{game_id}")
    assert public.status_code == 200, public.text
    assert "players" in public.json()
    assert public.json().get("role_reveal") is None

    # No seat binding → role / hand / nominate denied.
    for pid in player_ids:
        role = client.get(f"/api/games/{game_id}/role/{pid}")
        assert role.status_code == 403, role.text

    hand = client.get(
        f"/api/games/{game_id}/hand",
        params={"viewer_id": player_ids[0]},
    )
    assert hand.status_code == 403, hand.text

    nominate = client.post(
        f"/api/games/{game_id}/nominate",
        json={"nominee_id": player_ids[1]},
    )
    assert nominate.status_code == 403, nominate.text

    # Table-only user is not in seat bindings.
    session = game_store.get(game_id)
    assert session is not None and session.user_id_by_player_id is not None
    assert table_user["id"] not in session.user_id_by_player_id.values()


def test_join_as_player_still_blocked_after_start_but_table_allowed(
    client: TestClient,
) -> None:
    room_id, code, _users = _fill_five_seats(client)
    started = client.post(f"/api/rooms/{room_id}/start", json={"seed": 3})
    assert started.status_code == 200

    client.cookies.clear()
    _register(client, "latecomer")
    player_join = client.post("/api/rooms/join", json={"code": code})
    assert player_join.status_code == 400

    table_join = client.post("/api/rooms/join-table", json={"code": code})
    assert table_join.status_code == 200, table_join.text
    assert table_join.json()["room_id"] == room_id


def test_attach_before_start_survives_start(client: TestClient) -> None:
    room_id, _code, _users = _fill_five_seats(client)
    client.cookies.clear()
    _register(client, "projector")
    # Need room_id — join as table before start via code from host room.
    _login(client, "host0")
    code = client.get(f"/api/rooms/{room_id}").json()["join_code"]
    client.cookies.clear()
    _login(client, "projector")
    pre = client.post("/api/rooms/join-table", json={"code": code})
    assert pre.status_code == 200
    assert pre.json()["game_id"] is None
    assert pre.json()["table_display_count"] == 1

    _login(client, "host0")
    started = client.post(f"/api/rooms/{room_id}/start", json={"seed": 9})
    assert started.status_code == 200

    _login(client, "projector")
    room = client.get(f"/api/rooms/{room_id}")
    assert room.status_code == 200
    assert room.json()["game_id"] == started.json()["game_id"]
    assert room.json()["table_display_count"] == 1


def test_detach_table_display(client: TestClient) -> None:
    host = _register(client, "host0")
    created = client.post("/api/rooms", json={"player_count": 5})
    room_id = created.json()["room_id"]
    assert client.post(f"/api/rooms/{room_id}/table").status_code == 200
    detached = client.delete(f"/api/rooms/{room_id}/table")
    assert detached.status_code == 200, detached.text
    assert detached.json()["table_attached"] is False
    assert detached.json()["table_display_count"] == 0
    # Host remains a member.
    got = client.get(f"/api/rooms/{room_id}")
    assert got.status_code == 200
    assert got.json()["host_user_id"] == host["id"]


def test_table_attach_requires_session(client: TestClient) -> None:
    _register(client, "host0")
    created = client.post("/api/rooms", json={"player_count": 5})
    room_id = created.json()["room_id"]
    code = created.json()["join_code"]
    client.cookies.clear()
    assert client.post(f"/api/rooms/{room_id}/table").status_code == 401
    assert client.post("/api/rooms/join-table", json={"code": code}).status_code == 401


def test_local_guest_create_game_unchanged(client: TestClient) -> None:
    res = client.post(
        "/api/games",
        json={
            "player_count": 5,
            "player_names": ["A", "B", "C", "D", "E"],
        },
    )
    assert res.status_code == 200
    assert "role_reveal" in res.json()
