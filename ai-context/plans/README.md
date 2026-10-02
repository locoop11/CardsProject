# Plans (future work only)

Ordered plans for work **not yet done**. Living system truth stays in the sibling `ai-context/*.md` files — not here.

**Ownership:** Planner Agent maintains files in this folder. Documentation Agent updates living maps (`architecture.md`, contracts, decisions, etc.) after features ship — not these plan files.

## Two plan kinds (keep them distinct)

| Kind | Filename | Purpose |
|------|----------|---------|
| **Feature** | `NN-short-kebab-name.md` | New capability, enhancement, or deferred product work |
| **Bug** | `bug-NN-short-kebab-name.md` | Fix incorrect behavior; must include symptom + root cause from code |

Rules that apply to **both**:

1. **No obsolete content.** Do not copy finished work or historical sketches.
2. **One concern per file.**
3. **When shipped:** remove the file (or archive out of this folder). Living maps update via Documentation Agent.

**Do not** mix kinds in one file. **Do not** use a feature skeleton for a bug (or vice versa). Bug files always start with the `bug-` prefix so they sort and read as defects.

Lower `NN` = higher priority **within that kind**. Feature `01` and bug `01` are unrelated queues; triage bugs vs features with the human when both are open.

---

## Feature plan — naming & skeleton

```text
NN-short-kebab-name.md
```

```markdown
# NN — Title

**Kind:** feature
**Status:** proposed | ready | blocked
**Depends on:** (other plan ids, or none)

## Goal
One paragraph.

## Why
Product or technical reason (non-obsolete only).

## In scope / out of scope

## Acceptance criteria
- [ ] …

## Notes for implementers
Pointers into living ai-context files — not duplicated rules.
```

Special: `99-out-of-scope.md` — explicit “won’t do in v1” (not a build queue).

---

## Bug plan — naming & skeleton

```text
bug-NN-short-kebab-name.md
```

```markdown
# bug-NN — Short title

**Kind:** bug
**Status:** proposed | ready | blocked
**Severity:** blocker | high | medium | low
**Layer:** UI | server | both
**Depends on:** (none, or related plans)

## Symptom
What the user / logs show (expected vs actual).

## Root cause
Evidence-based; cite files / behavior. Do not guess.

## Fix
What to change and why it addresses the root cause (no large production code dumps).

## In scope / out of scope

## Acceptance criteria
- [ ] …

## Notes for implementers
Pointers into living ai-context / code.
```

---

## Current feature plans

**v1 pass-and-play** is complete for product scope. Open plans below are **v2 / v3** work.

| File | Concern | Status |
|------|---------|--------|
| `01-accounts-auth.md` | Accounts, cookies, username/email + password, display name, account table skin | ready — v2 phase 1 |
| `02-seat-layout-anchor.md` | Bottom-center seat geometry + viewer rotation helper | ready — v2 phase 2 |
| `03-multi-device-privacy.md` | Option A privacy, rooms/join, authz, multi-device play | ready — v2 phase 3 |
| `04-per-player-owned-skins.md` | Per-player owned Hitler/role packs | proposed — deferred |
| `05-hybrid-table-phone-local.md` | v3 hybrid table phone + personal phones | proposed — deferred |
| `06-google-oauth.md` | Google / social login | proposed — **last** |
| `99-out-of-scope.md` | Explicit v1 non-goals | n/a |

**Superseded / removed:** `02-multi-device-privacy.md` (old privacy-theater plan). Do not revive. Privacy = `03` only; seat layout = `02-seat-layout-anchor.md`.

## Current bug plans

_(None — add `bug-NN-…` files here when open defects are planned.)_
