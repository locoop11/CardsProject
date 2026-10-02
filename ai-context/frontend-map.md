# Frontend map

## App shell

`App.tsx` owns top-level **step** state (not React Router):

`settings` → `roleReveal` → `nomination` ↔ `legislative` → `win`

Within `settings`, a **panel** sub-state selects hub UI:

`hub` | `names` | `skin`

- **Hub** (`SettingsHubScreen`): player count, links to Names / Card set skin, **Start game** (creates the API session).
- **Names** / **Skin**: nested panels; Back returns to hub (does not leave `settings` step).

Creates the game from the hub (`POST /api/games`), holds `GameSession` + `roleReveal` + whole-table `cardSkin`, and deletes the session on play-again / return-to-hub.

---

## Screens

| Screen | Responsibility |
|--------|----------------|
| `SettingsHubScreen` (`SettingsScreen.tsx`) | Pre-game hub: player count, open Names/Skin, start game |
| `NamesScreen` | Enter names; blanks → `Player N`; back to hub (start is on hub) |
| `SkinScreen` | Pick whole-table card pack (`default` \| `party`); preview catalogs |
| `RoleRevealScreen` | Pass-and-play private role cards in **entry order**; uses `cardSkin` |
| `NominationScreen` | Nominate → timed Ja/Nein → resolve; top-enact / Hitler win; `cardSkin` |
| `LegislativeScreen` | President hand / discard / pass / chancellor enact; `cardSkin` |
| `WinScreen` | Winner / roles; play again → hub |
| `TableBoard` | Shared board: seats, president, enacted laws, counts, vote UI |
| `LawCardView` | One law card face via `resolveLaw` |
| `PlayingCardFace` | Face / back art via resolve helpers |
| `ConfirmOverlay` | Confirm dialogs for vote / discard / enact |

---

## State

### Global (in `App`)

- `playerCount`, `names`, `cardSkin` (whole-table preset), `settingsPanel`
- `roleReveal`, `session`, `chancellorId`, `win`, `busy`, `error`
- `legislativeKey` — remount legislative screen each government

`cardSkin` is **frontend-only** (not sent to the API). It is passed into gameplay screens as a prop. Optional per-seat `TablePlayer.cardSkin` remains reserved for a future owned-packs plan; v1 seats fall back to the table preset.

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
| `api/client.ts` | `fetch` helpers; `ApiError` with status + FastAPI `detail` |
| `api/types.ts` | DTOs matching API (`PublicView`, `ActionResponse`, etc.) |

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
