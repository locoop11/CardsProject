# Decisions

Settled design choices visible in the current codebase. Prefer these over re-litigating alternatives unless requirements change.

---

## Layered packages: `cards` vs `secret_cards`

**Chosen:** Generic card primitives in `cards/`; game rules only in `secret_cards/`.

**Why:** Reuse piles/tables for other games; keep Secret Cards rules out of the base library.

**Rejected:** Putting law/win logic inside `CardPile` or a single monolithic package.

**Guard:** `tests/cards/test_layer_boundary.py` fails if `cards` imports `secret_cards`.

---

## Thin FastAPI over in-memory sessions

**Chosen:** Local HTTP API with process-local `SessionStore`; no database.

**Why:** Enough for single-device pass-and-play and UI development; engine stays the source of truth.

**Tradeoff:** API restart loses games; not multi-worker safe; not online multiplayer.

---

## Privacy via views, not raw state

**Chosen:** `public_view` / `legislative_hand` / `role_for_player`; never return `GameState`.

**Why:** Same contract works when multi-device privacy is required later.

**Pass-and-play exception:** `POST /api/games` includes full `role_reveal` for the shared device. Prefer per-player role endpoint for multi-device (endpoint already exists).

---

## Role reveal order = name entry order

**Chosen:** After seat shuffle for gameplay, reveal list is reordered to match typed names.

**Why:** Physical pass-around follows how people sat/typed, not shuffled presidential order.

---

## Mutable state + action log

**Chosen:** Engine mutates one `GameState`; appends `GameAction` entries.

**Why:** Simple for a turn-based local game; log enables future replay/persistence without changing call sites.

**Tradeoff:** Callers must not share state across threads without external locking (not needed for current single-process local API).

---

## Strict Ja majority; missing votes = Nein

**Chosen:** Approve only if `ja_count > nein_count`; unresolved voters filled as Nein on resolve.

**Why:** Matches intended election strictness and pass-and-play timeout behavior.

---

## Auto-enact when nominations are exhausted

**Chosen:** Top-of-deck law enact instead of soft-locking the presidency.

**Why:** Game always progresses when every candidate has been rejected (or everyone is barred).

---

## Frontend step machine, not router

**Chosen:** `App` step union drives screens.

**Why:** Linear, device-pass flow; avoids URL/deep-link complexity for local play.

---

## File-based card skins

**Chosen (direction):** Art under `public/cards/<skinId>/`. A pack exposes **three catalogs** — **Hitler**, **role**, **law** (Option A). v1 settings pick one **whole-table preset**; UI resolves art via helpers (`resolveHitler` / `resolveRole` / `resolveLaw`).

**`default` rules:** Hitler = Ace of Spades; law faces = normal poker cards **excluding** Ace of Spades; roles also use poker faces (Hitler still AS).

**Why:** Swap packs without touching game rules; catalogs match how the game talks about cards; leaves a clean path to per-player owned packs later.

**Deferred:** Accounts and per-player owned / mixed packs (e.g. different Hitler art per seat) — see `plans/03-per-player-owned-skins.md`. Law personalization undecided.

---

## Anti-patterns to avoid

- Importing `secret_cards` from `cards`.
- Returning raw `GameState` (or roles/deck/hand) on public board endpoints.
- Implementing win/nomination rules in the React UI as authority (UI may mirror constants for display; engine decides).
- Assuming sessions survive API restart or work across multiple Uvicorn workers.
- Changing votes after cast (engine rejects; do not add “edit vote” without an explicit product decision).
