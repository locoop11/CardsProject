# System patterns

## Layer separation

- **`cards` ← `secret_cards` ← `api` ← `frontend`**. Never reverse for the game stack.
- Generic card code has zero game knowledge; enforced by AST import test.
- HTTP game layer is transport only: validate request shapes, call engine, map errors to status codes, serialize views.
- **Platform auth** is separate from game domain: `api/auth/` + `api/db.py` never belong in `secret_cards/`.

## Auth persistence layering

```
routes / deps  →  service (+ passwords)  →  repository  →  db
```

- Routes/deps own cookies, status codes, Pydantic DTOs.
- Service owns register/login/profile rules, normalization, TTL, skin allow-list — **no SQL**.
- Repository owns SQL and row mapping — **no FastAPI / cookies**.
- `db.py` owns connect, schema DDL, path/env, shared skin constants — **no use-cases**.

## Engine pattern

- **Mutable `GameState` in place.** Engine functions take `state`, mutate it, return the same object.
- **Phase gates.** Wrong phase → `InvalidPhaseError` (API → 400).
- **Action log.** Every meaningful mutation calls `record_action` for future replay/persistence (not exposed on public views today).
- **Injectable RNG.** `random.Random` (often seeded) passed into start/shuffle/return paths for deterministic tests.

## Privacy / view pattern

- Never ship raw `GameState` to clients.
- `public_view` = board + phase safe for the whole table.
- `legislative_hand(viewer_id)` returns cards only for the current office holder; else `None` → API 403.
- Pass-and-play `role_reveal_in_entry_order` is intentionally separate from seat order after shuffle.

## API pattern

- Pydantic models in `api/schemas.py` define the wire contract (game + auth).
- Mutating game routes return `ActionResponse` (`view` + optional extras).
- `EngineError` → HTTP 400 with `detail=str(exc)`.
- Auth domain errors → `400` / `401` / `409` as contracted.
- Game sessions: UUID hex truncated to 12 chars in process memory.
- Auth sessions: SQLite row id = cookie `session_id`; game routes stay cookie-optional.

## Frontend patterns

- **Step machine in `App`**, not a router — login-first shell then linear v1 pass-and-play.
- **Guest vs account** is local `playMode` only; no guest API user.
- **Games hub** is data-driven (`gameCatalog.ts`); do not hardcode shell rewrites per new game.
- **Settings panels** (`hub` \| `names` \| `skin`) nest under the `settings` step; gameplay steps stay flat.
- **Whole-table `cardSkin`** held in `App` and passed as props; not part of `PublicView`. Accounts persist via `PATCH /api/auth/me`.
- **Card art resolve helpers only** (`resolveHitler` / `resolveRole` / `resolveLaw` / `cardBackSrc`) — screens must not branch on pack file layout.
- **All `fetch` uses `credentials: 'include'`** for cookie auth.
- **`mergeView`** after every successful action so roles/per-seat skins survive public-view updates.
- Confirm overlays before irreversible votes / discards / enacts.
- Device-pass UX: face-down cards and timed voting windows (`SECONDS_PER_VOTER`).

## Naming

- Python: snake_case modules/functions; enums as `str, Enum` with lowercase values matching JSON.
- Player ids: `p0` … `pN-1` after seat shuffle at start.
- TypeScript: camelCase in UI session; snake_case on wire DTOs matching API.

## Testing conventions

| Area | Location | Style |
|------|----------|--------|
| Card primitives | `tests/cards/` | Unit + boundary import guard |
| Engine rules | `tests/secret_cards/` | Unit per phase + `test_full_game_simulations.py` |
| Game HTTP | `tests/api/test_api.py` | FastAPI client; no auth cookie required |
| Auth HTTP | `tests/api/test_auth.py` | Cookie sessions, profile, guest game path |
| Frontend | oxlint via `npm run lint`; no automated UI test suite in-repo yet |

Prefer seeded `Random` for deck/role order in engine tests. Auth tests use isolated DB via `SECRET_CARDS_DB` where configured by fixtures.
