"""Ownership grant, equip rules, and profile/seat skin payloads."""

from __future__ import annotations

import sqlite3

import pytest
from fastapi.testclient import TestClient

from api.app import app
from api.auth.passwords import hash_password
from api.auth.repository import insert_user, transaction
from api.db import db_path, init_db
from api.session import store as game_store
from api.skins.repository import list_owned_packs
from secret_cards import Settings, start_game


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db_file = tmp_path / "skins_test.db"
    monkeypatch.setenv("SECRET_CARDS_DB", str(db_file))
    init_db()
    game_store._games.clear()
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


def _owned_codes(body: dict) -> set[str]:
    return {pack["code"] for pack in body["owned_packs"]}


def _pack_id(body: dict, code: str) -> str:
    for pack in body["owned_packs"]:
        if pack["code"] == code:
            return pack["id"]
    raise AssertionError(f"missing owned pack {code}")


def _assert_no_role_fields(payload: object) -> None:
    if isinstance(payload, dict):
        assert "role" not in payload
        assert "team" not in payload
        assert "user_id" not in payload
        for value in payload.values():
            _assert_no_role_fields(value)
    elif isinstance(payload, list):
        for value in payload:
            _assert_no_role_fields(value)


def test_register_grants_starter_packs_without_changing_profile_shape(
    client: TestClient,
) -> None:
    registered = _register(client, "ada", "Ada")
    assert set(registered.keys()) == {
        "id",
        "username",
        "email",
        "display_name",
        "card_skin",
    }
    assert registered["card_skin"] == "default"

    me = client.get("/api/skins/me")
    assert me.status_code == 200, me.text
    body = me.json()
    assert set(body.keys()) == {"owned_packs", "equip"}
    assert _owned_codes(body) == {"default", "party"}
    assert body["equip"] == {
        "hitler_pack_id": None,
        "role_pack_id": None,
        "hitler_pack_code": None,
        "role_pack_code": None,
    }
    for pack in body["owned_packs"]:
        assert set(pack.keys()) == {"id", "code", "title", "description"}
        assert pack["id"]
        assert pack["code"] in {"default", "party"}


def test_skins_me_requires_session(client: TestClient) -> None:
    res = client.get("/api/skins/me")
    assert res.status_code == 401


def test_pack_catalog_is_available_without_a_session(client: TestClient) -> None:
    res = client.get("/api/skins/packs")
    assert res.status_code == 200, res.text
    codes = {pack["code"] for pack in res.json()}
    assert codes == {"default", "party"}


def test_backfill_grants_starter_packs_to_existing_users(client: TestClient) -> None:
    with transaction() as conn:
        insert_user(
            conn,
            user_id="user_old",
            username="old",
            email=None,
            password_hash=hash_password("secret1"),
            display_name="Old",
            card_skin="party",
            created_at="2020-01-01T00:00:00+00:00",
        )
        assert list_owned_packs(conn, "user_old") == []

    init_db()
    client.cookies.clear()
    login = client.post(
        "/api/auth/login",
        json={"username": "old", "password": "secret1"},
    )
    assert login.status_code == 200, login.text
    assert login.json()["card_skin"] == "party"

    me = client.get("/api/skins/me")
    assert me.status_code == 200, me.text
    assert _owned_codes(me.json()) == {"default", "party"}


def test_equip_rejects_unowned_and_unknown_packs(client: TestClient) -> None:
    _register(client, "ada")
    missing = client.patch("/api/skins/equip", json={"hitler_pack_id": "no-such-pack"})
    assert missing.status_code == 400

    empty = client.patch("/api/skins/equip", json={})
    assert empty.status_code == 400

    with transaction() as conn:
        conn.execute(
            """
            INSERT INTO skin_packs (id, code, title, description, active, created_at)
            VALUES ('spk_extra', 'extra', 'Extra', NULL, 1, '2020-01-01T00:00:00+00:00')
            """
        )

    denied = client.patch("/api/skins/equip", json={"role_pack_id": "spk_extra"})
    assert denied.status_code == 403
    assert denied.json()["detail"]

    me = client.get("/api/skins/me")
    assert me.json()["equip"]["hitler_pack_id"] is None
    assert me.json()["equip"]["role_pack_id"] is None


def test_equip_happy_path_and_me_shape(client: TestClient) -> None:
    _register(client, "ada")
    me = client.get("/api/skins/me")
    assert me.status_code == 200
    body = me.json()
    party_id = _pack_id(body, "party")
    default_id = _pack_id(body, "default")

    equipped = client.patch("/api/skins/equip", json={"hitler_pack_id": party_id})
    assert equipped.status_code == 200, equipped.text
    assert equipped.json()["hitler_pack_id"] == party_id
    assert equipped.json()["hitler_pack_code"] == "party"
    assert equipped.json()["role_pack_id"] is None

    both = client.patch(
        "/api/skins/equip",
        json={"hitler_pack_id": default_id, "role_pack_id": party_id},
    )
    assert both.status_code == 200, both.text
    summary = both.json()
    assert summary["hitler_pack_id"] == default_id
    assert summary["hitler_pack_code"] == "default"
    assert summary["role_pack_id"] == party_id
    assert summary["role_pack_code"] == "party"

    again = client.get("/api/skins/me")
    assert again.json()["equip"] == summary
    assert _owned_codes(again.json()) == {"default", "party"}


def test_equip_requires_session(client: TestClient) -> None:
    res = client.patch("/api/skins/equip", json={"hitler_pack_id": "spk_default"})
    assert res.status_code == 401


def test_seat_equips_for_two_accounts_omit_roles(client: TestClient) -> None:
    ada = _register(client, "ada", "Ada")
    ada_me = client.get("/api/skins/me").json()
    ada_party = _pack_id(ada_me, "party")
    ada_default = _pack_id(ada_me, "default")
    equipped = client.patch(
        "/api/skins/equip",
        json={"hitler_pack_id": ada_party, "role_pack_id": ada_default},
    )
    assert equipped.status_code == 200, equipped.text

    client.cookies.clear()
    bob = _register(client, "bob", "Bob")
    bob_me = client.get("/api/skins/me").json()
    bob_party = _pack_id(bob_me, "party")
    bob_default = _pack_id(bob_me, "default")
    equipped = client.patch(
        "/api/skins/equip",
        json={"hitler_pack_id": bob_default, "role_pack_id": bob_party},
    )
    assert equipped.status_code == 200, equipped.text

    state = start_game(
        Settings(player_count=5),
        ["Ada", "Bob", "Cara", "Drew", "Evan"],
    )
    bindings = {
        player.id: ada["id"] if index % 2 == 0 else bob["id"]
        for index, player in enumerate(state.players)
    }
    session = game_store.create(state, user_id_by_player_id=bindings)

    client.cookies.clear()
    outsider = client.get(f"/api/skins/games/{session.game_id}/seats")
    assert outsider.status_code == 401

    login = client.post(
        "/api/auth/login",
        json={"username": "ada", "password": "secret1"},
    )
    assert login.status_code == 200

    res = client.get(f"/api/skins/games/{session.game_id}/seats")
    assert res.status_code == 200, res.text
    payload = res.json()
    _assert_no_role_fields(payload)
    by_id = {seat["player_id"]: seat for seat in payload["seats"]}
    assert set(by_id) == {player.id for player in state.players}
    for index, player in enumerate(state.players):
        seat = by_id[player.id]
        if index % 2 == 0:
            assert seat["hitler_pack_code"] == "party"
            assert seat["role_pack_code"] == "default"
            assert seat["hitler_pack_id"] == ada_party
        else:
            assert seat["hitler_pack_code"] == "default"
            assert seat["role_pack_code"] == "party"
            assert seat["role_pack_id"] == bob_party

    client.cookies.clear()
    _register(client, "outsider")
    forbidden = client.get(f"/api/skins/games/{session.game_id}/seats")
    assert forbidden.status_code == 403


def test_seat_equips_reject_local_and_unknown_games(client: TestClient) -> None:
    _register(client, "ada")
    missing = client.get("/api/skins/games/missing-game/seats")
    assert missing.status_code == 404

    state = start_game(Settings(player_count=5), ["A", "B", "C", "D", "E"])
    local = game_store.create(state)
    res = client.get(f"/api/skins/games/{local.game_id}/seats")
    assert res.status_code == 400


def test_skin_tables_do_not_store_image_blobs(client: TestClient) -> None:
    conn = sqlite3.connect(db_path())
    try:
        rows = conn.execute(
            "SELECT name, sql FROM sqlite_master WHERE type = 'table'"
        ).fetchall()
    finally:
        conn.close()
    sql_by_name = {name: sql or "" for name, sql in rows}
    for name in ("skin_packs", "user_skin_packs", "user_equip"):
        assert name in sql_by_name
        assert "BLOB" not in sql_by_name[name].upper()
    assert "storage_key" not in sql_by_name["skin_packs"]
