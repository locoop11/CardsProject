# Decisions

Settled design choices visible in the current codebase. Prefer these over re-litigating alternatives unless requirements change.

---

## Layered packages: `cards` vs `secret_cards`

**Chosen:** Generic card primitives in `cards/`; game rules only in `secret_cards/`.

**Why:** Reuse piles/tables for other games; keep Secret Cards rules out of the base library.

**Rejected:** Putting law/win logic inside `CardPile` or a single monolithic package.

**Guard:** `tests/cards/test_layer_boundary.py` fails if `cards` imports `secret_cards`.

---

## Split persistence: in-memory play, SQLite accounts

**Chosen:** **Games** and **rooms** stay process-local. **Accounts** / auth sessions use SQLite via `api/db.py` + `api/auth/repository.py`.

**Why:** Local and short-lived lobbies do not need durable play storage yet; identity does.

**Tradeoff:** API restart loses games and rooms; accounts survive. Not multi-worker safe for play state.

**Rejected:** Account SQL inside `secret_cards`; requiring auth on local `/api/games*` create/mutations.

---

## Auth platform layering (N-layer, no ORM)

**Chosen:** `api/auth/` as routes/deps → service → repository → `db`. bcrypt; HttpOnly `session_id` (30-day TTL). No ORM.

**Why:** Clear ownership without a Clean/hexagonal rewrite.

**Rejected:** SQL in service/routes; cookie logic in repository; SQLAlchemy/Alembic for this phase.

---

## Login-first shell; guest → v1 only; accounts get hub + v2

**Chosen:** Cold start is Login (or Games hub if cookied). **Play as guest** → v1 only. Signed-in users get Games hub with **v1 and v2**. Logout → Login. Guest is frontend `playMode` only.

**Why:** Identity-ready product without blocking casual local play.

**Rejected:** Silent anonymous entry; giving guests the hub or online lobby.

---

## Option A multi-device privacy (seat bindings)

**Chosen:** Honest enforcement. Room start attaches `player_id → user_id` on the in-memory game session. Bound games require cookie + matching seat for role, hand, and actor mutations. Multi-device start returns **no** full `role_reveal`. Local create keeps pass-and-play `role_reveal` and cookie-optional mutations. `ActionResponse.hand` only for proven office holder when bound.

**Why:** Unauthenticated “privacy theater” role/hand GETs were not real secrecy.

**Rejected:** Global auth middleware on all `/api/games*`; mid-game teammate role peek APIs (unless a future plan adds them).

**Tests:** `tests/api/test_privacy_option_a.py`, `test_rooms.py`, `test_session_bindings.py`.

---

## Ephemeral rooms lobby

**Chosen:** In-memory `api/rooms/` (routes → service → store). Host creates; others join by code; claim seats; host starts when all seats claimed by distinct users.

**Why:** Enough to prove multi-device play without durable lobby DB.

**Tradeoff:** Restart clears lobbies; single process only.

---

## Bottom-center seat layout + viewer rotation

**Chosen:** `TableBoard` mid-bottom seat anchor. `rotatePlayersForViewer` puts “me” at index 0 for display. Display-only — never send rotated order to the API.

**Why:** Multi-device UX expects the local player at the bottom; relative clockwise order stays meaningful.

**Tests:** `tests/frontend/test_seat_layout.py`.

---

## Privacy via views, not raw state

**Chosen:** `public_view` / `legislative_hand` / `role_for_player`; never return `GameState`.

**Why:** Same projections serve local and multi-device; authorization wraps them for bound games.

**Pass-and-play exception:** `POST /api/games` includes full `role_reveal` for the shared device.

---

## Role reveal order = name entry order (v1)

**Chosen:** After seat shuffle for gameplay, local reveal list is reordered to match typed names.

**Why:** Physical pass-around follows how people sat/typed, not shuffled presidential order.

---

## Mutable state + action log

**Chosen:** Engine mutates one `GameState`; appends `GameAction` entries.

**Why:** Simple for turn-based play; log enables future replay/persistence without changing call sites.

**Tradeoff:** Callers must not share state across threads without external locking.

---

## Strict Ja majority; missing votes = Nein

**Chosen:** Approve only if `ja_count > nein_count`; unresolved voters filled as Nein on resolve.

**Why:** Matches intended election strictness; online bound president can force resolve.

---

## Auto-enact when nominations are exhausted

**Chosen:** Top-of-deck law enact instead of soft-locking the presidency.

**Why:** Game always progresses when every candidate has been rejected (or everyone is barred).

---

## Frontend step machine, not router

**Chosen:** `App` step union (login / hub / account / v1 settings / online lobby / gameplay).

**Why:** Linear flows for local and online without URL/deep-link complexity yet.

---

## File-based card skins

**Chosen:** Art under `public/cards/<skinId>/`. Packs expose Hitler / role / law catalogs (Option A). Resolve helpers only.

**Registered packs:** `default`, `party`. Party generic `back.png` matches `default/back.png`.

**Table preset:** Signed-in `User.card_skin` is whole-table preset for laws, backs, and unequipped seats; guests client-only.

**Per-player Hitler / role (plan `04`, in code):** Ownership via `user_skin_packs`; equip via `user_equip` slots `hitler` / `role` for `game_slug=secret-cards`. HTTP under `/api/skins/*`. Pack folder key is DB column `code` (entity catalog may still say `slug`). No `CardAsset` rows yet — resolve via pack `code` + `cardAssets.ts`. Laws stay table preset.

**Status:** Implemented and covered by API tests + light browser smoke; **not fully human-tested**. Plan file kept open until a full human pass. See `plans/04-per-player-owned-skins.md`.

**Still deferred:** Storefront / law packs / custom uploads / `CardAsset*` tables.

---

## v1 shuffle: PRNG is enough for pass-and-play

**Chosen:** Keep injectable `random.Random` for local shared-device play. Do not block on `secrets.SystemRandom`.

**Why:** Rule-correct odds for kitchen-table / local multi-browser. Crypto RNG remains deferred (`plans/99-out-of-scope.md`) unless promoted.

---

## Settings hub (v1 pre-game, not app entry)

**Chosen:** v1 pre-game hub (Names, Card set skin, Start). App **entry** is Login / Games hub.

**Rejected:** Deep-linked settings routes; skin on API create payload; Settings as cold-start screen.

---

## Anti-patterns to avoid

- Importing `secret_cards` from `cards`.
- Returning raw `GameState` (or roles/deck/hand) on public board endpoints.
- Implementing win/nomination rules in the React UI as authority.
- Putting SQL in auth routes/service or HTTP/cookies in the auth repository.
- Putting account/auth/room logic in `secret_cards`.
- Assuming games/rooms survive API restart or work across multiple Uvicorn workers.
- Locking **local** `/api/games*` behind auth (breaks guest v1 and game tests).
- Letting bound callers read or act as another seat (must be `403`).
- Sending UI-rotated seat order to the API as authority.
- Changing votes after cast without an explicit product decision.
- Silent anonymous entry into gameplay.
