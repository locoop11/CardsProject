# API contracts

Base: `http://127.0.0.1:8000`. In Vite dev, call `/api/...` and `/health` on the frontend origin (proxied).

**Rules**

- Responses never include raw `GameState`. Public board views omit roles, deck order, and hands.
- Auth uses HttpOnly cookie `session_id`. Profile responses never include `password_hash`.
- **Local games** (`user_id_by_player_id` unset): `/api/games*` stay **cookie-optional** (guest v1 + pytest).
- **Bound games** (started from a room): secrets and actor mutations require a valid session; caller’s bound seat must match or `403`. Unauthenticated → `401`.
- **`ActionResponse.hand`:** local — shared-device office-phase hand as before; bound — only if the authenticated caller’s seat is the current office holder.
- **Rooms** (`/api/rooms*`): session required. Multi-device start returns **no** `role_reveal`.

---

## Auth session cookie

| Property | Value |
|----------|--------|
| Name | `session_id` |
| Flags | HttpOnly; SameSite=lax; `Secure` only when request scheme is https |
| Path | `/` |
| Max-Age | 30 days (`SESSION_TTL`) |
| Set on | Successful `register` / `login` |
| Cleared on | `logout` |

Frontend must send cookies (`credentials: 'include'`).

---

## Endpoints

### `GET /health`

**Response:** `{ "status": "ok" }`

---

### `POST /api/auth/register`

Create account + session.

**Body**

| Field | Type | Rules |
|-------|------|--------|
| `password` | string | Required; min length **6** |
| `username` | string \| omit | At least one of `username` / `email` required |
| `email` | string \| omit | At least one of `username` / `email` required |
| `display_name` | string \| omit | Defaults from username, else email local-part, else `"Player"` |

Identity normalization: username → strip + casefold; email → strip + lower.

**Response `201` — `UserOut`** + `Set-Cookie: session_id=…`

**Errors:** `400` invalid input; `409` duplicate username or email.

---

### `POST /api/auth/login`

**Body:** `{ "password", "username"?, "email"? }` — at least one of username/email.

**Response `200` — `UserOut`** + session cookie.

**Errors:** `401` with detail `"Invalid credentials"` (generic).

---

### `POST /api/auth/logout`

Requires valid session cookie.

**Response `204`** + clear cookie.

**Errors:** `401` if not authenticated.

---

### `GET /api/auth/me`

**Response `200` — `UserOut`**

**Errors:** `401` if missing/expired/invalid session.

---

### `PATCH /api/auth/me`

**Body:** `{ "display_name"?, "card_skin"? }` — at least one field required.

| Field | Rules |
|-------|--------|
| `display_name` | Non-empty after strip |
| `card_skin` | `"default"` \| `"party"` |

**Response `200` — `UserOut`**

**Errors:** `400` bad input; `401` not authenticated.

`card_skin` remains the **table preset** (laws / backs / unequipped seats). Per-player Hitler and role equip live under `/api/skins/*` (below), not on `UserOut`.

---

## Skins (ownership and Hitler / role equip)

Image **bytes** are not in SQLite. Pack `code` maps to `frontend/public/cards/<code>/`. Guests have no ownership API.

### `GET /api/skins/packs`

Active catalog. Session **optional**.

**Response `200` — `SkinPackOut[]`**

```json
[
  {
    "id": "spk_default",
    "code": "default",
    "title": "Classic poker",
    "description": "…"
  }
]
```

---

### `GET /api/skins/me`

Requires session.

**Response `200` — `SkinMeOut`**

```json
{
  "owned_packs": [ /* SkinPackOut */ ],
  "equip": {
    "hitler_pack_id": null,
    "role_pack_id": null,
    "hitler_pack_code": null,
    "role_pack_code": null
  }
}
```

Unequipped slots are `null` (client falls back to table `card_skin`).

**Errors:** `401` not authenticated.

---

### `PATCH /api/skins/equip`

Requires session. Body must include at least one of `hitler_pack_id` / `role_pack_id` (pack **ids**, not folder codes alone). Omitted slots stay unchanged.

**Body:** `{ "hitler_pack_id"?, "role_pack_id"? }`

**Response `200` — `EquipOut`** (same shape as `SkinMeOut.equip`).

**Errors:** `400` empty body / unknown or inactive pack; `403` pack not owned; `401` not authenticated.

---

### `GET /api/skins/games/{game_id}/seats`

Requires session. Caller must be **bound** to a seat in that game. Bound games only (local pass-and-play → `400`).

Returns non-sensitive equipped pack ids/codes per seat so clients can render other seats’ face art on reveal/win. **Does not** include role, team, `user_id`, or ownership lists.

**Response `200` — `SeatEquipsOut`**

```json
{
  "seats": [
    {
      "player_id": "p0",
      "hitler_pack_id": "spk_party",
      "hitler_pack_code": "party",
      "role_pack_id": "spk_default",
      "role_pack_code": "default"
    }
  ]
}
```

**Errors:** `400` local (unbound) game; `401` not authenticated; `403` caller not bound to the game; `404` unknown `game_id`.

---

## Rooms (multi-device lobby)

All room routes require a valid session cookie.

### `POST /api/rooms`

Host creates a lobby.

**Body:** `{ "player_count": 5 }` — 5–10.

**Response `201` — `RoomOut`** (host is a member; seats empty until claimed).

**Errors:** `400` unsupported count; `401` unauthenticated.

---

### `POST /api/rooms/join`

**Body:** `{ "code": "ABC123" }` — case-insensitive; stored uppercase.

**Response `200` — `RoomOut`**

**Errors:** `400` empty code / game already started; `401`; `404` unknown code.

---

### `GET /api/rooms/{room_id}`

**Response `200` — `RoomOut`**

**Errors:** `401`; `403` not a member; `404` unknown room.

---

### `POST /api/rooms/{room_id}/claim`

**Body:** `{ "seat_index": 0 }` — `0 .. player_count-1`.

**Response `200` — `RoomOut`**

**Errors:** `400` invalid index / already claimed another seat / game started; `401`; `403` not member; `404`; `409` seat taken by another user.

---

### `POST /api/rooms/{room_id}/start`

Host only. Every seat must be claimed by a **distinct** user.

**Body:** `{ "seed"? }` — optional RNG seed for tests.

**Response `200` — `StartRoomResponse`**

| Field | Notes |
|-------|--------|
| `game_id` | New bound game session |
| `view` | `PublicView` only — **no** `role_reveal` |

Creates engine state, sets `user_id_by_player_id` bindings, sets `room.game_id`.

**Errors:** `400` seats incomplete / already started; `401`; `403` not host / not member; `404`.

---

## Games

### `POST /api/games`

Local pass-and-play start. Auth **not** required. Creates an **unbound** session.

**Body**

| Field | Type | Rules |
|-------|------|--------|
| `player_count` | int | Required, 5–10 |
| `player_names` | string[] | Required; length must equal `player_count` |
| `seed` | int \| omit | Optional; seeds RNG |

**Response `200` — `CreateGameResponse`**

| Field | Type | Notes |
|-------|------|--------|
| `game_id` | string | 12-char hex |
| `view` | `PublicView` | Phase `nomination` |
| `role_reveal` | `RoleRevealPlayer[]` | Pass-and-play; **name-entry order** |

**Errors:** `400` name count / unsupported count / `start_game` `ValueError`.

---

### `GET /api/games/{game_id}`

Public board. Auth not required (local or bound).

**Response `200`:** `PublicView`

**Errors:** `404` unknown game.

---

### `GET /api/games/{game_id}/role/{player_id}`

**Local:** any caller may fetch any seat (trusted shared device).  
**Bound:** cookie required; **403** unless bound seat == `player_id`.

**Response `200` — `RoleRevealPlayer`:** `{ id, name, role, team }`

**Errors:** `401` bound + no session; `403` wrong seat; `404` game or player.

---

### `GET /api/games/{game_id}/hand?viewer_id=`

Legislative hand for current office holder.

**Local:** `viewer_id` must be office holder or `403`.  
**Bound:** cookie + bound seat == `viewer_id` **and** office holder.

**Response `200` — `HandResponse`:** `{ viewer_id, cards: CardOut[] }`

**Errors:** `401` bound + no session; `403` not allowed; `404` unknown game.

---

### `POST /api/games/{game_id}/nominate`

**Body:** `{ "nominee_id": "p2" }`

**Bound:** must be bound current president.

If nobody eligible, engine auto-enacts; `enacted` may be set.

**Response `200`:** `ActionResponse` (`view`, optional `enacted`)

**Errors:** `400` engine; `401`/`403` when bound; `404`.

---

### `POST /api/games/{game_id}/vote`

**Body:** `{ "player_id": "p0", "vote": true }` — locked after first cast.

**Bound:** bound seat must equal `player_id`.

**Response `200`:** `ActionResponse` (`view`)

**Errors:** `400` / `401` / `403` / `404`.

---

### `POST /api/games/{game_id}/resolve-votes`

No body. Missing votes filled as Nein. Strict Ja majority to approve.

**Bound:** bound current president only (force resolve).

**Response `200`:** `ActionResponse` with optional `votes`, `hand` (see hand rule above), `enacted`.

**Errors:** `400` / `401` / `403` / `404`.

---

### `POST /api/games/{game_id}/president-discard`

**Body:** `{ "card_id": 3 }`

**Bound:** bound current president.

**Response `200`:** `ActionResponse` with remaining `hand` when allowed.

---

### `POST /api/games/{game_id}/chancellor-enact`

**Body:** `{ "card_id": 7 }` — card **to enact**.

**Bound:** bound current chancellor.

**Response `200`:** `ActionResponse` with optional `enacted`.

---

### `DELETE /api/games/{game_id}`

Drop in-memory game session (bindings die with it).

**Response:** `204` No Content.

---

## Shared types

### `UserOut`

```json
{ "id": "…", "username": "ada", "email": null, "display_name": "Ada", "card_skin": "default" }
```

`card_skin`: `"default"` \| `"party"` — whole-table preset only (laws / backs / fallback).

### `SkinPackOut`

```json
{ "id": "spk_default", "code": "default", "title": "Classic poker", "description": null }
```

### `EquipOut` / equip fields on `SkinMeOut`

```json
{
  "hitler_pack_id": "spk_party",
  "role_pack_id": "spk_default",
  "hitler_pack_code": "party",
  "role_pack_code": "default"
}
```

Any field may be `null` when that slot is unequipped.

### `SeatEquipOut`

```json
{
  "player_id": "p0",
  "hitler_pack_id": null,
  "hitler_pack_code": null,
  "role_pack_id": null,
  "role_pack_code": null
}
```

### `RoomSeatOut`

```json
{ "seat_index": 0, "player_id": "p0", "user_id": null, "display_name": null }
```

### `RoomOut`

```json
{
  "room_id": "…",
  "join_code": "ABC123",
  "host_user_id": "…",
  "player_count": 5,
  "game_id": null,
  "seats": [ /* RoomSeatOut × player_count */ ]
}
```

### `StartRoomResponse`

```json
{ "game_id": "…", "view": { /* PublicView */ } }
```

### `CardOut` / LawCard

```json
{ "id": 1, "type": "law", "number": 3, "color": "red" }
```

`color`: `"red"` | `"black"`.

### `RoleRevealPlayer`

```json
{ "id": "p0", "name": "Ada", "role": "fascist", "team": "fascist" }
```

`role`: `"communist"` | `"fascist"` | `"hitler"`.  
`team`: `"communist"` | `"fascist"` (Hitler → fascist).

### `PublicView`

| Field | Notes |
|-------|--------|
| `game_id` | Session id |
| `phase` | `nomination` \| `voting` \| `legislative_president` \| `legislative_chancellor` \| `game_over` |
| `round_number` | Starts at 1 |
| `president_id`, `president_name`, `president_index` | Current president |
| `nominated_chancellor_id` | Set during voting |
| `chancellor_id` | Set after approved election |
| `previous_chancellor_id` | Term-limit bar |
| `rejected_nominee_ids`, `rejected_names` | Failed nominees this presidency |
| `eligible_chancellor_ids` | **Only populated in `nomination`**; else `[]` |
| `players` | `{ id, name }[]` — no roles |
| `reds_on_table`, `blacks_on_table` | Counts from law table |
| `laws_on_table` | Enacted cards in play order |
| `votes_cast` | Player ids who have voted (sorted keys) |
| `winner`, `win_reason`, `result` | Set when `game_over` (may include role reveal at table flip) |

### `ActionResponse`

```json
{
  "view": { "...PublicView..." },
  "votes": { "p0": true, "p1": false },
  "enacted": { "id": 1, "type": "law", "number": 3, "color": "red" },
  "hand": [{ "id": 2, "type": "law", "number": 1, "color": "black" }]
}
```

Optional fields omitted / null when not applicable.

---

## Error shape

```json
{ "detail": "human-readable message" }
```

| Status | Meaning |
|--------|---------|
| `400` | Engine rule violation, bad body, incomplete lobby, etc. |
| `401` | Missing/invalid session (auth or bound game / rooms) |
| `403` | Wrong seat, not room member, not host, hand forbidden |
| `404` | Unknown game, player, or room |
| `409` | Duplicate username/email, or seat already claimed |
