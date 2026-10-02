# 03 — Per-player owned skin packs (future)

**Status:** proposed (deferred — not v1)  
**Depends on:** whole-table Option A catalogs already in the UI (`cardAssets` / settings skin picker), accounts / identity (not built)

## Goal

After accounts exist, let each player **own** skin packs and apply personalization — especially **role** and **Hitler** art — so two players at the same table can show different Hitler (or role) skins. **Law** personalization is intentionally undecided.

## Why

Product direction: skins become collectible / owned, not only a single table preset. Role and Hitler cards are naturally per-player (private reveal, seat art). Laws are shared board objects, so ownership rules need a separate product decision later.

## In scope / out of scope (when this becomes active)

**Likely in scope**

- Account inventory of owned packs.
- Per-player choice of **Hitler** and **Role** catalog entries (from packs they own).
- Table still needs a rule for whose art is shown when (e.g. each seat uses that player’s role/Hitler art on reveal/win).
- Reuse Option A resolve helpers, extended to accept a per-player skin (or per-catalog override) instead of only the table preset.

**Out of scope until decided**

- How **law** cards pick art when players own different law packs (shared deck / majority / host preset / etc.).
- Implementation of auth, store, purchases, or multiplayer accounts (blocked on product + backend).

## Relationship to current app

| Now (shipped) | Later (`03`) |
|---------------|----------------|
| One `cardSkin` for the whole table | Per-player overrides for Hitler / roles |
| Pack = full preset (three catalogs) | Player may mix owned packs per catalog |
| No accounts | Requires accounts + ownership |

Keep `resolveHitler` / `resolveRole` / `resolveLaw(skinId, …)` so `skinId` can later come from the player profile.

## Acceptance criteria (for when scheduled)

- [ ] Documented product rule for which art appears on shared vs private surfaces.
- [ ] Per-player Hitler and role art can differ in one game session.
- [ ] Law art behavior explicitly decided and implemented (or explicitly “table preset only”).
- [ ] Ownership enforced server-side (players cannot equip packs they do not own).

## Notes for implementers

- Option A catalogs: live in `frontend/src/cardAssets.ts` and settings skin UI; settled direction in `ai-context/decisions.md`.
- Accounts / online multiplayer also listed under `99-out-of-scope.md` until promoted.
- Prefer extending resolve helpers over scattering per-player conditionals in every screen.
