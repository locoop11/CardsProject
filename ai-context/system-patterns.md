# System patterns

## Layer separation

- **`cards` ← `secret_cards` ← `api` ← `frontend`**. Never reverse for the game stack.
- Generic card code has zero game knowledge; enforced by AST import test.
- HTTP game layer is transport only: validate, call engine, map errors, serialize views.
- **Platform auth** (`api/auth/`, `api/db.py`), **skins** (`api/skins/`), and **rooms** (`api/rooms/`) never belong in `secret_cards/`.

## Auth persistence layering

```
routes / deps  →  service (+ passwords)  →  repository  →  db
```

- No SQL in service/routes; no HTTP/cookies in repository.
- `db.py` owns connect, schema, path/env, shared skin constants + pack seed/backfill.

## Skins persistence layering

```
routes  →  service  →  repository  →  db
```

Same rules as auth. Ownership and equip live here — not as a JSON list on `User`.

## Rooms layering (ephemeral)

```
routes  →  service  →  store (in-memory)
```

Same separation idea as auth, without SQL. Service owns lobby rules and bound-game creation; store owns dicts only.

## Dual-mode game authz (Option A)

- **Local session** (`user_id_by_player_id is None`): cookie-optional; trusted shared device.
- **Bound session:** `require_user_if_bound` → cookie; then seat checks (`require_bound_seat` / president / chancellor).
- **`ActionResponse.hand`:** local may include office-phase hand; bound only for proven office-holder seat.
- Do **not** add global middleware that locks all `/api/games*`.

## Engine pattern

- **Mutable `GameState` in place.** Functions take `state`, mutate, return same object.
- **Phase gates.** Wrong phase → `InvalidPhaseError` (API → 400).
- **Action log.** Mutations call `record_action` (not on public views).
- **Injectable RNG.** `random.Random` for deterministic tests.

## Privacy / view pattern

- Never ship raw `GameState`.
- `public_view` = table-safe board + phase.
- `legislative_hand(viewer_id)` office-holder only; else API 403.
- Local create: `role_reveal_in_entry_order`. Multi-device start: **no** full reveal; clients fetch own role via authorized GET.

## API pattern

- Pydantic in `api/schemas.py` (game + auth + rooms + skins).
- Mutating game routes return `ActionResponse`.
- `EngineError` → 400; auth/room/skins domain → 400 / 401 / 403 / 409.
- Game + room ids: short hex in process memory.

## Frontend patterns

- **Step machine in `App`**, not a router.
- **Guest vs account** local `playMode`; guests never enter v2 lobby.
- **Games hub** data-driven (`gameCatalog.ts`).
- **Online:** poll public view (~1.5s); act only as `selfPlayerId`; resolve seat via probing role GET; load seat equips once when entering the game.
- **Seat layout:** `rotatePlayersForViewer` is display-only — never send rotated order to the API.
- **Whole-table `cardSkin`** in `App`; accounts PATCH `/me` (laws / backs / fallback).
- **Hitler/role equip** via `/api/skins/*` on Account; guests have no ownership UI.
- **Card art:** resolve helpers only — no pack-shape branching in screens.
- All `fetch` uses `credentials: 'include'`.
- **`mergeView`** preserves client role/skin fields across public updates.

## Naming

- Python: snake_case; enums as `str, Enum` with lowercase JSON values.
- Player ids: `p0` … `pN-1` after seat shuffle at start.
- TypeScript: camelCase in UI session; snake_case on wire DTOs.

## Testing conventions

| Area | Location | Style |
|------|----------|--------|
| Card primitives | `tests/cards/` | Unit + boundary import guard |
| Engine rules | `tests/secret_cards/` | Unit + full-game sims |
| Local game HTTP | `tests/api/test_api.py` | No auth cookie |
| Auth HTTP | `tests/api/test_auth.py` | Cookies + guest game path |
| Skins HTTP | `tests/api/test_skins.py` | Grant, equip deny/happy path, seat equips |
| Rooms / Option A | `tests/api/test_rooms.py`, `test_privacy_option_a.py`, `test_session_bindings.py` | Cross-user denial |
| Seat layout | `tests/frontend/test_seat_layout.py` | Rotation helper |
| Frontend lint | oxlint via `npm run lint` | No full UI e2e suite yet |

Prefer seeded `Random` in engine tests. Auth tests isolate DB via `SECRET_CARDS_DB` when fixtures set it.
