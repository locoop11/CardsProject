# 01 — Accounts and authentication

**Kind:** feature  
**Status:** ready  
**Depends on:** none  
**Priority:** v2 phase 1 (highest)

## Goal

Add durable player accounts so a client can register, log in, and stay authenticated across requests using **username/email + password** only. Profile holds display name and whole-table card skin. This is the identity foundation for Option A multi-device privacy (`03`) and later owned skins (`04`).

## Why

Multi-device play and honest secrecy require knowing *who* is calling the API. Pass-and-play may run logged out or logged in; when logged in, that account’s table skin applies the same way v1’s whole-table skin does today (not per-seat skins on a shared phone).

## In scope / out of scope

**In scope**

- SQLite persistence for users and server-side sessions.
- Register / login / logout / me with **HTTP-only session cookies**.
- Local auth only: **username and/or email** + password (min **6**).
- Settings: user-chosen **display name**; account **card_skin** (table preset ids already used by the UI).
- Pass-and-play remains playable **without** login; with login, use account skin as table skin.
- Auth lives in `api/` (and small persistence helpers) — not in `secret_cards/`.
- Game mutating routes stay **unauthenticated** in this phase (binding comes in `03`). Keep that boundary forever for local pass-and-play (`03` must not global-lock `/api/games`).

**Out of scope**

- **Google OAuth / social login** — deferred to `06-google-oauth.md` (last).
- Seat claim, rooms, join codes, role/hand authorization (`03`).
- Seat layout / rotation (`02`).
- Per-player owned / mixed packs (`04`).
- MySQL/Postgres, JWT-as-primary-session, email verification, password reset.
- Expanding CORS for production domains (deploy checklist when hosting).

## Acceptance criteria

- [ ] User can register with username and/or email + password (≥ 6 chars) and receive a session cookie.
- [ ] Duplicate username/email → `409`; bad login → generic `401`.
- [ ] `GET /api/auth/me` returns profile when cookied; `401` when not.
- [ ] `PATCH` (or equivalent) updates `display_name` and `card_skin`.
- [ ] Pass-and-play start still works logged out; logged-in client can apply account `card_skin` as table skin.
- [ ] Existing game API tests pass without auth cookies.
- [ ] Passwords stored hashed only (bcrypt or argon2).

## Data contract (authoritative for this plan)

| Method | Path | Auth | Body | Success | Errors |
|--------|------|------|------|---------|--------|
| POST | `/api/auth/register` | none | `{ "username"?, "email"?, "password", "display_name"? }` — at least one of username/email | `201` profile + `Set-Cookie` | `400`, `409` |
| POST | `/api/auth/login` | none | `{ "username"?, "email"?, "password" }` | `200` profile + cookie | `401` |
| POST | `/api/auth/logout` | session | — | `204` clear cookie | `401` optional |
| GET | `/api/auth/me` | session | — | `200` `{ id, username?, email?, display_name, card_skin }` | `401` |
| PATCH | `/api/auth/me` | session | `{ "display_name"?, "card_skin"? }` | `200` profile | `400`, `401` |

Profile never includes password hash. Error shape remains `{ "detail": "..." }`.

## Notes for implementers

- Stack today: FastAPI, in-memory `SessionStore` for **games**, no users — see `ai-context/architecture.md`, `api/app.py`, `api/session.py`.
- Cookie: `HttpOnly`; `SameSite=Lax` for local; `Secure` when HTTPS.
- Frontend: `credentials: 'include'`; Account panel under settings hub; do not block Start game on login.
- Do **not** scaffold Google routes in this plan — that is `06`.
- Living maps (`decisions.md` “no DB/auth”) will be superseded by Documentation Agent after ship — do not block implementation on that edit.
