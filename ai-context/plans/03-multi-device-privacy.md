# 03 — Multi-device privacy (Option A)

**Kind:** feature  
**Status:** ready  
**Depends on:** `01-accounts-auth` (required — username/email + password sessions); `02-seat-layout-anchor` (UI reuse for “me” at bottom)  
**Priority:** v2 phase 3

## Goal

Support multi-device play where each authenticated client is bound to one seat and can obtain **only that seat’s** role and (when office holder) legislative hand. A co-player who knows `game_id` and can call the API must **not** read another seat’s secrets. Public board stays role-/deck-/hand-free mid-game. Pass-and-play remains a separate trusted-shared-device path with create-time `role_reveal`.

## Why

Old “use `GET .../role/{player_id}` and skip create-time `role_reveal`” is **privacy theater**. Those routes are unauthenticated projections: any caller can fetch any `player_id` or claim any `viewer_id`. Human lock: **Option A — honest/enforced secrecy, no spectators.**

## Threat model (locked)

- **In scope:** Curious co-player with `game_id`, browser/devtools, and knowledge of sequential ids (`p0`…).
- **Out of scope:** Nation-state, crypto RNG hardening — remain in `99-out-of-scope.md` unless promoted.
- **Mid-game intel:** Each bound client may know **only their own** role/team until `game_over`. No fascist/Hitler “peek teammates” (or any other mid-game role dump) API unless a **future** plan explicitly adds it. Win `result.players` is the intentional table flip.

## In scope / out of scope

**In scope**

- Explicit **mode separation**: local pass-and-play create keeps full `role_reveal`; multi-device start must **not** share that path (room start → `game_id` + `view` only).
- **Rooms:** host creates room with fixed `player_count`; others **join with code**; **claim seat** binds `user_id` → `player_id` for that game’s lifetime.
- **Authorize** role, hand, and actor-sensitive mutations: session required on multi-device paths; bound seat must match; else `401`/`403`.
- **ActionResponse.hand**: only if the authenticated caller is the current office holder (never “whoever POSTed”).
- Concurrent per-seat clients: store **own role only**; poll public view; simultaneous voting with wall-clock deadline; **bound president** can force resolve (missing votes = Nein per engine).
- End-game: `game_over` / `result.players` **may** reveal all roles (intentional table flip) — not a mid-game leak.
- Internet-oriented product later; localhost multi-browser is enough to prove Option A. CORS/cookie `Secure` for real domains = deploy checklist, not the definition of privacy.

**Out of scope**

- Matchmaking marketplace, durable multi-worker game DB, accounts implementation (see `01`).
- Changing engine win/nomination/vote *rules* (authorization wrapper only).
- Cryptographically secure shuffle (`99`).
- v3 hybrid table-phone mode (`05`).
- Per-player owned skin economy (`04`).
- Mid-game team-mate role reveals — not in this plan.
- Google OAuth (`06`).

## Auth boundary after this plan (do not break guest / local v1 API)

| Path | Auth |
|------|------|
| Local `POST /api/games` and local pass-and-play mutations | **Auth-optional** on the API — guests and pytest use no cookie. UI still requires Login → Guest or Account → Games hub → v1 (`01`) |
| Room lobby + multi-device secrets/actors | **Session required**; Games hub v2 entry only when logged in — **guests cannot open v2** |

Do **not** add a global “all `/api/games/*` require auth” middleware. Gate by route/mode.

## Seat binding — lifetime and location

- On room **start**, build engine state and attach to the process-local game session a map: `player_id → user_id` (and reverse lookup).
- Bindings live **with the in-memory game session** (extend `GameSession` / parallel dict next to `SessionStore`) — **not** required to be durable SQLite rows for Option A.
- When the game is deleted or the API process restarts, bindings die with the game.
- Host may **start** only when **every** seat `0 .. player_count-1` is claimed by a distinct authenticated user; else `400`.

## Acceptance criteria

- [ ] Authenticated user A **cannot** `GET` user B’s role (`403`) even with B’s `player_id` and shared `game_id`.
- [ ] User A **cannot** obtain B’s legislative hand by supplying B’s `viewer_id` (`403`).
- [ ] Unauthenticated multi-device secret/actor routes → `401`.
- [ ] Multi-device start response has **no** full `role_reveal` list.
- [ ] Local `POST /api/games` still returns `role_reveal` **without** a cookie (guest / pytest).
- [ ] Local pass-and-play nominate/vote/resolve/discard/enact still work **without** cookies.
- [ ] UI: v2 only reachable from logged-in Games hub (`01`); guest path cannot enter online lobby.
- [ ] `ActionResponse.hand` never appears for a caller who is not the proven office holder.
- [ ] Public mid-game `PublicView` has no roles/deck/hand; win reveal may include roles.
- [ ] Wrong seat cannot nominate/vote/legislate as another player (`403`).
- [ ] Multi-device `POST .../resolve-votes` succeeds only for the **bound current president**.
- [ ] Host start fails unless all seats claimed.
- [ ] Cross-user denial tests exist; no mid-game API returns another player’s role/team.

## Data contract (secrets + actors)

| Surface | Rule |
|---------|------|
| Local `POST /api/games` | `view` + full `role_reveal`; **no cookie required** |
| Local game mutations | **No cookie required** |
| Multi-device room start | Auth (host); all seats claimed; `game_id` + `view` only |
| `GET .../role/{player_id}` when binding exists | Cookie; **403** unless bound id == `player_id` |
| `GET .../hand?viewer_id=` when binding exists | Cookie; bound id == `viewer_id` **and** office holder |
| `ActionResponse.hand` | Only proven (bound) office holder |
| `POST .../nominate` | Multi-device: bound current president |
| `POST .../vote` | Multi-device: bound id == `body.player_id` |
| `POST .../resolve-votes` | Multi-device: bound current president only (no `player_id` in body) |
| Discard / enact | Bound president / chancellor |
| Lobby | create / join-by-code / claim / start — **session required** |

Voting: shared `voting_deadline_at`; resolve when all voted, deadline passed, or bound president force.

### Wire paths checklist (role / team / hand)

| Path | Mid-game |
|------|----------|
| Local create `role_reveal` | All roles — local only |
| Multi-device start | No secrets |
| Role GET / hand GET / `ActionResponse.hand` | Bound seat only |
| Public view | No roles/deck/hand |
| Win `result` | Full roles at `game_over` only |

## Developer starting point

**Depends on `01` layering:** Auth must already be `routes → service → repository → db`. Entities: reuse durable **`User` / `Session`**; add ephemeral **`Room`** + **`GameSession.user_id_by_player_id`** — see `00-data-entities.md`. Seat bindings are **in-memory** (not SQLite for Option A). Any later durable tables follow the same repository split.

**Suggested order:**  
(1) Extend in-memory `GameSession` with optional `user_id_by_player_id` (and reverse)  
(2) Room store + lobby routes (create / join / claim / get) — keep HTTP thin; room rules in a service; memory/SQL access in a store/repository  
(3) Host start → `start_game` + bindings + response **without** `role_reveal`  
(4) Gate existing role/hand/mutate routes: if session has bindings → enforce cookie + actor; if no bindings (local game) → today’s behavior  
(5) Cross-user denial tests  
(6) Frontend: Online host/join flow, own-role fetch, poll, rotated board, concurrent vote + president force  

**Do not touch:** engine win/nomination/vote *rules* in `secret_cards/engine/*` (wrappers only in `api/`). Do not delete local `role_reveal` from `POST /api/games`. Do not put SQL or room dict mutation logic in FastAPI route handlers.

### Files likely to create

| Path | Purpose |
|------|---------|
| `api/rooms.py` (or `api/lobby.py`) | In-memory rooms: join code, seats, host `user_id`, `player_count`, link to `game_id` |
| `api/authz.py` | Helpers: `bound_player_id(session, user)`, `require_bound_actor(...)`, `hand_for_caller(...)` |
| `tests/api/test_rooms.py` | create/join/claim/start; start rejected if seat empty |
| `tests/api/test_privacy_option_a.py` | cross-user role/hand/vote denial; local path still open |
| `frontend/src/screens/OnlineLobbyScreen.tsx` (names flexible) | host create, show code, join, claim seat, wait, start |
| `frontend/src/onlineSession.ts` (optional) | `gameId`, `selfPlayerId`, poll helper |

### Files likely to modify

| Path | Change |
|------|--------|
| `api/session.py` | Extend `GameSession` with `user_id_by_player_id: dict[str, str] \| None` (None = local pass-and-play) |
| `api/routes.py` | Branch role/hand/nominate/vote/resolve/discard/enact on binding presence; fix `hand=` on ActionResponse |
| `api/schemas.py` | Room DTOs; optional `voting_deadline_at` on public view if you add it |
| `api/app.py` | Mount room router if separate |
| `secret_cards/views.py` | Only if adding optional public fields (e.g. deadline); **do not** weaken privacy projections |
| `frontend/src/api/client.ts` / `types.ts` | Room + auth’d game helpers; `credentials: 'include'` |
| `frontend/src/App.tsx` | Online steps from logged-in Games hub (`01`); guests never enter v2 |
| `frontend/src/gameSession.ts` | Own-role only on multi-device `mergeView` |
| `frontend/src/screens/TableBoard.tsx` / `seatLayout.ts` | Pass `viewerPlayerId` from online self |
| `frontend/src/screens/NominationScreen.tsx` | Concurrent self-vote + president force; drop sequential pass-phone voter UX for online mode |
| `frontend/src/screens/LegislativeScreen.tsx` | Only act when self is office holder; others wait |
| `frontend/src/screens/RoleRevealScreen.tsx` | Online: single-player reveal from role GET |
| `frontend/src/screens/GamesHubScreen.tsx` | Enable v2 tile → online lobby |
| `frontend/src/screens/SettingsScreen.tsx` | v1 pre-game only (after hub or guest) — not app root |

### Direction notes

- Detection pattern: `if game_session.user_id_by_player_id is None: # local` else enforce authz. Avoid duplicating every engine call.
- Join code: short uppercase alphanumeric; unique in process; regenerate on collide.
- Display names at start: use each claimer’s `display_name` from `01` profile (fallback username/email).
- Ship rule: omitting `role_reveal` on start while leaving role GET open = **not done**.

## Why the old plan was wrong (do not reintroduce)

- Equating unauthenticated role GET with privacy; payload-shape-only acceptance; undefined join; soft threat model.
- **Do not implement from any stale `02-multi-device-privacy.md`** — privacy is this file only.

## Notes for implementers

- Baseline leaks today: `api/routes.py` create/`get_player_role`/`get_hand`/`_hand_if_legislative`.
- Contracts live in `ai-context/api-contracts.md` — Documentation Agent updates after ship.
