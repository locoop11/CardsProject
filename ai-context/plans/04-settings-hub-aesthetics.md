# 04 — Settings hub aesthetics

**Status:** ready  
**Depends on:** `01-settings-hub-menu.md` (hub already in UI)  
**Priority:** next polish on settings hub (after core hub/skins)

## Goal

Polish the settings hub: relabel player count as **Players Number** and replace the 5–10 button grid with a **dropdown**; add a **semi-blurred CSS board** behind the hub that keeps the **centered law zone** as the visual anchor (same compositional idea as the live `TableBoard`).

## Why

Hub structure from `01` works; this pass is visual/UX only. CSS felt (not a photo) matches the in-game board, stays easy to personalize via tokens, and preserves a clear center where laws sit on the table.

## In scope / out of scope

**In scope (UI / CSS only)**

1. **Label:** Change the hub player-count heading from “Players” to **Players Number** (exact product copy).
2. **Control:** Replace `.count-grid` radiobuttons with a native `<select>` (or equivalent accessible dropdown) listing `SUPPORTED_PLAYER_COUNTS` (5–10). Changing the value still calls the same `onPlayerCountChange` / names-array resize behavior.
3. **Background:** Semi-blurred CSS board behind hub content — felt + **centered law oval** hint — so setup feels like it sits on the table.

**Out of scope**

- Photo/screenshot board backgrounds (human preferred CSS look).
- Redesigning names/skin sub-pages (optional follow-up: same backdrop later).
- New game rules, API, or skin catalog changes.
- Per-player skins (`03`).
- Changing how laws are laid out on the live game board (keep current centered oval / law tracks).

## Background approach (locked)

**Use CSS felt only** — reuse the same visual language as `.table-felt` and the centered `.table-oval` (law area). No new image asset.

On the hub:

1. Full-viewport decorative layer: felt gradient from existing `--felt-*` tokens.
2. Include a soft **centered oval / law-zone** shape (same role as the in-game board center) so the backdrop still “reads” as the table where laws go — even when blurred.
3. Apply mild `filter: blur(…)` (typical ~8–16px) on that decorative layer and/or a translucent scrim for contrast.
4. Keep hub content (header, dropdown, rows, Start) sharp above (`z-index`); do not blur the form.

**Personalization (keep easy):** Drive felt colors and oval styling through CSS variables (already partly `--felt-light` / `--felt-mid` / `--felt-deep`). Do not hardcode one-off colors only on the hub — share tokens with `.table-felt` / `.table-oval` so a future table theme or skin can restyle both the live board and the hub backdrop in one place.

**Do not:** Mount a live `TableBoard` with dummy players; do not use a stock photo.

## Acceptance criteria

- [ ] Hub label reads **Players Number**.
- [ ] Player count is chosen via a dropdown (values 5–10 only); grid of count buttons is gone from the hub.
- [ ] Changing the dropdown still updates `playerCount` and the names slot list as today.
- [ ] Hub backdrop is CSS felt (recognizable as the board), semi-blurred, with a clear **centered law-zone** cue.
- [ ] Felt/oval styling uses shared tokens (or clearly shared classes) so personalizing the board look later does not require a one-off hub rewrite.
- [ ] Foreground controls remain sharp and readable.
- [ ] No API/engine changes; live game board law layout unchanged.

## Notes for implementers

- Hub component: `frontend/src/screens/SettingsScreen.tsx` (`SettingsHubScreen`).
- Styles: `frontend/src/App.css` (`.count-grid`, `.settings-screen`, `.table-felt`, `.table-oval`, `--felt-*`).
- Keep `aria-labelledby` / `aria-label` in sync with “Players Number”.
- If blur is too strong on low-end phones, prefer milder blur + stronger scrim rather than removing the felt/oval.
