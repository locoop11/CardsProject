# Knowledge summary

Secret Cards = social deduction game with **v1 pass-and-play** and **v2 multi-device rooms**, behind a login-first shell. **Python engine** owns rules; **FastAPI** transports auth (SQLite), rooms (memory), and games (memory + optional seat bindings); **React/Vite** is the UI. Flow: `frontend` → `api` → `secret_cards` → `cards` (never reverse). Auth/rooms are platform — not game domain.

## Stack & runtime

- Engine/API: Python, FastAPI, Pydantic, Uvicorn `:8000`, bcrypt
- Accounts: SQLite `users` / `sessions`; cookie `session_id`
- Games + rooms: process-local only — restart clears play/lobbies; accounts persist
- UI: React 19, TypeScript, Vite `:5173` (`credentials: 'include'`)
- Tests: pytest (game, auth, rooms, Option A privacy, seat layout); oxlint

## Backend ownership

- `cards/`: generic piles/tables
- `secret_cards/`: `GameState`, roles, laws (11 black / 6 red), engine, privacy views
- `api/`: game routes + dual-mode `authz`; auth layered repository; `rooms/` lobby; `GameSession.user_id_by_player_id` (`None` = local)

## API (essentials)

**Auth:** register/login/logout/me/PATCH — cookie session; password min 6; `409` duplicates; `401` bad login.

**Rooms (session required):** create / join-by-code / get / claim seat / host start → `{game_id, view}` **no** `role_reveal`.

**Games:** local `POST /api/games` still cookie-optional with full `role_reveal`. Bound games: cookie + bound seat for role/hand/nominate/vote/resolve/discard/enact; else `401`/`403`. Public `GET` board stays open. `ActionResponse.hand` only for proven office holder when bound.

## Frontend ownership

Steps: **login** → hub/account → **settings (v1)** or **onlineLobby (v2)** → gameplay. Guest → v1 only. Catalog: v1 + v2 available. Online: resolve own seat, poll ~1.5s, self-only actions. `seatLayout.rotatePlayersForViewer` bottom-anchors “me” (display-only). `cardSkin` account-persisted when signed in.

## Game rules (compressed)

- 5–10 players; communist / fascist / hitler; fixed distribution
- Nominate → vote (missing = Nein; strict Ja majority; online president may force resolve) → Hitler check if ≥3 blacks else draw 3 → president discard → chancellor enact → advance
- Exhausted nominees → top-deck auto-enact
- Wins: 5 reds; 6 blacks; Hitler chancellor with ≥3 blacks

## Patterns agents must respect

- Rules in `secret_cards.engine.*` only
- Option A: do not lock local games behind auth; do not leak other seats’ secrets
- Auth: no SQL in service/routes; no HTTP in repository
- Rooms: ephemeral; bindings on game session
- `cards` must not import `secret_cards`
- Card UI: resolve helpers only; seat rotation never authoritative on the wire
- Contracts: `api-contracts.md`; maps: `backend-map.md` / `frontend-map.md`; rationale: `decisions.md`; backlog: `plans/` (`04`+)
