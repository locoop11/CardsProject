# Frontend map

## App shell

`App.tsx` owns top-level **step** state (not React Router):

`login` → (`gamesHub` | `account` when signed in) → (`settings` for v1 | `onlineLobby` for v2/v3 | `tableDisplay` for v3 table) → (`roleReveal` v1 only) → `nomination` ↔ `legislative` → `win`

Boot: `loadMe()` → if session, `playMode=account` and step `gamesHub`, then load `GET /api/skins/me` for Hitler/role equip; else step `login`. Non-401 `/me` failure → login with warning; guest still available.

**Play mode** (`guest` | `account`) is frontend-only. Guests cannot open Games hub, v2, or v3.

Within `settings` (v1 only), panel sub-state:

`hub` | `names` | `skin`

- Leaving v1 settings: account → Games hub; guest → Login.
- v2: Games hub → `onlineLobby` (`allowTableDisplay=false`) → bound player gameplay.
- v3: Games hub → `onlineLobby` (`allowTableDisplay=true`) → player path same as v2 **or** table path → `tableDisplay`.
- Whole-table `cardSkin`: accounts seed from `user.card_skin` and PATCH on change; guests client-only. Laws and card backs always use this preset (including table projector).
- Per-player Hitler/role: signed-in equip from Account (`/api/skins/*`). Pass-and-play applies that art only to seats whose typed name matches the account display name; other seats use the table preset. Online players: `GET /api/skins/games/{gameId}/seats` → per-seat art. Table display never loads roles/equips for secrets.

---

## Screens

| Screen | Responsibility |
|--------|----------------|
| `LoginScreen` | First page: login / register + **Play as guest** |
| `GamesHubScreen` | Signed-in catalog (v1 + v2 + v3 available); open Account |
| `AccountScreen` | Display name PATCH; Hitler/role equip from owned packs; logout → login |
| `OnlineLobbyScreen` | Host create / join by code / claim seats / host start; v3 adds player vs **table** device role |
| `TableDisplayScreen` | v3 public projector: poll `GET /games/{id}` only; no roles/hands/actions |
| `SettingsHubScreen` (`SettingsScreen.tsx`) | v1 pre-game hub: count, Names/Skin, start |
| `NamesScreen` | Enter names; blanks → `Player N` |
| `SkinScreen` | Whole-table pack (`default` \| `party`); signed-in copy notes laws/backs + unequipped seats |
| `RoleRevealScreen` | **v1 only** — pass-and-play roles in entry order; optional per-seat `seatArt` |
| `NominationScreen` | Nominate / vote / resolve; online: self-only + poll |
| `LegislativeScreen` | Discard / enact; online: office-holder only + poll |
| `WinScreen` | Winner / roles; play again → v1 settings or leave online → hub |
| `TableBoard` | Board + seats; optional `viewerPlayerId` bottom-anchors “me” |
| `LawCardView` / `PlayingCardFace` / `ConfirmOverlay` | Card art + confirms |

---

## State

### Global (in `App`)

- `playMode`, `user`, `authStatus`, `authWarning`
- `onlinePlay` (`gameId`, `selfPlayerId`, `roomId`) when in v2/v3 **player** path
- `onlineLobbyKind` (`v2` \| `v3`); `tableDisplay` (`roomId`, `gameId`, `view`) when projecting
- `playerCount`, `names`, `cardSkin`, `hitlerSkin`, `roleSkin`, `seatArt`, `settingsPanel`
- `roleReveal` (v1), `session`, `chancellorId`, `win`, `busy`, `error`, `skinError`
- `legislativeKey` — remount legislative each government

### Session model (`gameSession.ts`)

`GameSession` mirrors `PublicView` (+ optional client role / per-seat art: `hitlerSkin`, `roleSkin`, `cardSkin`).

- Helpers: `sessionFromView`, `mergeView`, `winFromView`, `president`, `playerById`, `seatArtForNamedAccount`, `seatArtFromSeatEquips`
- Constants: `SECONDS_PER_VOTER = 10`, UI win thresholds

v1: roles from create `role_reveal`, kept via `mergeView`; seat art from display-name match when signed in.  
v2: own role from authorized `GET .../role/{self}` only; seat art from skins seat-equip endpoint.

### Online helpers

| Module | Role |
|--------|------|
| `onlineSession.ts` | `resolveSelfPlayerId` (probe role GET until 200), `fetchOwnRole`, `OnlinePlay` |
| `seatLayout.ts` | `rotatePlayersForViewer` — display-only; never send rotated order to API |

### Local screen state

- **NominationScreen:** pass-and-play timer path **or** online self-vote + ~1.5s poll; bound president can force resolve
- **LegislativeScreen:** online waiters poll; only office holder acts
- **OnlineLobbyScreen:** create/join/claim/poll room until `game_id` set; v3 may attach as table (`LobbyDeviceRole`)
- **TableDisplayScreen:** ~1.5s public-view poll only

---

## API consumption

| Module | Role |
|--------|------|
| `api/client.ts` | `credentials: 'include'`; game + auth + room + skins helpers; `ApiError` |
| `api/types.ts` | DTOs (`PublicView`, `User`, `Room`, `SkinProfile`, `SeatEquipsResponse`, …) |
| `auth.ts` | `loadMe()` — user or `null` on 401 |
| `gameCatalog.ts` | `secret-cards-v1`, `secret-cards-v2`, `secret-cards-v3` all `available: true` |

Vite proxies `/api` and `/health` to port 8000.

---

## Seat layout

`TableBoard` places seats with a **mid-bottom** anchor. When `viewerPlayerId` is set (online), players are rotated so that seat is index 0 before positioning — “me” at bottom-center. Relative clockwise order is preserved. Display-only.

---

## Card art (`cardAssets.ts`)

**Option A catalogs** per pack: Hitler, Role, Law. Screens use helpers only:

- `resolveHitler` / `resolveRole` (optional separate Hitler pack) / `resolveLaw` / `cardBackSrc` / optional `cardTeamBackSrc`
- Face-down backs stay on the **table** `cardSkin`; faces may use per-seat Hitler/role packs.

| Pack id | Label | Notes |
|---------|--------|--------|
| `default` | Classic poker | Hitler = `AS`; laws exclude AS |
| `party` | Party | Dedicated art; generic `back.png` matches `default/back.png` |

Assets under `public/cards/<skinId>/`.

---

## Supporting modules

| Module | Role |
|--------|------|
| `constants.ts` | `SUPPORTED_PLAYER_COUNTS` |
| `roles.ts` | Role/team types, labels, default-pack mapping |
| `names.ts` | Blank-name fill + duplicate detection |
| `lawCards.ts` | Law card DTO type re-export |
