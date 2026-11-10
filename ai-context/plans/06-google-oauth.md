# 06 — Google OAuth (and social login)

**Kind:** feature  
**Status:** ready  
**Depends on:** accounts auth, rooms/Option A, skins, hybrid table display (**all shipped**)  
**Priority:** next Developer task (last major auth convenience feature in the open queue)

## Goal

Let users **sign in or link** with **Google** using the same HttpOnly `session_id` cookie model as local username/email + password. Local password auth stays available.

## Why

Fewer passwords for internet / multi-device play. Deferred until local accounts and seat identity were proven.

## Product locks (this plan)

| Topic | Lock |
|-------|------|
| **Providers** | **Google only** this plan. Apple/others later. |
| **Session** | Same cookie `session_id` / SQLite `sessions` as local login. |
| **New Google user** | Create `User` with `google_sub` set; `password_hash` nullable **or** random unusable hash — pick one approach and keep login-by-password working only when a real password exists. |
| **Linking** | If Google email matches an existing local user’s **verified/normalized email**, **link** `google_sub` to that user after explicit consent **or** on first Google login when email matches (document which). **No silent takeover** of an account that already has a different `google_sub`. |
| **Conflict** | Google `sub` already linked to another user → `409`. |
| **`/me` shape** | Keep existing profile fields; may add optional `has_google: bool` or `auth_providers` — do not break skins equip fields. |
| **UI** | Login + Account: “Continue with Google”; logout unchanged. |
| **Guest** | Unchanged — no Google guest. |
| **Secrets** | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / redirect URI via env; never commit secrets. |

## In scope / out of scope

**In scope**

- OAuth start + callback routes under `/api/auth/google/…`.
- Schema: durable Google subject on user (`google_sub` UNIQUE nullable) — **`id` PK unchanged**.
- Service + repository layering (no SQL in routes).
- Frontend Login/Account Google button; cookie session after success.
- Tests: mock Google token exchange where possible; link / conflict / local password still works.

**Out of scope**

- Apple / other IdPs.
- Removing local password registration.
- Changing rooms, skins, or table-display behavior.
- Full account merge UI beyond email-match link rule above.

## Acceptance criteria

- [ ] Google OAuth success sets the same session cookie as local login; `/me` works.
- [ ] New Google-only user can use hub / v2 / v3 like any account.
- [ ] Linking rule is implemented and tested (no silent takeover when `google_sub` clashes).
- [ ] Local username/email + password register/login still works.
- [ ] Missing Google env config fails safely (clear 503/config error), not a crash loop.
- [ ] No client exposure of `google_sub` secrets beyond what’s needed (prefer not putting raw sub in public profile unless useful).

## Data contract (additions)

| Method | Path | Auth | Notes | Success |
|--------|------|------|-------|---------|
| GET | `/api/auth/google/start` | none | Redirect to Google authorize URL (or JSON `{ "authorize_url" }` if SPA prefers) | `302` or `200` |
| GET | `/api/auth/google/callback` | none | Code exchange; create/link user; set cookie; redirect to frontend | `302` + `Set-Cookie` |
| GET | `/api/auth/me` | session | Existing profile (+ optional Google-linked flag) | `200` |

Exact redirect URLs and frontend origin from env (`GOOGLE_REDIRECT_URI`, Vite origin).

## Developer starting point

**Suggested order:**

1. `api/db.py`: add nullable unique `google_sub` (and allow null password if you choose that model); migrate existing DBs safely.
2. Repository/service: find-by-google-sub, link, create-from-google; keep password login paths.
3. Routes: start + callback; map errors to 400/409/503.
4. Pytest with mocked Google responses.
5. Frontend: LoginScreen + AccountScreen “Continue with Google”; handle redirect return.
6. Document env vars in README or `docs/` briefly.

**Do not touch:** `secret_cards/`, rooms authz, skins ownership rules (except `/me` additive fields).

### Files likely to create / modify

| Path | Purpose |
|------|---------|
| `api/auth/routes.py` / `service.py` / `repository.py` | Google start/callback + user link |
| `api/db.py` / `api/schemas.py` | `google_sub`; optional me fields |
| `tests/api/test_auth_google.py` (name flexible) | OAuth flows mocked |
| `frontend/src/screens/LoginScreen.tsx` / `AccountScreen.tsx` | Google CTA |
| `frontend/src/api/client.ts` | start URL helper if needed |
| `.env.example` / README | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, redirect URI |

### Direction notes

- Prefer Authorization Code flow with server-side client secret.
- State parameter CSRF protection on start/callback.
- After callback, redirect to frontend hub/login with cookie already set (`SameSite=Lax` as today).

## Notes for implementers

- Living maps describe local auth today — Documentation Agent updates after ship.
- Plans `04` / `05` are shipped/removed from queue; do not reopen them for OAuth work.
