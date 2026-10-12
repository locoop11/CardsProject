"""API tests for multi-device lobby rooms (create / join / claim / get)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.app import app
from api.db import init_db
from api.rooms.store import store as room_store
from api.session import store as game_store


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db_file = tmp_path / "rooms_test.db"
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


def test_create_room_requires_auth(client: TestClient) -> None:
    res = client.post("/api/rooms", json={"player_count": 5})
    assert res.status_code == 401


def test_host_creates_room_and_gets_code(client: TestClient) -> None:
    host = _register(client, "host")
    res = client.post("/api/rooms", json={"player_count": 5})
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["host_user_id"] == host["id"]
    assert body["player_count"] == 5
    assert body["game_id"] is None
    assert len(body["join_code"]) == 6
    assert body["join_code"] == body["join_code"].upper()
    assert len(body["seats"]) == 5
    assert all(s["user_id"] is None for s in body["seats"])
    assert body["seats"][0]["player_id"] == "p0"


def test_join_claim_get_flow(client: TestClient) -> None:
    host = _register(client, "host", "Hosty")
    created = client.post("/api/rooms", json={"player_count": 5})
    assert created.status_code == 201
    room = created.json()
    code = room["join_code"]
    room_id = room["room_id"]

    client.cookies.clear()
    guest = _register(client, "guest", "Guesty")
    joined = client.post("/api/rooms/join", json={"code": code.lower()})
    assert joined.status_code == 200, joined.text
    assert joined.json()["room_id"] == room_id

    claimed = client.post(
        f"/api/rooms/{room_id}/claim",
        json={"seat_index": 2},
    )
    assert claimed.status_code == 200, claimed.text
    seats = {s["seat_index"]: s for s in claimed.json()["seats"]}
    assert seats[2]["user_id"] == guest["id"]
    assert seats[2]["display_name"] == "Guesty"
    assert seats[2]["player_id"] == "p2"

    got = client.get(f"/api/rooms/{room_id}")
    assert got.status_code == 200
    assert got.json()["seats"][2]["user_id"] == guest["id"]

    # Host can still get after creating (auto-member).
    client.cookies.clear()
    login = client.post(
        "/api/auth/login",
        json={"username": "host", "password": "secret1"},
    )
    assert login.status_code == 200
    host_get = client.get(f"/api/rooms/{room_id}")
    assert host_get.status_code == 200
    assert host_get.json()["host_user_id"] == host["id"]


def test_join_unknown_code_404(client: TestClient) -> None:
    _register(client, "ada")
    res = client.post("/api/rooms/join", json={"code": "ZZZZZZ"})
    assert res.status_code == 404


def test_get_forbidden_for_non_member(client: TestClient) -> None:
    _register(client, "host")
    created = client.post("/api/rooms", json={"player_count": 5})
    room_id = created.json()["room_id"]

    client.cookies.clear()
    _register(client, "outsider")
    res = client.get(f"/api/rooms/{room_id}")
    assert res.status_code == 403


def test_claim_seat_conflict_409(client: TestClient) -> None:
    _register(client, "host")
    created = client.post("/api/rooms", json={"player_count": 5})
    room = created.json()
    code = room["join_code"]
    room_id = room["room_id"]

    claim_host = client.post(
        f"/api/rooms/{room_id}/claim",
        json={"seat_index": 0},
    )
    assert claim_host.status_code == 200

    client.cookies.clear()
    _register(client, "other")
    client.post("/api/rooms/join", json={"code": code})
    conflict = client.post(
        f"/api/rooms/{room_id}/claim",
        json={"seat_index": 0},
    )
    assert conflict.status_code == 409


def test_cannot_claim_two_seats(client: TestClient) -> None:
    _register(client, "host")
    created = client.post("/api/rooms", json={"player_count": 5})
    room_id = created.json()["room_id"]
    first = client.post(f"/api/rooms/{room_id}/claim", json={"seat_index": 0})
    assert first.status_code == 200
    second = client.post(f"/api/rooms/{room_id}/claim", json={"seat_index": 1})
    assert second.status_code == 400


def test_claim_idempotent_same_seat(client: TestClient) -> None:
    user = _register(client, "host", "Hosty")
    created = client.post("/api/rooms", json={"player_count": 5})
    room_id = created.json()["room_id"]
    first = client.post(f"/api/rooms/{room_id}/claim", json={"seat_index": 1})
    second = client.post(f"/api/rooms/{room_id}/claim", json={"seat_index": 1})
    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["seats"][1]["user_id"] == user["id"]


def _fill_five_seat_room(client: TestClient) -> tuple[str, str, list[dict]]:
    """Host creates a 5-seat room; five users join and claim seats 0–4.

    Returns (room_id, host_password_username_cookie_client_state, users).
    Caller ends logged in as host.
    """
    users: list[dict] = []
    host = _register(client, "host0", "Host0")
    users.append(host)
    created = client.post("/api/rooms", json={"player_count": 5})
    assert created.status_code == 201, created.text
    room = created.json()
    room_id = room["room_id"]
    code = room["join_code"]

    claim = client.post(f"/api/rooms/{room_id}/claim", json={"seat_index": 0})
    assert claim.status_code == 200, claim.text

    for i in range(1, 5):
        client.cookies.clear()
        user = _register(client, f"p{i}user", f"Player{i}")
        users.append(user)
        joined = client.post("/api/rooms/join", json={"code": code})
        assert joined.status_code == 200, joined.text
        claimed = client.post(
            f"/api/rooms/{room_id}/claim",
            json={"seat_index": i},
        )
        assert claimed.status_code == 200, claimed.text

    client.cookies.clear()
    login = client.post(
        "/api/auth/login",
        json={"username": "host0", "password": "secret1"},
    )
    assert login.status_code == 200
    return room_id, code, users


def test_start_rejected_if_seat_empty(client: TestClient) -> None:
    _register(client, "host")
    created = client.post("/api/rooms", json={"player_count": 5})
    room_id = created.json()["room_id"]
    client.post(f"/api/rooms/{room_id}/claim", json={"seat_index": 0})
    res = client.post(f"/api/rooms/{room_id}/start", json={})
    assert res.status_code == 400
    assert "claimed" in res.json()["detail"].lower()


def test_start_only_host(client: TestClient) -> None:
    room_id, code, _users = _fill_five_seat_room(client)
    client.cookies.clear()
    login = client.post(
        "/api/auth/login",
        json={"username": "p1user", "password": "secret1"},
    )
    assert login.status_code == 200
    res = client.post(f"/api/rooms/{room_id}/start", json={})
    assert res.status_code == 403


def test_host_start_returns_view_without_role_reveal(client: TestClient) -> None:
    room_id, _code, users = _fill_five_seat_room(client)
    res = client.post(f"/api/rooms/{room_id}/start", json={"seed": 7})
    assert res.status_code == 200, res.text
    body = res.json()
    assert set(body.keys()) == {"game_id", "view"}
    assert "role_reveal" not in body
    assert body["game_id"]
    assert body["view"]["game_id"] == body["game_id"]
    assert len(body["view"]["players"]) == 5

    room_get = client.get(f"/api/rooms/{room_id}")
    assert room_get.status_code == 200
    assert room_get.json()["game_id"] == body["game_id"]

    session = game_store.get(body["game_id"])
    assert session is not None
    assert session.user_id_by_player_id is not None
    assert len(session.user_id_by_player_id) == 5
    bound_users = set(session.user_id_by_player_id.values())
    assert bound_users == {u["id"] for u in users}

    # Local create path still returns role_reveal without cookie.
    client.cookies.clear()
    local = client.post(
        "/api/games",
        json={
            "player_count": 5,
            "player_names": ["A", "B", "C", "D", "E"],
            "seed": 1,
        },
    )
    assert local.status_code == 200
    assert "role_reveal" in local.json()
    assert len(local.json()["role_reveal"]) == 5
