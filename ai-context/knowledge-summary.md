# Knowledge summary

Secret Cards = social deduction with **v1 pass-and-play**, **v2 multi-device rooms**, and **v3 hybrid** (shared table projector + phone seats), behind a login-first shell. **Python engine** owns rules; **FastAPI** transports auth/skins (SQLite), rooms (memory), and games (memory + optional seat bindings); **React/Vite** is the UI. Flow: `frontend` → `api` → `secret_cards` → `cards` (never reverse). Auth/skins/rooms are platform — not game domain.

## Stack & runtime

- Engine/API: Python, FastAPI, Pydantic, Uvicorn `:8000`, bcrypt
- Accounts + skins: SQLite `users` / `sessions` / `skin_packs` / `user_skin_packs` / `user_equip`; cookie `session_id`
- Games + rooms: process-local only (incl. `table_display_user_ids`) — restart clears play/lobbies; accounts + skin metadata persist
- UI: React 19, TypeScript, Vite `:5173` (`credentials: 'include'`)
- Tests: pytest (game, auth, skins, rooms, Option A, table display, seat layout); oxlint

## Backend ownership

- `cards/`: generic piles/tables
- `secret_cards/`: `GameState`, roles, laws (11 black / 6 red), engine, privacy views
- `api/`: game routes + dual-mode `authz`; auth + `skins/` repositories; `rooms/` lobby + table attach; `GameSession.user_id_by_player_id` (`None` = local)

## API (essentials)

**Auth:** register/login/logout/me/PATCH — cookie session; password min 6; register grants starter packs `default` + `party`.

**Skins:** `GET /api/skins/packs`, `GET /api/skins/me`, `PATCH /api/skins/equip`, `GET /api/skins/games/{id}/seats` (bound only; no roles). `User.card_skin` = table preset.

**Rooms (session required):** create / join (player) / **join-table** / attach|detach `…/table` / get / claim / host start → `{game_id, view}` **no** `role_reveal`. `RoomOut` includes `table_attached` + `table_display_count`. Table ≠ seat; join-table allowed after start.

**Games:** local create cookie-optional + full `role_reveal`. Bound: cookie + seat for secrets/actors. Table display: public `GET` OK; role/hand/actors `403`. `ActionResponse.hand` only for proven office holder when bound.

## Frontend ownership

Steps: **login** → hub/account → **settings (v1)** | **onlineLobby (v2/v3)** | **tableDisplay (v3)** → gameplay. Guest → v1 only. Catalog: v1 + v2 + v3 available. Players: resolve seat, poll, self-only actions, seat equips. Table: public board poll only. `seatLayout` bottom-anchors “me” on phones. Account equips Hitler/role; laws/backs = table preset.

## Game rules (compressed)

- 5–10 players; communist / fascist / hitler; fixed distribution
- Nominate → vote (missing = Nein; strict Ja majority; online president may force resolve) → Hitler check if ≥3 blacks else draw 3 → president discard → chancellor enact → advance
- Exhausted nominees → top-deck auto-enact
- Wins: 5 reds; 6 blacks; Hitler chancellor with ≥3 blacks

## Patterns agents must respect

- Rules in `secret_cards.engine.*` only
- Option A: do not lock local games behind auth; do not leak other seats’ secrets; table display is not a seat and gets no secrets
- Auth / skins: no SQL in service/routes; no HTTP in repository
- Rooms: ephemeral; seat bindings on game session; table ids separate
- `cards` must not import `secret_cards`
- Card UI: resolve helpers only; seat rotation never authoritative on the wire; laws/backs = table preset
- Contracts: `api-contracts.md`; maps: `backend-map.md` / `frontend-map.md`; rationale: `decisions.md`; backlog: `plans/` (`04` and `05` implemented but open pending human verify; then `06`)
