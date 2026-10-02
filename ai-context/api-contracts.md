# API contracts

Base: `http://127.0.0.1:8000`. In Vite dev, call `/api/...` and `/health` on the frontend origin (proxied).

**Rule:** responses never include raw `GameState`. Public board views omit roles, deck order, and hands. Legislative hands require an authorized `viewer_id`.

---

## Endpoints

### `GET /health`

**Response:** `{ "status": "ok" }`

---

### `POST /api/games`

Start a game (`start_game`).

**Body**

| Field | Type | Rules |
|-------|------|--------|
| `player_count` | int | Required, 5–10 |
| `player_names` | string[] | Required; length must equal `player_count` |
| `seed` | int \| omit | Optional; seeds RNG for reproducible games |

**Response `200` — `CreateGameResponse`**

| Field | Type | Notes |
|-------|------|--------|
| `game_id` | string | 12-char hex session id |
| `view` | `PublicView` | Initial board (phase `nomination`) |
| `role_reveal` | `RoleRevealPlayer[]` | Pass-and-play only; **name-entry order**, not seat/president order |

**Errors:** `400` if name count mismatch or unsupported player count / `start_game` `ValueError`.

---

### `GET /api/games/{game_id}`

**Response `200`:** `PublicView`

**Errors:** `404` if unknown game.

---

### `GET /api/games/{game_id}/role/{player_id}`

One player’s role + team (multi-device building block).

**Response `200` — `RoleRevealPlayer`:** `{ id, name, role, team }`

**Errors:** `404` game or player not found.

---

### `GET /api/games/{game_id}/hand?viewer_id=`

Legislative hand for the current office holder.

**Query:** `viewer_id` (required) — must be current president in `legislative_president`, or chancellor in `legislative_chancellor`.

**Response `200` — `HandResponse`:** `{ viewer_id, cards: CardOut[] }`

**Errors:** `403` if viewer not allowed; `404` unknown game.

---

### `POST /api/games/{game_id}/nominate`

**Body:** `{ "nominee_id": "p2" }`

If nobody is eligible, engine auto-enacts top LawCard (`nominee_id` ignored); `enacted` may be set.

**Response `200`:** `ActionResponse` (`view`, optional `enacted`)

**Errors:** `400` engine rule violation; `404` unknown game.

---

### `POST /api/games/{game_id}/vote`

**Body:** `{ "player_id": "p0", "vote": true }` — `true` = Ja, `false` = Nein. Locked after first cast.

**Response `200`:** `ActionResponse` (`view`)

**Errors:** `400` wrong phase / unknown player / already voted; `404` unknown game.

---

### `POST /api/games/{game_id}/resolve-votes`

No body. Missing votes filled as Nein. Strict Ja majority required to approve.

**Response `200`:** `ActionResponse` with:

| Extra | When |
|-------|------|
| `votes` | Full ballot map after Nein fill-in |
| `hand` | 3 cards if government approved and game continues (legislative) |
| `enacted` | Top LawCard if rejects exhausted nominations |

**Errors:** `400` wrong phase / no nominee; `404` unknown game.

---

### `POST /api/games/{game_id}/president-discard`

**Body:** `{ "card_id": 3 }` — card to discard into the deck.

**Response `200`:** `ActionResponse` with remaining `hand` (2 cards). Phase → `legislative_chancellor`.

---

### `POST /api/games/{game_id}/chancellor-enact`

**Body:** `{ "card_id": 7 }` — card **to enact** (other hand card returns to deck).

**Response `200`:** `ActionResponse` with optional `enacted`. Round advances unless game over.

---

### `DELETE /api/games/{game_id}`

Drop in-memory session.

**Response:** `204` No Content (always succeeds even if already gone from store’s perspective — store simply pops).

---

## Shared types

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
| `winner`, `win_reason`, `result` | Set when `game_over` |

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
| `400` | Engine rule violation (`InvalidPhaseError`, etc.) or bad request body |
| `403` | Hand access forbidden for `viewer_id` |
| `404` | Unknown game or player |
