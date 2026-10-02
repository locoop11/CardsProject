# System patterns

## Layer separation

- **`cards` ← `secret_cards` ← `api` ← `frontend`**. Never reverse.
- Generic card code has zero game knowledge; enforced by AST import test.
- HTTP layer is transport only: validate request shapes, call engine, map errors to status codes, serialize views.

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

- Pydantic models in `api/schemas.py` define the wire contract.
- Mutating routes return `ActionResponse` (`view` + optional extras).
- `EngineError` → HTTP 400 with `detail=str(exc)`.
- Sessions: UUID hex truncated to 12 chars in process memory.

## Frontend patterns

- **Step machine in `App`**, not a router — matches linear pass-and-play flow.
- **Screen-local sub-phases** for nomination voting and legislative handoffs.
- **`mergeView`** after every successful action so roles/skins survive public-view updates.
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
| HTTP | `tests/api/test_api.py` | FastAPI client against live routes |
| Frontend | oxlint via `npm run lint`; no automated UI test suite in-repo yet |

Prefer seeded `Random` for deck/role order in engine tests.
