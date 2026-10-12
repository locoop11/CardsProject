"""Option A privacy: bound games enforce seat authz; local path stays open."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.app import app
from api.db import init_db
from api.rooms.store import store as room_store
from api.session import store as game_store


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db_file = tmp_path / "privacy_test.db"
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


def _start_bound_five(client: TestClient) -> tuple[str, dict[str, str], list[dict]]:
    """Start a 5-player bound game. Returns game_id, player_id→username, users.

    Leaves client logged in as host0.
    """
    users: list[dict] = []
    host = _register(client, "host0", "Host0")
    users.append(host)
    created = client.post("/api/rooms", json={"player_count": 5})
    assert created.status_code == 201, created.text
    room_id = created.json()["room_id"]
    code = created.json()["join_code"]
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
    started = client.post(f"/api/rooms/{room_id}/start", json={"seed": 11})
    assert started.status_code == 200, started.text
    game_id = started.json()["game_id"]
    session = game_store.get(game_id)
    assert session is not None and session.user_id_by_player_id is not None

    id_to_username = {
        host["id"]: "host0",
        **{users[i]["id"]: f"u{i}" for i in range(1, 5)},
    }
    player_to_username = {
        pid: id_to_username[uid]
        for pid, uid in session.user_id_by_player_id.items()
    }
    return game_id, player_to_username, users


def test_local_role_and_mutate_still_work_without_cookie(client: TestClient) -> None:
    created = client.post(
        "/api/games",
        json={
            "player_count": 5,
            "player_names": ["A", "B", "C", "D", "E"],
            "seed": 1,
        },
    )
    assert created.status_code == 200
    assert "role_reveal" in created.json()
    gid = created.json()["game_id"]
    pid = created.json()["role_reveal"][0]["id"]
    role = client.get(f"/api/games/{gid}/role/{pid}")
    assert role.status_code == 200
    president = created.json()["view"]["president_id"]
    eligible = created.json()["view"]["eligible_chancellor_ids"][0]
    nom = client.post(
        f"/api/games/{gid}/nominate",
        json={"nominee_id": eligible},
    )
    assert nom.status_code == 200, nom.text
    assert president  # local path did not require cookie


def test_bound_role_requires_auth(client: TestClient) -> None:
    game_id, player_to_username, _users = _start_bound_five(client)
    some_pid = next(iter(player_to_username))
    client.cookies.clear()
    res = client.get(f"/api/games/{game_id}/role/{some_pid}")
    assert res.status_code == 401


def test_user_cannot_read_another_seat_role(client: TestClient) -> None:
    game_id, player_to_username, _users = _start_bound_five(client)
    items = list(player_to_username.items())
    pid_a, user_a = items[0]
    pid_b, _user_b = items[1]
    _login(client, user_a)
    own = client.get(f"/api/games/{game_id}/role/{pid_a}")
    assert own.status_code == 200
    other = client.get(f"/api/games/{game_id}/role/{pid_b}")
    assert other.status_code == 403


def test_user_cannot_fetch_hand_as_another_viewer(client: TestClient) -> None:
    game_id, player_to_username, _users = _start_bound_five(client)
    items = list(player_to_username.items())
    pid_a, user_a = items[0]
    pid_b, _user_b = items[1]
    _login(client, user_a)
    # Even claiming the other seat as viewer_id must 403 before office check.
    res = client.get(f"/api/games/{game_id}/hand", params={"viewer_id": pid_b})
    assert res.status_code == 403
    # Own seat but not office holder → still 403 from legislative_hand.
    own = client.get(f"/api/games/{game_id}/hand", params={"viewer_id": pid_a})
    assert own.status_code == 403


def test_user_cannot_vote_as_another_player(client: TestClient) -> None:
    game_id, player_to_username, _users = _start_bound_five(client)
    view = client.get(f"/api/games/{game_id}").json()
    president_id = view["president_id"]
    president_user = player_to_username[president_id]
    nominee = view["eligible_chancellor_ids"][0]
    _login(client, president_user)
    assert (
        client.post(
            f"/api/games/{game_id}/nominate",
            json={"nominee_id": nominee},
        ).status_code
        == 200
    )

    voter_pid = next(pid for pid in player_to_username if pid != president_id)
    # President tries to cast a vote as someone else.
    bad = client.post(
        f"/api/games/{game_id}/vote",
        json={"player_id": voter_pid, "vote": True},
    )
    assert bad.status_code == 403


def test_non_president_cannot_resolve_votes(client: TestClient) -> None:
    game_id, player_to_username, _users = _start_bound_five(client)
    view = client.get(f"/api/games/{game_id}").json()
    president_id = view["president_id"]
    president_user = player_to_username[president_id]
    nominee = view["eligible_chancellor_ids"][0]
    _login(client, president_user)
    assert (
        client.post(
            f"/api/games/{game_id}/nominate",
            json={"nominee_id": nominee},
        ).status_code
        == 200
    )

    other_pid = next(pid for pid in player_to_username if pid != president_id)
    other_user = player_to_username[other_pid]
    _login(client, other_user)
    res = client.post(f"/api/games/{game_id}/resolve-votes")
    assert res.status_code == 403


def test_non_president_cannot_nominate(client: TestClient) -> None:
    game_id, player_to_username, _users = _start_bound_five(client)
    view = client.get(f"/api/games/{game_id}").json()
    president_id = view["president_id"]
    other_pid = next(pid for pid in player_to_username if pid != president_id)
    other_user = player_to_username[other_pid]
    nominee = view["eligible_chancellor_ids"][0]
    _login(client, other_user)
    res = client.post(
        f"/api/games/{game_id}/nominate",
        json={"nominee_id": nominee},
    )
    assert res.status_code == 403
