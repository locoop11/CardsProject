# 01 — Accounts and authentication

**Kind:** feature  
**Status:** ready  
**Depends on:** none  
**Priority:** v2 phase 1 (highest)

## Goal

Add durable player accounts (username/email + password, HTTP-only cookies) and **enforce a login-first app shell**: the first screen is always Login/Register. From there the user either signs in or explicitly chooses **Play as guest**. Guests only get **v1 pass-and-play**. Logged-in users land on a **Games hub** listing available products (v1 and v2 for now; v3 / other games later).

## Why

Identity is required for multi-device secrecy later (`03`), and the product should not open straight into the old settings hub. Casual play remains possible only via an explicit guest choice that routes to v1.

## UX flow (locked — enforce in UI)

```
App load
  → GET /api/auth/me
  → if session: Games hub
  → if no session: Login page (FIRST page; do not show Settings hub first)

Login page
  → Register / Login (success → Games hub)
  → "Play as guest" (explicit) → v1 pass-and-play only (existing settings → role reveal → …)

Games hub (logged in only)
  → list available games / modes, e.g.:
      • Secret Cards v1 — Pass and play (local shared device)
      • Secret Cards v2 — Multi-device (rooms; enabled when `03` ships; can show as “coming soon” until then)
  → future: v3 hybrid, other games — same hub pattern
  → Account / profile (display name, card skin, logout)
  → Choosing v1 → existing v1 settings hub + flow, with account `card_skin` applied
  → Choosing v2 → online lobby (`03`); never available to guests
```

**Rules**

- **No silent anonymous entry** into gameplay. Guest must tap “Play as guest”.
- **Guest → v1 only.** No Games hub, no v2.
- **Logged in → Games hub first** (not Settings hub). Settings/names/skin remain nested under the chosen game (v1) or account area.
- Logout returns to **Login page**.

## In scope / out of scope

**In scope**

- SQLite users + sessions; register / login / logout / me; PATCH display_name + card_skin.
- Password min length **6**; username and/or email + password.
- Frontend: Login/Register as initial route; guest CTA; Games hub when authenticated.
- Logged-in v1 uses account `card_skin` as whole-table skin (same as today’s table preset).
- Auth in `api/` only — not `secret_cards/`.
- Local game API routes stay **cookie-optional** so guest v1 and existing pytest keep working (`03` must not global-lock `/api/games`).
- **Layered auth persistence (required to ship `01`):** split HTTP / business / data access as below. No ORM required for this phase.

**Out of scope**

- Google OAuth (`06`).
- Rooms / Option A authz (`03`) — hub may list v2 as coming soon until `03`.
- Seat layout (`02`), owned packs (`04`), v3 (`05`).
- Full Clean Architecture / DDD rewrite of `secret_cards` or the frontend.
- Introducing SQLAlchemy/Alembic (or any ORM) — deferred until a concrete need (migrations complexity, multi-DB, etc.).

## Auth layering (locked for `01` and later persistence)

Pragmatic **N-layered** structure inside `api/auth/` (industry default for small/medium apps; not a full hexagonal/Clean rewrite):

| Layer | Module(s) | Owns | Must not own |
|-------|-----------|------|----------------|
| Presentation (HTTP) | `api/auth/routes.py`, `api/auth/deps.py`, `api/schemas.py` | Cookies, status codes, request/response DTOs, calling service | SQL, password policy details beyond mapping errors |
| Business / application | `api/auth/service.py`, `api/auth/passwords.py` | Register/login rules, normalization, session TTL policy, skin allow-list, domain errors | SQL strings, `sqlite3` row handling, schema DDL |
| Data access | `api/auth/repository.py` (name locked) | CRUD SQL for `users` / `sessions`, row→`UserRecord` mapping, IntegrityError→domain signal if needed at boundary | HTTP, password hashing policy, cookie names |
| Infrastructure | `api/db.py` | Connection open, `init_db` / schema DDL, path/env, shared DB constants | Auth use-case orchestration |

**Dependency direction:** `routes/deps` → `service` → `repository` → `db`. Never reverse (repository must not import FastAPI or call service).

**Existing code note:** Current `api/auth/service.py` mixes business + SQL. Completing `01` includes extracting SQL into `repository.py` with **no wire-contract or UX change**. Prefer keeping `tests/api/test_auth.py` green as the regression net.

## Acceptance criteria

- [ ] Cold start with no cookie shows **Login page first** (not Settings hub, not a game).
- [ ] Register / login succeeds → **Games hub** (not straight into v1 settings unless user picks v1).
- [ ] Games hub lists at least **v1** (playable) and **v2** (playable after `03`, or labeled coming soon in this phase).
- [ ] **Play as guest** is explicit and opens **v1 only**.
- [ ] Guest cannot open Games hub or start v2 UI.
- [ ] Logout → Login page.
- [ ] Auth API: register/login/me/logout/PATCH as contracted; passwords hashed; duplicates `409`; bad login `401`.
- [ ] Logged-in v1 applies account `card_skin`.
- [ ] Existing `tests/api/test_api.py` still passes without cookies (guest/API path).
- [ ] **`api/auth/service.py` contains no SQL and does not call `sqlite3` / `connect` directly** — all persistence goes through `api/auth/repository.py`.
- [ ] **`api/auth/repository.py` contains no FastAPI / cookie / HTTP status logic.**
- [ ] `tests/api/test_auth.py` still passes after the extract (behavior-preserving refactor).

## Entities stored in this plan (precise)

Full catalog (all tiers, future games): **`00-data-entities.md`**. For `01`, only these:

| Entity | Storage | Purpose |
|--------|---------|---------|
| **`User`** | SQLite `users` | Account: identity + `display_name` + whole-table `card_skin` |
| **`Session`** | SQLite `sessions` | Login session; cookie `session_id` = row `id` |
| **Guest** | *none* | Frontend `playMode` only — **not** a DB entity |

`User` / `Session` field lists, invariants, and CRUD mapping are locked in `00-data-entities.md`. Repository CRUD targets those two tables only.

## Data contract (auth API)

| Method | Path | Auth | Body | Success | Errors |
|--------|------|------|------|---------|--------|
| POST | `/api/auth/register` | none | `{ "username"?, "email"?, "password", "display_name"? }` — at least one of username/email | `201` profile + `Set-Cookie` | `400`, `409` |
| POST | `/api/auth/login` | none | `{ "username"?, "email"?, "password" }` | `200` profile + cookie | `401` |
| POST | `/api/auth/logout` | session | — | `204` clear cookie | `401` optional |
| GET | `/api/auth/me` | session | — | `200` `{ id, username?, email?, display_name, card_skin }` | `401` |
| PATCH | `/api/auth/me` | session | `{ "display_name"?, "card_skin"? }` | `200` profile | `400`, `401` |

Profile JSON is the public face of **`User`** (never `password_hash`). Cookie is the public handle of **`Session`**. No guest API user.

## Developer starting point

**Current reality:** Auth API + login-first UI + Games hub + guest path + `test_auth.py` largely exist in the working tree. `01` is **not shipped** until acceptance criteria (including layering) are met.

**Remaining / corrective order:**

1. **Extract data layer** — move all SQL / connection use from `api/auth/service.py` into `api/auth/repository.py`; service keeps rules and calls repository only.
2. Keep `api/db.py` as connection + schema init only (no auth use-cases).
3. Re-run `tests/api/test_auth.py` and `tests/api/test_api.py` — no contract changes.
4. Manually verify UX acceptance criteria (cold start login, guest→v1, hub, logout, account skin).
5. Do **not** start `02` / `03` until this plan’s layering criteria pass.

**Do not touch:** `secret_cards/**`, `cards/**`, leave `api/routes.py` game endpoints unauthenticated. Do not add an ORM in this plan.

### Files likely to create

| Path | Purpose |
|------|---------|
| `api/auth/repository.py` | **Required** — SQLite access for users/sessions; row mapping |
| `api/db.py` / other `api/auth/*` | Already present — keep roles as in layering table |
| `tests/api/test_auth.py` | Already present — keep green |
| `frontend/src/screens/LoginScreen.tsx` | Already present — first page |
| `frontend/src/screens/GamesHubScreen.tsx` | Already present — catalog |
| `frontend/src/auth.ts` | Already present — `loadMe()` helper |

### Files likely to modify

| Path | Change |
|------|--------|
| `api/auth/service.py` | Remove SQL/`connect`; call repository; keep business rules |
| `api/auth/deps.py` | Still calls service (`user_for_session`); no SQL |
| `api/db.py` | Only if constants/helpers need to stay shared; no use-case logic |
| `frontend/*` | Only if UX acceptance gaps remain (not for layering) |

### Direction notes

- App steps sketch: `login` → (`gamesHub` if account) → (`settings` / roleReveal / … for v1) or (online lobby when `03`).
- On boot: call `/me`; `401` → stay on login; `200` → games hub.
- Guest: set local flag, never call authenticated profile APIs; clearing guest returns to login.
- Games hub is data-driven list (id, title, description, `available: boolean`) so v3/other games can be added later without rewriting the shell.
- Prefer separate auth router in `app.py`.
- Future durable features (rooms tables, owned packs, OAuth identity links) **must** follow the same routes → service → repository → `db` split. In-memory game/`SessionStore` stays as the non-SQL store for ephemeral game state unless a later plan says otherwise.
- Auth is **platform** (shared by all future games). Secret Cards rules stay in `secret_cards/`; do not grow a “god” API. Multi-game packaging rules live in `plans/README.md` (standing structure).

## Notes for implementers

- Layering is a **behavior-preserving** refactor of existing auth code — do not change the data contract table above.
- Living maps (`architecture.md`, `decisions.md`, `backend-map.md`) still describe settings-first / no-DB overall — Documentation Agent updates **after** `01` ships (include the persistence layering decision).
- Google = `06` only.
