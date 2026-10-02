# Frontend map

## App shell

`App.tsx` owns top-level **step** state (not React Router):

`settings` → `names` → `roleReveal` → `nomination` ↔ `legislative` → `win`

Creates the game on leaving names (`POST /api/games`), holds `GameSession` + `roleReveal`, and deletes the session on play-again / back-from-reveal.

---

## Screens

| Screen | Responsibility |
|--------|----------------|
| `SettingsScreen` | Pick player count 5–10 |
| `NamesScreen` | Enter names; resolve blanks → `Player N`; block duplicate names; start game |
| `RoleRevealScreen` | Pass-and-play private role cards in **entry order** |
| `NominationScreen` | Nominate → timed Ja/Nein pass-around → resolve; handles top-enact notice and Hitler-elected win |
| `LegislativeScreen` | Load hand as president; discard; pass device; chancellor enacts |
| `WinScreen` | Show winner / roles; play again |
| `TableBoard` | Shared board: seats, president, enacted laws, counts |
| `LawCardView` | Render one law card face |
| `PlayingCardFace` | Playing-card art for seat/role visuals |
| `ConfirmOverlay` | Confirm dialogs for vote / discard / enact |

---

## State

### Global (in `App`)

- `playerCount`, `names`, `roleReveal`, `session`, `chancellorId`, `win`, `busy`, `error`
- `legislativeKey` — remount legislative screen each government

### Session model (`gameSession.ts`)

`GameSession` is the UI mirror of `PublicView` (plus optional client-only role/skin fields kept after create):

- Board: `redsOnTable`, `blacksOnTable`, `lawsOnTable`, president/round, eligibility, rejections
- Helpers: `sessionFromView`, `mergeView` (preserves roles/skins across API updates), `winFromView`, `president`, `playerById`
- Constants: `SECONDS_PER_VOTER = 10`, win thresholds mirrored for UI (`RED_WIN`, `BLACK_WIN`, `HITLER_ZONE_BLACKS`)

Roles are **not** re-fetched from public views; they are stored from `role_reveal` at create and preserved in `mergeView`.

### Local screen state

- **NominationScreen:** sub-phases `nominate` | `voting` | `reveal` | `topEnactNotice`; per-voter timer; vote map
- **LegislativeScreen:** sub-phases for president select → face-down pass → chancellor select

---

## API consumption

| Module | Role |
|--------|------|
| `api/client.ts` | `fetch` helpers; `ApiError` with status + FastAPI `detail` |
| `api/types.ts` | DTOs matching API (`PublicView`, `ActionResponse`, etc.) |

Pattern: screens call client → update session via `mergeView` / `onSessionChange` → branch on `view.phase` / `win_reason`.

Vite (`vite.config.ts`) proxies `/api` and `/health` to port 8000.

---

## Supporting modules

| Module | Role |
|--------|------|
| `constants.ts` | `SUPPORTED_PLAYER_COUNTS` (mirrors engine) |
| `roles.ts` | Role/team types, labels, distribution display, role→playing-card mapping for win/reveal art |
| `names.ts` | Blank-name fill + duplicate detection (must match `start_game`) |
| `cardAssets.ts` | Skin file paths under `public/cards/<skinId>/`; table skin vs optional per-player skin |
| `lawCards.ts` | Re-export of law card DTO type |

Card art: `public/cards/default/` — rank+suit PNGs + `back.png`. Logic does not hardcode pixels; skins are file-based.
