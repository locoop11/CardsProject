# Backend map

## Package overview

| Package | Owns | Does not own |
|---------|------|----------------|
| `cards/` | Generic `Card`, `CardPile`, `CardTable`, `DeckProtocol` | Any Secret Cards rules |
| `secret_cards/` | Game model, roles, law deck, engine, privacy views | HTTP, UI, accounts, rooms |
| `api/` | FastAPI app, game routes, auth, skins, rooms, authz, schemas, in-memory games/rooms, SQLite accounts + skin metadata | Rules logic (delegates to engine) |
| `tests/` | pytest suites mirroring packages | — |

---

## `cards/`

| Module | Responsibility |
|--------|----------------|
| `card.py` | Frozen `Card` dataclass: `id`, `type`, `number`, `color`, `meta` |
| `pile.py` | `CardPile`: shuffle, draw, peek, add, `return_and_shuffle`, remove-by-id; `PileError` |
| `table.py` | `CardTable`: face-up play area; `play`, `clear`; `TableError` |
| `protocols.py` | `DeckProtocol` — draw/shuffle/return interface |

**Invariant:** `cards` never imports `secret_cards` (enforced by `tests/cards/test_layer_boundary.py`).

---

## `secret_cards/`

### Core model

| Module | Responsibility |
|--------|----------------|
| `model.py` | `Team`, `Role`, `Phase`, `Player`, `Settings`, `GameState`; helpers `team_for_role`, `reds_on_table`, `blacks_on_table` |
| `roles.py` | `ROLE_DISTRIBUTION`, `SUPPORTED_PLAYER_COUNTS`, `assign_roles` |
| `actions.py` | `GameAction` + `record_action` → append to `GameState.action_log` |
| `errors.py` | `EngineError` hierarchy: phase, nominee, vote, player, card choice |
| `views.py` | Client-safe projections: `public_view`, `legislative_hand`, `role_for_player`, `role_reveal_in_entry_order`, `card_to_dict` |

### Laws

| Module | Responsibility |
|--------|----------------|
| `laws/law_card.py` | Law card factory/helpers; 11 black + 6 red composition constants; `LawColor` |
| `laws/secret_cards_law_deck.py` | `SecretCardsLawDeck(CardPile)`: `new_standard`, draw, peek, `draw_top_for_auto_enact`, return-and-shuffle |

### Engine (`secret_cards/engine/`)

Each module exposes pure functions that **mutate `GameState` in place** and return it.

| Module | Functions / role |
|--------|------------------|
| `start.py` | `start_game` — validate, assign roles, shuffle seats, build deck, phase `nomination` |
| `nominate.py` | `eligible_chancellor_ids`, `nominate_chancellor`, `current_president_id` |
| `vote.py` | `cast_vote`, `resolve_votes` (approve → legislative or Hitler win; reject → bar nominee / auto-enact) |
| `legislative.py` | `president_discard`, `chancellor_enact` |
| `enact.py` | `enact_top_law_after_exhausted_nominees` |
| `advance.py` | `advance_round` — rotate president, clear nomination/vote/hand |
| `win.py` | `check_win_condition`, `apply_win` |

Public re-exports: `secret_cards/__init__.py`.

### Data domains

- **Players / roles:** `model.Player`, `roles.assign_roles` — assigned once at start; never change.
- **Board / laws:** `law_deck` + `law_table` + `drawn_law_cards`.
- **Office / election:** president index, nominee, chancellor, rejected list, votes map, term limits.
- **Outcome:** `winner`, `win_reason`, `result` when `phase == game_over`.

---

## `api/`

### App shell

| Module | Responsibility |
|--------|----------------|
| `app.py` | FastAPI app, CORS (credentials on), lifespan `init_db()`, mounts game + auth + rooms + skins routers, `GET /health` |
| `routes.py` | `/api/games*`; dual-mode authz via `api/authz`; engine → views; `ActionResponse.hand` gated for bound games |
| `schemas.py` | Pydantic models (game + auth + rooms + skins) |
| `session.py` | `SessionStore` / `GameSession` — process-local games; optional `user_id_by_player_id` bindings |
| `authz.py` | Bound-seat helpers: `require_user_if_bound`, `require_bound_seat` / president / chancellor |
| `db.py` | SQLite connect/path/`init_db`; seed skin packs + ownership backfill; skin allow-list constants. No use-cases. |

`GameSession.is_local()` when `user_id_by_player_id is None`. Local routes stay cookie-optional; bound routes require session + matching seat.

### Auth platform (`api/auth/`)

Layered: **routes/deps → service → repository → db**. Never reverse.

| Module | Layer | Responsibility |
|--------|-------|----------------|
| `routes.py` | HTTP | `/api/auth/*`; cookies; map domain errors → status codes |
| `deps.py` | HTTP | `require_user`, `session_token_from_request` |
| `service.py` | Business | Register/login/logout/profile rules. **No SQL.** |
| `passwords.py` | Helpers | bcrypt; `MIN_PASSWORD_LENGTH = 6` |
| `repository.py` | Data | SQL for `users` / `sessions`. **No FastAPI/cookies.** |

**SQLite (accounts):** `users`, `sessions`. Guest play has no DB row.

**Register** also grants starter skin packs via `api.skins.service.grant_starter_packs` inside the same transaction.

### Skins platform (`api/skins/`)

Layered: **routes → service → repository → db**. Prefer this package over stuffing cosmetics into auth.

| Module | Layer | Responsibility |
|--------|-------|----------------|
| `routes.py` | HTTP | `/api/skins/*`; map domain errors → status codes |
| `service.py` | Business | Grant starters; equip Hitler/role; bound-game seat equip lookup. **No SQL.** |
| `repository.py` | Data | SQL for `skin_packs` / `user_skin_packs` / `user_equip`. **No FastAPI/cookies.** |

**SQLite (skins):** `skin_packs` (`id` + unique `code`), `user_skin_packs`, `user_equip` (`game_slug` + `slot` ∈ `hitler` \| `role`). Image bytes stay on disk under `frontend/public/cards/<code>/`. No `CardAsset` rows yet.

`User.card_skin` remains the **table preset** (laws / backs / fallback).

### Rooms (`api/rooms/`)

Ephemeral lobby. Layered: **routes → service → store** (in-memory; no SQL).

| Module | Responsibility |
|--------|----------------|
| `routes.py` | `/api/rooms*`; session required; map domain errors → HTTP |
| `service.py` | Create/join/claim/start; table-display attach/detach/by-code; build bound `GameSession` on start |
| `store.py` | `Room` (incl. `table_display_user_ids`), `SeatClaim`, `RoomStore` by `room_id` / join code |

On start: placeholder names preserve claim↔seat through shuffle; then rewrite display names and attach `player_id → user_id` bindings (**seat claimants only**). Response has **no** `role_reveal`. Table-display users are members but not bound seats.

---

## Tests (`tests/`)

| Path | Focus |
|------|--------|
| `tests/cards/` | Pile/table + layer-boundary import guard |
| `tests/secret_cards/` | Engine phases, law deck, views, full-game sims |
| `tests/api/test_api.py` | Local game HTTP (no cookie) |
| `tests/api/test_auth.py` | Auth cookies + guest game path |
| `tests/api/test_skins.py` | Pack grant, equip deny/happy path, `/skins/me`, bound seat equips |
| `tests/api/test_rooms.py` | Lobby create/join/claim/start |
| `tests/api/test_table_display.py` | Table attach/detach; public view OK; role/hand/actors denied; join-table after start |
| `tests/api/test_privacy_option_a.py` | Bound seat denial / hand / actors |
| `tests/api/test_session_bindings.py` | Binding helpers on `GameSession` |
| `tests/frontend/test_seat_layout.py` | `rotatePlayersForViewer` (Python port / mirror) |
