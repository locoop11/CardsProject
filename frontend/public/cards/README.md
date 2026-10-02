# Card skins

Each skin is a folder under `public/cards/<skinId>/`.

## Required files

- `back.png` (or `.svg` / `.webp`) — face-down card (configure name in `src/cardAssets.ts`)
- Face images named `RANKSUIT.png`:
  - Ranks: `A`, `2`…`10`, `J`, `Q`, `K`
  - Suits: `S` spades, `H` hearts, `D` diamonds, `C` clubs
  - Examples: `AS.png`, `10H.png`, `KD.png`

## Add a new skin

1. Create `public/cards/mySkin/` with the same filenames.
2. Register it in `src/cardAssets.ts` (`CardSkinId` + `SKIN_SUITS`).
3. Set `ACTIVE_CARD_SKIN = 'mySkin'` (or add a UI picker later).

Game logic never hardcodes art paths — only color + rank.
