# Decisions

Settled design choices visible in the current codebase. Prefer these over re-litigating alternatives unless requirements change.

---

## Layered packages: `cards` vs `secret_cards`

**Chosen:** Generic card primitives in `cards/`; game rules only in `secret_cards/`.

**Why:** Reuse piles/tables for other games; keep Secret Cards rules out of the base library.

**Rejected:** Putting law/win logic inside `CardPile` or a single monolithic package.

**Guard:** `tests/cards/test_layer_boundary.py` fails if `cards` imports `secret_cards`.

---

## Split persistence: in-memory games, SQLite accounts

**Chosen:** Secret Cards **game** sessions stay in process-local `SessionStore` (no game DB). **Accounts** and auth sessions use SQLite (`users`, `sessions`) via `api/db.py` + `api/auth/repository.py`.

**Why:** Local pass-and-play does not need durable game state; identity does need durable users for hub/profile and future multi-device work.

**Tradeoff:** API restart loses in-flight games; accounts survive. Game store is not multi-worker safe.

**Rejected:** Putting account SQL inside `secret_cards`; requiring auth on `/api/games*` for v1 guest play.

---

## Auth platform layering (N-layer, no ORM)

**Chosen:** `api/auth/` as routes/deps → service → repository → `db`. bcrypt passwords; HttpOnly `session_id` cookie (30-day TTL). No ORM.

**Why:** Clear ownership for a small platform module; matches standing v2+ persistence rule without a Clean/hexagonal rewrite.

**Rejected:** SQL in service or routes; cookie logic in repository; SQLAlchemy/Alembic for this phase.

---

## Login-first shell; guest → v1 only

**Chosen:** Cold start is Login (or Games hub if cookied). **Play as guest** is explicit and opens v1 only. Signed-in users land on Games hub (`gameCatalog`), not Settings hub. Logout returns to Login. Guest is frontend `playMode` only — no guest DB user.

**Why:** Identity-ready product surface without blocking casual local play.

**Rejected:** Silent anonymous entry into Settings hub; giving guests the Games hub or v2 UI.

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

**Chosen:** `App` step union drives screens (login / hub / account / v1 flow).

**Why:** Linear, device-pass flow; avoids URL/deep-link complexity for local play.

---

## File-based card skins

**Chosen:** Art under `public/cards/<skinId>/`. A pack exposes **three catalogs** — **Hitler**, **role**, **law** (Option A). UI resolves art via helpers (`resolveHitler` / `resolveRole` / `resolveLaw` / `cardBackSrc`).

**Registered packs today:** `default` (Classic poker), `party` (Party).

**`default` rules:** Hitler = Ace of Spades; law faces = poker cards **excluding** Ace of Spades; roles use poker faces (Hitler still AS).

**`party` rules:** Dedicated hitler/role/law image files; optional team-colored backs. **Generic face-down (`back.png`) is the same art as `default/back.png`** so undrawn/deck backs stay consistent with the classic pack unless a future pack overrides it.

**Account skin:** Signed-in `User.card_skin` is the whole-table preset for logged-in v1; changes PATCH to the account. Guest skin remains client-only.

**Why:** Swap packs without touching game rules; catalogs match how the game talks about cards; leaves a clean path to per-player owned packs later.

**Deferred:** Per-player owned / mixed packs — see `plans/04-per-player-owned-skins.md`.

---

## v1 shuffle: PRNG is enough for pass-and-play

**Chosen:** Keep Python’s injectable PRNG (`random.Random`) for v1 local shared-device play. Do **not** block v1 on `secrets.SystemRandom`.

**Why:** Law composition (11 black / 6 red), role tables, and Fisher–Yates shuffles already give rule-correct odds for kitchen-table play. Cryptographic RNG matters when games are online and players cannot trust a shared device — that is **v2**, listed under `plans/99-out-of-scope.md`.

**Rejected for v1:** Treating crypto RNG as a ship blocker for pass-and-play.

---

## Settings hub (v1 pre-game, not app entry)

**Chosen:** v1 pre-game is a **hub** with nested panels (Names, Card set skin). **Start game** lives on that hub and creates the API session. App **entry** is Login (or Games hub when signed in), not this settings hub.

**Why:** One place for table options before pass-and-play; identity shell sits above the game.

**Rejected:** Deep-linked routes per settings page; mixing skin choice into the API create payload; opening Settings hub as the cold-start screen.

---

## Anti-patterns to avoid

- Importing `secret_cards` from `cards`.
- Returning raw `GameState` (or roles/deck/hand) on public board endpoints.
- Implementing win/nomination rules in the React UI as authority (UI may mirror constants for display; engine decides).
- Putting SQL in auth routes/service or HTTP/cookies in the auth repository.
- Putting account/auth logic in `secret_cards`.
- Assuming **game** sessions survive API restart or work across multiple Uvicorn workers.
- Requiring auth cookies for `/api/games*` (breaks guest v1 and game tests).
- Changing votes after cast (engine rejects; do not add “edit vote” without an explicit product decision).
- Silent anonymous entry into gameplay (guest must be explicit).
