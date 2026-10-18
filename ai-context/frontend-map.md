# Frontend map

## App shell

`App.tsx` owns top-level **step** state (not React Router):

`login` → (`gamesHub` | `account` when signed in) → (`settings` for v1 | `onlineLobby` for v2) → (`roleReveal` v1 only) → `nomination` ↔ `legislative` → `win`

Boot: `loadMe()` → if session, `playMode=account` and step `gamesHub`; else step `login`. Non-401 `/me` failure → login with warning; guest still available.

**Play mode** (`guest` | `account`) is frontend-only. Guests cannot open Games hub or v2.

Within `settings` (v1 only), panel sub-state:

`hub` | `names` | `skin`

- Leaving v1 settings: account → Games hub; guest → Login.
- v2: Games hub → `onlineLobby` (host/join/claim/start) → online gameplay (no shared `roleReveal` step).
- Whole-table `cardSkin`: accounts seed from `user.card_skin` and PATCH on change; guests client-only.

---

## Screens

| Screen | Responsibility |
|--------|----------------|
| `LoginScreen` | First page: login / register + **Play as guest** |
| `GamesHubScreen` | Signed-in catalog (v1 + v2 available); open Account |
| `AccountScreen` | Display name PATCH, logout → login |
| `OnlineLobbyScreen` | Host create / join by code / claim seats / host start |
| `SettingsHubScreen` (`SettingsScreen.tsx`) | v1 pre-game hub: count, Names/Skin, start |
| `NamesScreen` | Enter names; blanks → `Player N` |
| `SkinScreen` | Whole-table pack (`default` \| `party`) |
| `RoleRevealScreen` | **v1 only** — pass-and-play roles in entry order |
| `NominationScreen` | Nominate / vote / resolve; online: self-only + poll |
| `LegislativeScreen` | Discard / enact; online: office-holder only + poll |
| `WinScreen` | Winner / roles; play again → v1 settings or leave online → hub |
| `TableBoard` | Board + seats; optional `viewerPlayerId` bottom-anchors “me” |
| `LawCardView` / `PlayingCardFace` / `ConfirmOverlay` | Card art + confirms |

---

## State

### Global (in `App`)

- `playMode`, `user`, `authStatus`, `authWarning`
- `onlinePlay` (`gameId`, `selfPlayerId`, `roomId`) when in v2
- `playerCount`, `names`, `cardSkin`, `settingsPanel`
- `roleReveal` (v1), `session`, `chancellorId`, `win`, `busy`, `error`, `skinError`
- `legislativeKey` — remount legislative each government

### Session model (`gameSession.ts`)

`GameSession` mirrors `PublicView` (+ optional client role / per-seat skin fields).

- Helpers: `sessionFromView`, `mergeView`, `winFromView`, `president`, `playerById`
- Constants: `SECONDS_PER_VOTER = 10`, UI win thresholds

v1: roles from create `role_reveal`, kept via `mergeView`.  
v2: own role from authorized `GET .../role/{self}` only.

### Online helpers

| Module | Role |
|--------|------|
| `onlineSession.ts` | `resolveSelfPlayerId` (probe role GET until 200), `fetchOwnRole`, `OnlinePlay` |
| `seatLayout.ts` | `rotatePlayersForViewer` — display-only; never send rotated order to API |

### Local screen state

- **NominationScreen:** pass-and-play timer path **or** online self-vote + ~1.5s poll; bound president can force resolve
- **LegislativeScreen:** online waiters poll; only office holder acts
- **OnlineLobbyScreen:** create/join/claim/poll room until `game_id` set

---

## API consumption

| Module | Role |
|--------|------|
| `api/client.ts` | `credentials: 'include'`; game + auth + room helpers; `ApiError` |
| `api/types.ts` | DTOs (`PublicView`, `User`, `Room`, `StartRoomResponse`, …) |
| `auth.ts` | `loadMe()` — user or `null` on 401 |
| `gameCatalog.ts` | `secret-cards-v1` + `secret-cards-v2` both `available: true` |

Vite proxies `/api` and `/health` to port 8000.

---

## Seat layout

`TableBoard` places seats with a **mid-bottom** anchor. When `viewerPlayerId` is set (online), players are rotated so that seat is index 0 before positioning — “me” at bottom-center. Relative clockwise order is preserved. Display-only.

---

## Card art (`cardAssets.ts`)

**Option A catalogs** per pack: Hitler, Role, Law. Screens use helpers only:

- `resolveHitler` / `resolveRole` / `resolveLaw` / `cardBackSrc` / optional `cardTeamBackSrc`

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
