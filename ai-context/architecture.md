# Architecture

## Purpose

Secret Cards is a local **pass-and-play** social deduction game: a Python rules engine, a thin HTTP API, and a React single-device UI. Players share one screen; the device is passed for role reveal, voting, and legislative choices.

## Technology stack

| Layer | Tech |
|-------|------|
| Game rules / state | Python 3, dataclasses, enums |
| Generic card primitives | `cards/` package |
| HTTP transport | FastAPI + Pydantic, Uvicorn (`:8000`) |
| UI | React 19 + TypeScript, Vite 8 (`:5173`) |
| Tests | pytest (engine + API); oxlint on frontend |
| Persistence | None — in-process memory only |

## Structural layers

Dependency direction is strictly one-way:

```
frontend  →  api  →  secret_cards  →  cards
```

- **`cards/`** — reusable card/pile/table primitives. No game rules. Must never import `secret_cards`.
- **`secret_cards/`** — full game domain: model, roles, law deck, engine actions, privacy views.
- **`api/`** — FastAPI routes + in-memory session store. Mutates engine state; returns view DTOs only.
- **`frontend/`** — screen flow and pass-and-play UX. Calls `/api/*` via Vite proxy; keeps a client `GameSession` mirrored from `PublicView`.

## Communication model

1. Browser talks to Vite; Vite proxies `/api` and `/health` to `http://127.0.0.1:8000`.
2. API CORS allows localhost Vite ports (`5173`, `4173`).
3. Contract shape: JSON over HTTP. Mutating routes return an `ActionResponse` envelope (`view` + optional `hand` / `votes` / `enacted`).
4. **Privacy boundary:** clients never receive raw `GameState`. Public views omit roles, deck order, and hands. Legislative hands are viewer-scoped. Pass-and-play gets a one-shot `role_reveal` list at create time; per-player role fetch exists for a future multi-device path.

## Runtime topology

- One Uvicorn process holds all games in `api.session.store` (dict keyed by 12-char hex `game_id`).
- Restarting the API clears all sessions.
- Frontend owns UI step state (`settings` → `names` → `roleReveal` → `nomination` ↔ `legislative` → `win`); engine owns authoritative phase and rules.

## Scalability / constraints (as built)

- Designed for **local single-device** play, not online multiplayer.
- No auth, no DB, no multi-worker shared state.
- Shuffle uses Python’s PRNG (injectable for tests); not crypto-secure.
- Player count fixed at 5–10.
