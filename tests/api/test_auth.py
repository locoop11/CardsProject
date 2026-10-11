"""API integration tests for local account authentication."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.app import app
from api.db import init_db
from api.session import store


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """Isolated SQLite DB per test; cookies enabled on the client."""
    db_file = tmp_path / "auth_test.db"
    monkeypatch.setenv("SECRET_CARDS_DB", str(db_file))
    init_db()
    store._games.clear()
    with TestClient(app) as test_client:
        yield test_client


def _profile_keys() -> set[str]:
    return {"id", "username", "email", "display_name", "card_skin"}


def test_register_sets_session_cookie_and_returns_profile(client: TestClient) -> None:
    res = client.post(
        "/api/auth/register",
        json={"username": "ada", "password": "secret1", "display_name": "Ada"},
    )
    assert res.status_code == 201, res.text
    assert "session_id" in res.cookies
    body = res.json()
    assert set(body.keys()) == _profile_keys()
    assert body["username"] == "ada"
    assert body["email"] is None
    assert body["display_name"] == "Ada"
    assert body["card_skin"] == "default"
    assert "password" not in body
    assert "password_hash" not in body


def test_register_requires_username_or_email(client: TestClient) -> None:
    res = client.post(
        "/api/auth/register",
        json={"password": "secret1"},
    )
    assert res.status_code == 400
    assert "detail" in res.json()


def test_register_rejects_short_password(client: TestClient) -> None:
    res = client.post(
        "/api/auth/register",
        json={"username": "bob", "password": "12345"},
    )
    assert res.status_code == 400
    assert "detail" in res.json()


def test_register_duplicate_username_returns_409(client: TestClient) -> None:
    first = client.post(
        "/api/auth/register",
        json={"username": "ada", "password": "secret1"},
    )
    assert first.status_code == 201
    # Fresh client jar would still hit the same DB; clear cookies for a clean register try.
    client.cookies.clear()
    second = client.post(
        "/api/auth/register",
        json={"username": "ada", "password": "secret2"},
    )
    assert second.status_code == 409
    assert "detail" in second.json()


def test_username_is_case_insensitive_for_register_and_login(
    client: TestClient,
) -> None:
    first = client.post(
        "/api/auth/register",
        json={"username": "Ada", "password": "secret1"},
    )
    assert first.status_code == 201
    assert first.json()["username"] == "ada"

    client.cookies.clear()
    dup = client.post(
        "/api/auth/register",
        json={"username": "ADA", "password": "secret2"},
    )
    assert dup.status_code == 409

    login = client.post(
        "/api/auth/login",
        json={"username": "ADA", "password": "secret1"},
    )
    assert login.status_code == 200
    assert login.json()["username"] == "ada"


def test_register_duplicate_email_returns_409(client: TestClient) -> None:
    first = client.post(
        "/api/auth/register",
        json={"email": "ada@example.com", "password": "secret1"},
    )
    assert first.status_code == 201
    client.cookies.clear()
    second = client.post(
        "/api/auth/register",
        json={"email": "Ada@example.com", "password": "secret2"},
    )
    assert second.status_code == 409


def test_login_success_and_me(client: TestClient) -> None:
    reg = client.post(
        "/api/auth/register",
        json={"username": "ada", "email": "ada@example.com", "password": "secret1"},
    )
    assert reg.status_code == 201
    client.cookies.clear()

    me_anon = client.get("/api/auth/me")
    assert me_anon.status_code == 401

    bad = client.post(
        "/api/auth/login",
        json={"username": "ada", "password": "wrongxx"},
    )
    assert bad.status_code == 401
    assert bad.json()["detail"] == "Invalid credentials"

    ok = client.post(
        "/api/auth/login",
        json={"username": "ada", "password": "secret1"},
    )
    assert ok.status_code == 200, ok.text
    assert "session_id" in ok.cookies
    assert ok.json()["username"] == "ada"

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "ada@example.com"


def test_login_by_email(client: TestClient) -> None:
    client.post(
        "/api/auth/register",
        json={"email": "ada@example.com", "password": "secret1"},
    )
    client.cookies.clear()
    res = client.post(
        "/api/auth/login",
        json={"email": "ada@example.com", "password": "secret1"},
    )
    assert res.status_code == 200
    assert res.json()["email"] == "ada@example.com"


def test_patch_me_updates_display_name_and_card_skin(client: TestClient) -> None:
    client.post(
        "/api/auth/register",
        json={"username": "ada", "password": "secret1"},
    )
    res = client.patch(
        "/api/auth/me",
        json={"display_name": "Ada L", "card_skin": "party"},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["display_name"] == "Ada L"
    assert body["card_skin"] == "party"

    me = client.get("/api/auth/me")
    assert me.json()["card_skin"] == "party"


def test_patch_me_rejects_unknown_card_skin(client: TestClient) -> None:
    client.post(
        "/api/auth/register",
        json={"username": "ada", "password": "secret1"},
    )
    res = client.patch("/api/auth/me", json={"card_skin": "nope"})
    assert res.status_code == 400


def test_logout_clears_session(client: TestClient) -> None:
    client.post(
        "/api/auth/register",
        json={"username": "ada", "password": "secret1"},
    )
    assert client.get("/api/auth/me").status_code == 200

    out = client.post("/api/auth/logout")
    assert out.status_code == 204

    assert client.get("/api/auth/me").status_code == 401


def test_logout_without_session_returns_401(client: TestClient) -> None:
    res = client.post("/api/auth/logout")
    assert res.status_code == 401


def test_create_game_still_works_without_auth_cookie(client: TestClient) -> None:
    """Game mutating routes stay unauthenticated in this phase."""
    client.cookies.clear()
    res = client.post(
        "/api/games",
        json={
            "player_count": 5,
            "player_names": ["A", "B", "C", "D", "E"],
            "seed": 1,
        },
    )
    assert res.status_code == 200, res.text
    assert "game_id" in res.json()
