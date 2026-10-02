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
- Mid-game team-mate role reveals (Secret Hitler–style fascist night) — not in this plan.

## Auth boundary after this plan (do not break pass-and-play)

| Path | Auth |
|------|------|
| Local `POST /api/games` and existing local game mutations used by pass-and-play | **Auth-optional** — must keep working **without** cookies (preserves `01` regression: game API tests without auth) |
| Room lobby routes, multi-device secret routes, multi-device actor mutations | **Session required** |

Do **not** add a global “all `/api/games/*` require auth” middleware. Gate by route/mode.

## Seat binding — lifetime and location

- On room **start**, build engine state and attach to the process-local game session a map: `player_id → user_id` (and reverse lookup).
- Bindings live **with the in-memory game session** (extend `GameSession` / parallel dict next to `SessionStore`) — **not** required to be durable SQLite rows for Option A.
- When the game is deleted or the API process restarts, bindings die with the game (same availability model as today’s in-memory games). Secrecy definition is independent of restart durability.
- Unclaimed seats at start time: **forbidden** — see host start rules.

## Host start rules (locked)

- Room is created with fixed `player_count` (5–10).
- Host may call **start** only when **every** seat index `0 .. player_count-1` is claimed by a distinct authenticated user.
- Early start with empty seats: **rejected** (`400`).
- No `player_id` / role is issued to unclaimed seats; start response never includes secrets for absent players.

## Acceptance criteria

- [ ] Authenticated user A **cannot** `GET` user B’s role (`403`) even with B’s `player_id` and shared `game_id`.
- [ ] User A **cannot** obtain B’s legislative hand by supplying B’s `viewer_id` (`403`).
- [ ] Unauthenticated multi-device secret/actor routes → `401`.
- [ ] Multi-device start response has **no** full `role_reveal` list.
- [ ] Local `POST /api/games` still returns `role_reveal` for pass-and-play **without** requiring a cookie.
- [ ] Local pass-and-play nominate/vote/resolve/discard/enact still work **without** cookies.
- [ ] `ActionResponse.hand` never appears for a caller who is not the proven office holder.
- [ ] Public mid-game `PublicView` has no roles/deck/hand; win reveal may include roles.
- [ ] Wrong seat cannot nominate/vote/legislate as another player (`403`).
- [ ] Multi-device `POST .../resolve-votes` succeeds only for the **bound current president**; other bound seats get `403`.
- [ ] Host start fails unless all seats claimed.
- [ ] Automated tests cover **cross-user denial**, not only “payload shape excludes other roles.”
- [ ] No mid-game API returns another player’s role/team.

## Data contract (secrets + actors)

| Surface | Rule |
|---------|------|
| Local `POST /api/games` | Unchanged: `view` + full `role_reveal`; **no cookie required** |
| Local game mutations (pass-and-play) | **No cookie required** (trusted shared device) |
| Multi-device room start | Auth (host); all seats claimed; response `game_id` + `view` only — no `role_reveal` |
| `GET .../role/{player_id}` (multi-device / when binding exists) | Cookie; **403** unless bound id == `player_id` |
| `GET .../hand?viewer_id=` (when binding exists) | Cookie; **403** unless bound id == `viewer_id` **and** office-holder rule (`viewer_id` may stay for office check but must match bound id) |
| `ActionResponse.hand` | Only if caller is current office holder **and** (multi-device) that caller’s bound seat is that holder; else omit/null |
| `POST .../nominate` | Multi-device: cookie + bound id == current president |
| `POST .../vote` | Multi-device: cookie + bound id == `body.player_id` |
| `POST .../resolve-votes` | Multi-device: cookie + bound id == current president (force resolve / deadline resolve caller). Resolve has **no** `player_id` in body — identity comes from session binding only |
| `POST .../president-discard` | Multi-device: cookie + bound president |
| `POST .../chancellor-enact` | Multi-device: cookie + bound chancellor |
| Lobby | `POST /api/rooms`, join by code, claim seat, host start — **session required** |

Voting (multi-device): shared `voting_deadline_at` (e.g. related to `SECONDS_PER_VOTER`); resolve when all voted, deadline passed, or **bound president** force via resolve.

### Wire paths that may carry role / team / hand (checklist)

| Path | Mid-game allowed content |
|------|---------------------------|
| Local create `role_reveal` | All roles — **local mode only** |
| Multi-device start | None of the above secrets |
| `GET .../role/{id}` | Only if caller bound to that id |
| `GET .../hand` | Only proven office holder (bound) |
| `ActionResponse.hand` | Same as hand GET |
| `ActionResponse.view` / `GET` public view | No roles/deck/hand |
| `ActionResponse.votes` | Ballot map after resolve is **public election result**, not a role secret — OK to expose to callers who may see the resolve outcome; other clients learn via poll + optional public ballot field if needed for UX |
| `view.result` / win payload | Full roles — **only** when `game_over` |

## Why the old plan was wrong (do not reintroduce)

- `Depends on: none` + “role endpoint is the building block” equated **views** with **access control**.
- Acceptance “player A’s role payload never includes player B” can pass while A still `GET`s B’s role.
- “Create-game (or join)” left join undefined; Option A needs claim + binding.
- Soft/implicit threat model; human requires Option A.
- **Do not implement from any stale file named `02-multi-device-privacy.md`** — that plan is superseded; only this file (`03`) defines multi-device privacy. Seat layout is `02-seat-layout-anchor.md`.

## Notes for implementers

- Code today: `api/routes.py` (unauthenticated role/hand; create always reveals; hand on resolve/discard); `secret_cards/views.py` helpers are projections only.
- Contracts: `ai-context/api-contracts.md` — Documentation Agent updates after ship.
- Frontend: do not reuse create-time all-roles + `mergeView` preserving every seat’s role on the multi-device path; use `02` rotation for display.
- Ship rule: do **not** call Option A done if create omits `role_reveal` but role/hand GET stay open to other seats.
- In-memory games/bindings die on API restart — availability limit, not secrecy.
- Execute after `01` local auth works; `02` can be parallel. Google OAuth is **not** required (`06`, last).
