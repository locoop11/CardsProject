# Secret Cards local API (Phase 4.1)

Thin FastAPI transport over the Python engine. Base URL: `http://127.0.0.1:8000`.
Vite proxies `/api` and `/health` in development.

**Rule:** responses never include raw `GameState`. Public board views omit roles,
deck order, and hands. Legislative hands are scoped by `viewer_id`.

---

## Run

```bash
# from repo root, with .venv active
uvicorn api.app:app --reload --port 8000

# frontend (separate terminal)
cd frontend && npm run dev
```

---

## Endpoints

### `GET /health`

`{ "status": "ok" }`

### `POST /api/games`

Start a game (`start_game`).

**Body**

```json
{
  "player_count": 5,
  "player_names": ["Ada", "Bo", "Cy", "Di", "Ed"],
  "seed": 42
}
```

`seed` is optional (tests / reproducible demos).

**Response**

```json
{
  "game_id": "a1b2c3d4e5f6",
  "view": { "...PublicView..." },
  "role_reveal": [
    { "id": "p0", "name": "Bo", "role": "fascist", "team": "fascist" }
  ]
}
```

`role_reveal` is for **single-device pass-and-play** only. Prefer
`GET /api/games/{id}/role/{player_id}` once multi-device (Task 4.2).

### `GET /api/games/{game_id}`

Public board / phase snapshot.

### `GET /api/games/{game_id}/role/{player_id}`

One player's role + team.

### `GET /api/games/{game_id}/hand?viewer_id=p0`

Legislative hand if `viewer_id` is president (phase `legislative_president`) or
chancellor (phase `legislative_chancellor`). Otherwise **403**.

### `POST /api/games/{game_id}/nominate`

```json
{ "nominee_id": "p2" }
```

If nobody is eligible, the engine auto-enacts the top LawCard (nominee ignored).
`enacted` is set when a top card was played.

### `POST /api/games/{game_id}/vote`

```json
{ "player_id": "p0", "vote": true }
```

`true` = Ja, `false` = Nein. Locked after first cast.

### `POST /api/games/{game_id}/resolve-votes`

Resolves after all windows end. Missing votes = Nein.

**Response extras**

- `votes`: full ballot map after Nein fill-in
- `hand`: 3 LawCards when government approved (no Hitler win)
- `enacted`: top LawCard when rejects exhausted nominations

### `POST /api/games/{game_id}/president-discard`

```json
{ "card_id": 3 }
```

Returns remaining `hand` (2 cards). Phase → `legislative_chancellor`.

### `POST /api/games/{game_id}/chancellor-enact`

```json
{ "card_id": 7 }
```

`card_id` is the LawCard **to enact** (not the discard). The other hand card
returns to the deck. Round advances unless the game ends.

### `DELETE /api/games/{game_id}`

Drop the in-memory session.

---

## PublicView fields

| Field | Notes |
|-------|--------|
| `phase` | `nomination` \| `voting` \| `legislative_president` \| `legislative_chancellor` \| `game_over` |
| `eligible_chancellor_ids` | Only populated in `nomination` |
| `reds_on_table` / `blacks_on_table` | Derived from `law_table` |
| `result` | Set only when `phase == game_over` |

---

## ActionResponse envelope

```json
{
  "view": { "...PublicView..." },
  "votes": { "p0": true, "p1": false },
  "enacted": { "id": 1, "type": "law", "number": 3, "color": "red" },
  "hand": [{ "id": 2, "type": "law", "number": 1, "color": "black" }]
}
```

Optional fields omitted when not applicable.

---

## Error shape

HTTP 400 for engine rule violations (`InvalidPhaseError`, etc.):

```json
{ "detail": "nominate_chancellor requires phase=nomination, got voting" }
```

HTTP 404 for unknown game/player. HTTP 403 for forbidden hand access.
