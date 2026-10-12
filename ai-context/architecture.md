# Architecture

## Purpose

Secret Cards is a local **pass-and-play** social deduction game: a Python rules engine, a thin HTTP API, and a React UI. Players share one screen for v1; the device is passed for role reveal, voting, and legislative choices.

The app shell is **login-first**. Users sign in (or explicitly choose **Play as guest**). Guests play v1 only. Signed-in users land on a **Games hub** and pick a mode (v1 playable today; v2 listed as coming soon).

## Technology stack

| Layer | Tech |
|-------|------|
| Game rules / state | Python 3, dataclasses, enums |
| Generic card primitives | `cards/` package |
| HTTP transport | FastAPI + Pydantic, Uvicorn (`:8000`) |
| Accounts persistence | SQLite (`users`, `sessions`); path `data/secret_cards.db` or `SECRET_CARDS_DB` |
| Password hashing | bcrypt |
| Game session persistence | None — in-process memory only |
| UI | React 19 + TypeScript, Vite 8 (`:5173`) |
| Tests | pytest (engine + API + auth); oxlint on frontend |

## Structural layers

Dependency direction is strictly one-way for the game stack:

```
frontend  →  api  →  secret_cards  →  cards
```

Platform (shared) vs game:

| Kind | Location | Owns |
|------|----------|------|
| Platform | `api/auth/`, `api/db.py`; frontend shell (`Login`, `GamesHub`, `Account`) | Identity, cookies, hub catalog |
| Game domain | `secret_cards/` | Rules, phases, wins |
| Card primitives | `cards/` | Piles/tables; no game rules |
| Game HTTP | `api/routes.py` | Thin: validate → engine → JSON |
| Game UI | v1 settings + gameplay screens | Pass-and-play flow |

- **`cards/`** — reusable card/pile/table primitives. Must never import `secret_cards`.
- **`secret_cards/`** — full game domain: model, roles, law deck, engine actions, privacy views.
- **`api/`** — FastAPI app: game routes + in-memory game store; auth routes + SQLite accounts. Auth must not live in `secret_cards`.
- **`frontend/`** — login-first shell, hub, account, and v1 pass-and-play UX. Calls `/api/*` via Vite proxy.

## Communication model

1. Browser talks to Vite; Vite proxies `/api` and `/health` to `http://127.0.0.1:8000`.
2. API CORS allows localhost Vite ports (`5173`, `4173`) with **`allow_credentials=True`** (cookie sessions).
3. Auth: HttpOnly cookie `session_id` (SameSite=lax, 30-day TTL). Frontend `fetch` uses `credentials: 'include'`.
4. Game contract: JSON over HTTP. Mutating game routes return an `ActionResponse` envelope (`view` + optional `hand` / `votes` / `enacted`).
5. **`/api/games*` stay cookie-optional** so guest v1 and existing game tests work without auth.
6. **Privacy boundary:** clients never receive raw `GameState`. Public views omit roles, deck order, and hands. Legislative hands are viewer-scoped. Pass-and-play gets a one-shot `role_reveal` list at create time; per-player role fetch exists for a future multi-device path.

## Runtime topology

- Uvicorn lifespan calls `init_db()` once (creates `users` / `sessions` if missing).
- One Uvicorn process holds all **games** in `api.session.store` (dict keyed by 12-char hex `game_id`). Restart clears games; accounts survive in SQLite.
- Frontend owns UI step state; engine owns authoritative game phase and rules.

## Scalability / constraints (as built)

- Designed for **local** play and local accounts, not online multiplayer rooms yet.
- Game state is not multi-worker safe and does not survive API restart.
- Accounts use a single SQLite file; suitable for local/dev, not a scaled multi-instance store without further work.
- Shuffle uses Python’s PRNG (injectable for tests); not crypto-secure.
- Player count fixed at 5–10.
