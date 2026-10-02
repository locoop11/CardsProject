# 06 — Google OAuth (and social login)

**Kind:** feature  
**Status:** proposed  
**Depends on:** `01-accounts-auth` (required); preferably after `03` multi-device is stable  
**Priority:** last — after `04` / `05` unless human promotes earlier

## Goal

Let users sign in or link accounts with **Google** (and optionally other providers later) using the same HTTP-only session cookie model as local auth in `01`.

## Why

Convenience and fewer passwords for internet play. Explicitly deferred so v2 can ship on simple username/email + password first.

## In scope / out of scope (when promoted)

**Likely in scope**

- `GET /api/auth/google/start` and callback.
- Create user from Google profile or **link** `google_sub` to an existing local account (matching verified email).
- Same session cookie as `01`; `/me` unchanged shape (may expose linked providers later).

**Out of scope until decided**

- Other IdPs (Apple, etc.) unless added to this plan when promoted.
- Replacing local password auth.

## Acceptance criteria (placeholder)

- [ ] Google OAuth create/login sets the same session cookie as local login.
- [ ] Linking to an existing local user is defined and tested (no silent account takeover).
- [ ] Local username/email + password path remains available.

## Notes for implementers

- Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, redirect URIs for local + production.
- Do not start until `01` is shipped; prefer after Option A (`03`) so identity binding is already proven with local accounts.
