# Knowledge summary

Secret Cards = local pass-and-play social deduction game. **Python engine** owns rules; **FastAPI** is thin transport with in-memory sessions; **React/Vite** is the shared-device UI. Dependency flow: `frontend` → `api` → `secret_cards` → `cards` (never reverse).

## Stack & runtime

- Engine/API: Python, FastAPI, Pydantic, Uvicorn `:8000`
- UI: React 19, TypeScript, Vite `:5173` (proxies `/api`, `/health`)
- Tests: pytest; frontend lint via oxlint
- No DB/auth; restart clears games

## Backend ownership

- `cards/`: generic `Card`, `CardPile`, `CardTable`, `DeckProtocol`
- `secret_cards/`: `GameState`, roles, law deck (11 black / 6 red), engine phases, `views` privacy layer
- `api/`: routes, schemas, `SessionStore` (`game_id` → state)

Engine functions mutate `GameState` in place, log actions, raise `EngineError` on rule breaks.

## API (essentials)

- `POST /api/games` → `game_id`, `view`, pass-and-play `role_reveal` (name-entry order)
- `GET` game / role / hand (`viewer_id`; else 403)
- `POST` nominate, vote, resolve-votes, president-discard, chancellor-enact
- `DELETE` game
- Envelope: `ActionResponse` with `view` + optional `votes` / `hand` / `enacted`
- Never raw `GameState` on the wire

## Frontend ownership

`App` steps: **settings** (hub / names / skin panels) → roleReveal → nomination ↔ legislative → win.  
Start game from the hub. Whole-table **`cardSkin`** (`default` \| `party`) is client-only and passed into screens. Art via `cardAssets` catalogs (Hitler / role / law); party generic back matches classic `default/back.png`.  
`GameSession` mirrors `PublicView`; roles kept from create via `mergeView`. API via `api/client.ts`.

## Game rules (compressed)

- 5–10 players; roles communist / fascist / hitler (Hitler = fascist team); fixed distribution table
- Round: nominate → vote (missing = Nein; need strict Ja majority) → on approve: Hitler check if ≥3 blacks else draw 3 → president discard 1 → chancellor enact 1 → advance
- Exhausted eligible nominees → top-deck auto-enact
- Wins: 5 reds → communist; 6 blacks → fascist; Hitler elected chancellor with ≥3 blacks → fascist

## Patterns agents must respect

- Rules live in `secret_cards.engine.*`, not in UI or route handlers
- Public data via `views`; hands viewer-scoped
- `cards` must not import `secret_cards`
- Card UI uses resolve helpers only; no pack-shape branching in screens
- Contracts: `api-contracts.md`; maps: `backend-map.md` / `frontend-map.md`; rationale: `decisions.md`; backlog: `plans/`
