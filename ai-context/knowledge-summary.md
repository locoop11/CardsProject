# Knowledge summary

Secret Cards = local pass-and-play social deduction game plus a login-first app shell. **Python engine** owns rules; **FastAPI** transports games (in-memory) and accounts (SQLite); **React/Vite** is the UI. Dependency flow: `frontend` → `api` → `secret_cards` → `cards` (never reverse). Auth is platform (`api/auth/`, `api/db.py`), not game domain.

## Stack & runtime

- Engine/API: Python, FastAPI, Pydantic, Uvicorn `:8000`, bcrypt
- Accounts: SQLite `users` / `sessions` (`data/secret_cards.db` or `SECRET_CARDS_DB`); cookie `session_id`
- Games: process-local `SessionStore` only — restart clears games; accounts persist
- UI: React 19, TypeScript, Vite `:5173` (proxies `/api`, `/health`; `credentials: 'include'`)
- Tests: pytest (game + auth); frontend lint via oxlint

## Backend ownership

- `cards/`: generic `Card`, `CardPile`, `CardTable`, `DeckProtocol`
- `secret_cards/`: `GameState`, roles, law deck (11 black / 6 red), engine phases, `views` privacy layer
- `api/`: game routes + schemas + ephemeral store; auth routes → service → repository → db

Engine mutates `GameState` in place, logs actions, raises `EngineError` on rule breaks.

## API (essentials)

**Auth:** `POST /api/auth/register|login`, `POST /logout`, `GET|PATCH /me` — cookie session; `UserOut` never includes password hash; password min 6; duplicates `409`; bad login `401`.

**Games (cookie-optional):** `POST /api/games` → `game_id`, `view`, pass-and-play `role_reveal` (name-entry order); `GET` game / role / hand; `POST` nominate, vote, resolve-votes, president-discard, chancellor-enact; `DELETE` game. Envelope: `ActionResponse` with `view` + optional `votes` / `hand` / `enacted`. Never raw `GameState`.

## Frontend ownership

`App` steps: **login** → (**gamesHub** / **account** if signed in) → settings (hub / names / skin) → roleReveal → nomination ↔ legislative → win.  
Guest = local `playMode` → v1 only. Hub catalog: v1 available, v2 coming soon. Whole-table **`cardSkin`** (`default` \| `party`): account-persisted when signed in; client-only for guests. Art via `cardAssets` resolve helpers. `GameSession` mirrors `PublicView`; roles kept via `mergeView`.

## Game rules (compressed)

- 5–10 players; roles communist / fascist / hitler (Hitler = fascist team); fixed distribution table
- Round: nominate → vote (missing = Nein; need strict Ja majority) → on approve: Hitler check if ≥3 blacks else draw 3 → president discard 1 → chancellor enact 1 → advance
- Exhausted eligible nominees → top-deck auto-enact
- Wins: 5 reds → communist; 6 blacks → fascist; Hitler elected chancellor with ≥3 blacks → fascist

## Patterns agents must respect

- Rules live in `secret_cards.engine.*`, not in UI or route handlers
- Auth layering: no SQL in service/routes; no HTTP in repository
- Public data via `views`; hands viewer-scoped
- `cards` must not import `secret_cards`
- Do not lock `/api/games*` behind auth
- Card UI uses resolve helpers only; no pack-shape branching in screens
- Contracts: `api-contracts.md`; maps: `backend-map.md` / `frontend-map.md`; rationale: `decisions.md`; backlog: `plans/`
