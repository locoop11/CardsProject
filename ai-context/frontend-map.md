# Frontend map

## App shell

`App.tsx` owns top-level **step** state (not React Router):

`login` → (`gamesHub` | `account` when signed in) → `settings` → `roleReveal` → `nomination` ↔ `legislative` → `win`

Boot: `loadMe()` → if session, `playMode=account` and step `gamesHub`; else step `login`. If `/me` fails for non-401 reasons, stay on login with a warning; guest play remains available.

**Play mode** (`guest` | `account`) is frontend-only. Guests have no API user and cannot open the Games hub.

Within `settings`, a **panel** sub-state selects v1 hub UI:

`hub` | `names` | `skin`

- **Hub** (`SettingsHubScreen`): player count, Names / Card set skin, **Start game**.
- Leaving v1 settings: account → Games hub; guest → Login.
- Whole-table `cardSkin`: for accounts, seeded from `user.card_skin` and PATCH’d on change; for guests, client-only (default pack).

---

## Screens

| Screen | Responsibility |
|--------|----------------|
| `LoginScreen` | First page: login / register + **Play as guest** |
| `GamesHubScreen` | Signed-in only: data-driven catalog, open Account |
| `AccountScreen` | Display name PATCH, logout → login |
| `SettingsHubScreen` (`SettingsScreen.tsx`) | v1 pre-game hub: player count, Names/Skin, start game |
| `NamesScreen` | Enter names; blanks → `Player N`; back to hub |
| `SkinScreen` | Pick whole-table pack (`default` \| `party`); preview catalogs |
| `RoleRevealScreen` | Pass-and-play private role cards in **entry order**; uses `cardSkin` |
| `NominationScreen` | Nominate → timed Ja/Nein → resolve; top-enact / Hitler win; `cardSkin` |
| `LegislativeScreen` | President hand / discard / pass / chancellor enact; `cardSkin` |
| `WinScreen` | Winner / roles; play again → v1 settings hub |
| `TableBoard` | Shared board: seats, president, enacted laws, counts, vote UI |
| `LawCardView` | One law card face via `resolveLaw` |
| `PlayingCardFace` | Face / back art via resolve helpers |
| `ConfirmOverlay` | Confirm dialogs for vote / discard / enact |

---

## State

### Global (in `App`)

- `playMode`, `user`, `authStatus`, `authWarning`
- `playerCount`, `names`, `cardSkin`, `settingsPanel`
- `roleReveal`, `session`, `chancellorId`, `win`, `busy`, `error`, `skinError`
- `legislativeKey` — remount legislative screen each government

`cardSkin` is not part of `PublicView`. Optional per-seat `TablePlayer.cardSkin` remains reserved for owned-packs work; v1 seats fall back to the table preset.

### Session model (`gameSession.ts`)

`GameSession` mirrors `PublicView` (plus optional client-only role / per-seat skin fields):

- Board: `redsOnTable`, `blacksOnTable`, `lawsOnTable`, president/round, eligibility, rejections
- Helpers: `sessionFromView`, `mergeView` (preserves roles/skins across API updates), `winFromView`, `president`, `playerById`
- Constants: `SECONDS_PER_VOTER = 10`, UI win thresholds (`RED_WIN`, `BLACK_WIN`, `HITLER_ZONE_BLACKS`)

Roles are stored from `role_reveal` at create and preserved in `mergeView`.

### Local screen state

- **NominationScreen:** `nominate` \| `voting` \| `reveal` \| `topEnactNotice`; per-voter timer; vote map
- **LegislativeScreen:** president select → face-down pass → chancellor select

---

## API consumption

| Module | Role |
|--------|------|
| `api/client.ts` | `fetch` helpers with `credentials: 'include'`; `ApiError` with status + FastAPI `detail`; game + auth calls |
| `api/types.ts` | DTOs matching API (`PublicView`, `ActionResponse`, `User`, etc.) |
| `auth.ts` | `loadMe()` — `GET /me` → user or `null` on 401; rethrows other errors |
| `gameCatalog.ts` | Hub catalog (`secret-cards-v1` available; `secret-cards-v2` coming soon) |

Pattern: screens call client → update session via `mergeView` / `onSessionChange` → branch on `view.phase` / `win_reason`.

Vite proxies `/api` and `/health` to port 8000.

---

## Card art (`cardAssets.ts`)

**Option A catalogs** per pack: Hitler, Role, Law. Screens must use helpers only — no pack-shape branching:

- `resolveHitler(skinId)`
- `resolveRole(skinId, role, sameRoleIndex?)`
- `resolveLaw(skinId, color, number)`
- `cardBackSrc(skinId)` / optional `cardTeamBackSrc(skinId, team)`

| Pack id | Label | Contents |
|---------|--------|----------|
| `default` | Classic poker | Rank+suit PNGs + `back.png`. Hitler = `AS`; laws = poker faces excluding AS (black ace → `AC`); roles via `roleToPlayingCard` |
| `party` | Party | Explicit `hitler` / `role-*` / `law-*` files; optional `back-fascist` / `back-communist`. **Generic `back.png` matches the classic default face-down** (same image as `default/back.png`) |

Assets live under `public/cards/<skinId>/`. Register new packs in `CardSkinId`, `CARD_SKIN_IDS`, `CARD_SKIN_LABELS`, `SKINS`. See also `public/cards/README.md`.

---

## Supporting modules

| Module | Role |
|--------|------|
| `constants.ts` | `SUPPORTED_PLAYER_COUNTS` (mirrors engine) |
| `roles.ts` | Role/team types, labels, distribution, role→poker mapping for default pack |
| `names.ts` | Blank-name fill + duplicate detection (must match `start_game`) |
| `lawCards.ts` | Re-export of law card DTO type |
