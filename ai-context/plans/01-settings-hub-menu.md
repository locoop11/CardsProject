# 01 — Settings hub menu

**Status:** ready  
**Depends on:** none  
**Priority:** highest — implement before other numbered plans

## Goal

Replace the linear pre-game flow (`SettingsScreen` → `NamesScreen`) with a **settings hub**: inline **player count**, sub-pages for **player names** and **card-set skin**, **Back** to hub, **Start game** on hub.

Skin selection for this ticket is **one whole preset pack for the table** (not per-player). Packs use **Option A**: three card-type catalogs — **role**, **law**, **Hitler**.

## Why

Hub UX scales as options grow. Separating role / law / Hitler catalogs matches the product model and keeps a clean path to future per-player ownership (`03-per-player-owned-skins.md`) without rewriting screens.

## Locked skin model (Option A)

Every registered pack exposes three catalogs (files or derived rules):

| Catalog | Purpose |
|---------|---------|
| **Hitler** | Single special face (in `default`: Ace of Spades only) |
| **Role** | Communist / fascist (and any non-Hitler role art) |
| **Law** | Faces used for legislative / enacted laws |

**`default` rules**

- **Hitler** → Ace of Spades (`AS`).
- **Law** → normal poker faces **excluding Ace of Spades**.
- **Role** → normal poker faces via existing mapping (Hitler still AS; fascists black non-ace; communists red).

**UI resolve API (implement behind helpers)**

```text
resolveHitler(skinId) → image
resolveRole(skinId, role) → image
resolveLaw(skinId, color, number) → image
```

Screens call these only — no pack-shape branching in components.

**This ticket:** settings pick a single `cardSkin` for the whole session. All players share that pack’s three catalogs.

**Not this ticket:** accounts, owned packs, different Hitler/role art per player → `03-per-player-owned-skins.md`.

## In scope / out of scope

**In scope (UI only)**

- Settings **hub** as home pre-game screen.
- **Number of players:** compact **inline** on hub (5–10); resize names array when count changes.
- **Player names:** dedicated sub-page; Back → hub; blank → `Player N`; non-blocking duplicate warning.
- **Card set skin:** dedicated sub-page; pick a **whole preset**; preview; Back → hub; hub row shows summary.
- Register at least **`default`** and first custom pack (suggested id: `party`).
- Wire role reveal / win / seat role art through `resolveRole` / `resolveHitler`.
- Wire law / deck art through `resolveLaw` (and existing back helpers as needed).
- Start game on hub → existing `POST /api/games` → role reveal; back from reveal → **hub**.
- Extensible hub rows for future settings.

**Out of scope**

- Per-player / account-owned skins (`03`).
- Engine rule toggles UI (`99-out-of-scope.md`).
- Inventing law art for the custom pack (see below).
- API/backend changes; multi-device (`02`).

## First custom pack (provided art)

Map product art into Option A catalogs:

| Asset | Catalog entry |
|-------|----------------|
| Eyepatch skull + “HITLER” | **Hitler** |
| Skull + “NAZI” | **Role** fascist |
| Grinning face + “COMUNIST” | **Role** communist |
| “NAZI RULE” party back | Optional face-down / party back (fascist) — not a law face |
| “COMUNIST RULE” party back | Optional face-down / party back (communist) |

**Suggested layout**

```text
frontend/public/cards/<skinId>/
  hitler.png
  role-fascist.png
  role-communist.png
  back-fascist.png      # optional party back
  back-communist.png    # optional party back
  # laws: omit → fall back to default law catalog
```

**Laws for this pack (for now):** use **`default` law catalog** (poker faces excluding AS) until dedicated law art exists. Do not reuse role/Hitler images as laws.

## Navigation model (hybrid C)

```text
settingsHub
  ├── [inline] player count 5–10
  ├── row → settingsNames  → Back → settingsHub
  ├── row → settingsSkin   → Back → settingsHub
  └── Start game → roleReveal → …
```

## Data / state (UI)

| State | Notes |
|-------|--------|
| `playerCount` | Existing |
| `names` | Existing; length follows count |
| `cardSkin` | Whole-table preset `CardSkinId` |
| `settingsPanel` | `hub` \| `names` \| `skin` under settings step |

No new HTTP contract.

## Acceptance criteria

- [ ] Hub: inline count, Names row, Card set skin row, Start game.
- [ ] Names and Skin sub-pages with Back → hub.
- [ ] Skin catalog implements Option A (Hitler / role / law) for `default` with AS reserved for Hitler and excluded from laws.
- [ ] Custom pack registers Hitler + role art; laws fall back to `default` until law assets exist.
- [ ] Changing pack in settings changes role/Hitler (and laws when the pack defines them) for the session.
- [ ] Start game / play-again / back-from-reveal behave as specified.
- [ ] Adding another whole preset = folder + catalog registration — no hub redesign.
- [ ] No per-player skin selection UI; no engine/API changes.

## Notes for implementers

- Today: `ai-context/frontend-map.md`, `frontend/src/cardAssets.ts`, `roles.ts` `roleToPlayingCard`.
- Future personalization: `03-per-player-owned-skins.md` — keep resolve helpers skin-id-based so a later `skinId` per player (or per catalog) can plug in.
- Update `public/cards/README.md` for the three catalogs when implementing.
- Prefer App step/panel unions over React Router.
