# Architecture

## Purpose

Secret Cards is a social deduction game with a Python rules engine, a thin HTTP API, and a React UI.

- **v1 — pass-and-play:** one shared device; roles revealed in turn; guests or accounts.
- **v2 — multi-device:** each signed-in player on their own device; seat-bound secrets (Option A).

The app shell is **login-first**. Guests play **v1 only**. Signed-in users land on a **Games hub** and pick v1 or v2.

## Technology stack

| Layer | Tech |
|-------|------|
| Game rules / state | Python 3, dataclasses, enums |
| Generic card primitives | `cards/` package |
| HTTP transport | FastAPI + Pydantic, Uvicorn (`:8000`) |
| Accounts persistence | SQLite (`users`, `sessions`); path `data/secret_cards.db` or `SECRET_CARDS_DB` |
| Password hashing | bcrypt |
| Games + rooms | Process-local memory only (no durable game/room DB) |
| UI | React 19 + TypeScript, Vite 8 (`:5173`) |
| Tests | pytest (engine + API + auth + rooms + privacy + seat layout); oxlint on frontend |

## Structural layers

Dependency direction is strictly one-way for the game stack:

```
frontend  →  api  →  secret_cards  →  cards
```

Platform (shared) vs game:

| Kind | Location | Owns |
|------|----------|------|
| Platform | `api/auth/`, `api/db.py`; frontend shell (`Login`, `GamesHub`, `Account`) | Identity, cookies, hub catalog |
| Lobby (ephemeral) | `api/rooms/`, `api/authz.py` | Room create/join/claim/start; seat-binding checks |
| Game domain | `secret_cards/` | Rules, phases, wins |
| Card primitives | `cards/` | Piles/tables; no game rules |
| Game HTTP | `api/routes.py`, `api/session.py` | Thin transport + dual-mode authz |
| Game UI | v1 settings + gameplay; online lobby + online gameplay | Pass-and-play and multi-device flows |

- **`cards/`** — reusable primitives. Must never import `secret_cards`.
- **`secret_cards/`** — full game domain. No HTTP, accounts, or rooms.
- **`api/`** — FastAPI: auth (SQLite), rooms (memory), games (memory + optional seat bindings).
- **`frontend/`** — login-first shell, hub, v1 and v2 UX. Calls `/api/*` via Vite proxy.

## Communication model

1. Browser ↔ Vite; Vite proxies `/api` and `/health` to `http://127.0.0.1:8000`.
2. CORS allows localhost Vite ports with **`allow_credentials=True`**.
3. Auth: HttpOnly cookie `session_id` (SameSite=lax, 30-day TTL). Frontend `fetch` uses `credentials: 'include'`.
4. Game contract: JSON over HTTP. Mutating game routes return `ActionResponse` (`view` + optional `hand` / `votes` / `enacted`).
5. **Dual auth mode on `/api/games*`:**
   - **Local** (`user_id_by_player_id is None`): cookie-optional — guest v1 and pytest.
   - **Bound** (multi-device start): cookie required for secrets and actor mutations; seat must match or `403`.
6. **Rooms** (`/api/rooms*`): session required; host/join/claim/start. Start returns `game_id` + `view` only (**no** full `role_reveal`).
7. **Privacy:** never raw `GameState`. Public views omit roles/deck/hands. Bound clients get only their seat’s role (and hand when office holder). Local create still returns pass-and-play `role_reveal`.

## Runtime topology

- Uvicorn lifespan calls `init_db()` (accounts tables).
- Process holds **games** (`api.session.store`) and **rooms** (`api.rooms.store`). Restart clears both; accounts survive in SQLite.
- Bound games attach `player_id → user_id` on the in-memory `GameSession` for the game’s lifetime.
- Frontend owns UI step state; engine owns authoritative phase and rules.

## Scalability / constraints (as built)

- Local/dev multi-browser is enough to prove Option A; not a multi-worker or durable lobby product.
- Game and room state do not survive API restart and are not shared across workers.
- Accounts use a single SQLite file.
- Shuffle uses Python’s PRNG (injectable for tests); not crypto-secure.
- Player count fixed at 5–10.
