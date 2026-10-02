# 04 — Per-player owned skin packs (future)

**Kind:** feature  
**Status:** proposed (deferred — after multi-device)  
**Depends on:** `01-accounts-auth`; whole-table Option A catalogs already in the UI (`cardAssets` / settings skin picker)

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
- Purchases / storefront implementation details until product defines them.

## Relationship to current app

| Now (shipped / `01`) | Later (`04`) |
|----------------------|--------------|
| One `cardSkin` for the whole table (or account table skin when logged in on pass-and-play) | Per-player overrides for Hitler / roles |
| Pack = full preset (three catalogs) | Player may mix owned packs per catalog |
| Accounts in `01` | Ownership + equip enforcement |

Keep `resolveHitler` / `resolveRole` / `resolveLaw(skinId, …)` so `skinId` can later come from the player profile.

## Acceptance criteria (for when scheduled)

- [ ] Documented product rule for which art appears on shared vs private surfaces.
- [ ] Per-player Hitler and role art can differ in one game session.
- [ ] Law art behavior explicitly decided and implemented (or explicitly “table preset only”).
- [ ] Ownership enforced server-side (players cannot equip packs they do not own).

## Notes for implementers

- Option A catalogs: `frontend/src/cardAssets.ts` and settings skin UI; `ai-context/decisions.md`.
- Prefer extending resolve helpers over scattering per-player conditionals in every screen.
- Pass-and-play logged-in behavior in `01` is **whole-table account skin**, not this plan.
