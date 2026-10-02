# Card skins (Option A)

Each skin is a folder under `public/cards/<skinId>/`. A pack exposes **three catalogs**:

| Catalog | Purpose |
|---------|---------|
| **Hitler** | Single special face |
| **Role** | Communist / fascist art (Hitler uses the Hitler catalog) |
| **Law** | Faces for legislative / enacted laws |

UI code resolves art only through helpers in `src/cardAssets.ts`:

- `resolveHitler(skinId)`
- `resolveRole(skinId, role, sameRoleIndex?)`
- `resolveLaw(skinId, color, number)`
- `cardBackSrc(skinId)` (and optional `cardTeamBackSrc`)

Do not branch on pack shape inside screens.

## `default` (poker)

- **Hitler** → `AS.png` (Ace of Spades)
- **Role** → poker faces via `roleToPlayingCard` (Hitler still AS; fascists black non-ace; communists red)
- **Law** → poker faces **excluding Ace of Spades** (black ace laws render as `AC.png`)
- `back.png` — face-down

Face files use `RANKSUIT.png` (`A`, `2`…`10`, `J`, `Q`, `K` + `S|H|D|C`).

## Custom pack layout (e.g. `party`)

```text
frontend/public/cards/<skinId>/
  hitler.png
  role-fascist.png
  role-communist.png
  law-fascist.png       # black laws (optional)
  law-communist.png     # red laws (optional)
  back.png
  back-fascist.png      # optional
  back-communist.png    # optional
```

If law files are omitted, `resolveLaw` falls back to the default poker law catalog.
## Add a whole-table preset

1. Create `public/cards/mySkin/` with the files above.
2. Register it in `src/cardAssets.ts` (`CardSkinId`, `CARD_SKIN_IDS`, `CARD_SKIN_LABELS`, `SKINS`).
3. It appears automatically on the Card set skin settings page.

v1 settings pick **one whole-table preset**. Per-player owned packs are deferred.
