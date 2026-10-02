# 02 — Multi-device privacy

**Status:** proposed  
**Depends on:** none (API role endpoint already exists)  
**Priority:** next among active build plans

## Goal

Support play where each player uses their own device (or a private session) without other players’ roles or legislative hands ever appearing on a shared wire payload the way pass-and-play `role_reveal` does today.

## Why

v1 is single-device pass-and-play: `POST /api/games` returns the full `role_reveal` list for the shared phone. Living architecture and decisions already treat per-player role fetch as the multi-device building block; the endpoint and view helpers exist, but the product path is not wired or enforced end-to-end for multi-client play.

## In scope / out of scope

**In scope**

- Define and implement a multi-device (or per-player client) flow that uses `GET /api/games/{game_id}/role/{player_id}` (and existing viewer-scoped hand access) instead of broadcasting all roles at create time.
- Ensure public board responses remain role-/deck-/hand-free for every client (already true for `PublicView`; keep that invariant under the new flow).
- UI/session changes needed so a non–pass-and-play client does not rely on create-time `role_reveal` for other players’ secrets.

**Out of scope**

- Full online multiplayer product (matchmaking, accounts, durable rooms) — see `99-out-of-scope.md`.
- Changing engine win/nomination/vote rules.
- Cryptographically secure shuffle (separate deferred item in `99-out-of-scope.md`).

## Acceptance criteria

- [ ] A client can obtain **only its own** role via the per-player role endpoint (already partially covered by engine/API tests; extend as needed for the new flow).
- [ ] Create-game (or join) for the multi-device path does **not** require shipping every player’s role to every device.
- [ ] Legislative hands remain viewer-scoped (`viewer_id`); unauthorized hand access stays `403`.
- [ ] Pass-and-play single-device flow remains available and unchanged unless explicitly migrated behind a mode flag.
- [ ] Automated tests cover: public view never includes roles; player A’s role payload never includes player B’s role.

## Notes for implementers

- Contracts: `ai-context/api-contracts.md` (`POST /api/games` `role_reveal`, `GET .../role/{player_id}`, hand `viewer_id`).
- Privacy pattern: `ai-context/architecture.md`, `ai-context/decisions.md` (views, not raw `GameState`).
- Backend helpers: `secret_cards/views.py` (`role_for_player`, `public_view`, `legislative_hand`); routes in `api/routes.py`.
- Frontend today: create stores `role_reveal` in `App` / `mergeView` — see `ai-context/frontend-map.md`. Any multi-device mode must not reuse “all roles on one device” as the privacy model.
