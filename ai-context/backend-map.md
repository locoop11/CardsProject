# Backend map

## Package overview

| Package | Owns | Does not own |
|---------|------|----------------|
| `cards/` | Generic `Card`, `CardPile`, `CardTable`, `DeckProtocol` | Any Secret Cards rules |
| `secret_cards/` | Game model, roles, law deck, engine, privacy views | HTTP, UI |
| `api/` | FastAPI app, routes, Pydantic schemas, in-memory sessions | Rules logic (delegates to engine) |
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
- **Board / laws:** `law_deck` (draw pile) + `law_table` (enacted) + `drawn_law_cards` (current hand).
- **Office / election:** president index, nominee, chancellor, rejected list, votes map, term-limit fields on `Settings` / state.
- **Outcome:** `winner`, `win_reason`, `result` when `phase == game_over`.

---

## `api/`

| Module | Responsibility |
|--------|----------------|
| `app.py` | FastAPI app, CORS, mounts router, `GET /health` |
| `routes.py` | All `/api/games*` routes; maps `EngineError` → HTTP 400; builds DTOs from views |
| `schemas.py` | Pydantic request/response models |
| `session.py` | `SessionStore` / `GameSession` — process-local dict by `game_id` |

API does **not** implement rules; it loads session state, calls engine functions, and serializes via `secret_cards.views`.

---

## Tests (`tests/`)

| Path | Focus |
|------|--------|
| `tests/cards/` | Pile/table behavior + layer-boundary import guard |
| `tests/secret_cards/` | Start, nominate, vote, legislative, law deck, model, views, full-game simulations |
| `tests/api/` | HTTP contract / route behavior via FastAPI test client |
