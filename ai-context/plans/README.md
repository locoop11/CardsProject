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

Ready plans (`01`–`03`) include a **Developer starting point**: suggested order, files to create/modify, and what not to touch.

| File | Concern | Status |
|------|---------|--------|
| `00-data-entities.md` | **Reference:** what we store, tiers A–D, field-level entities | locked catalog (not a build ticket) |
| `01-accounts-auth.md` | Login-first UI, guest→v1 only, Games hub (v1/v2…), accounts API | ready — v2 phase 1 |
| `02-seat-layout-anchor.md` | Bottom-center seat geometry + viewer rotation helper | ready — v2 phase 2 |
| `03-multi-device-privacy.md` | Option A privacy, rooms/join, authz, multi-device play | ready — v2 phase 3 |
| `04-per-player-owned-skins.md` | Per-player owned Hitler/role packs | proposed — deferred |
| `05-hybrid-table-phone-local.md` | v3 hybrid table phone + personal phones | proposed — deferred |
| `06-google-oauth.md` | Google / social login | proposed — **last** |
| `99-out-of-scope.md` | Explicit v1 non-goals | n/a |

**Superseded / removed:** `02-multi-device-privacy.md` (old privacy-theater plan). Do not revive. Privacy = `03` only; seat layout = `02-seat-layout-anchor.md`.

**Execute order:** `01` → `02` → `03`. Do not start `03` until `01` local auth works **and** auth layering acceptance criteria in `01` pass.

## Standing structure rule (platform, games, persistence)

Locked direction for v2+: **Option A — pragmatic N-layered API**, communication over **HTTP + JSON**. Durable resources use **CRUD-shaped** endpoints (create/read/update/delete or clear equivalents). Gameplay actions stay **command-shaped** HTTP (`POST …/nominate`, `…/vote`, etc.) — not forced into fake CRUD.

### Layers (every durable feature)

```
HTTP (routes, deps, Pydantic)  →  service (rules)  →  repository (SQL)  →  db (connect/schema)
```

- **Do not** put SQL in routes or services. **Do not** put HTTP/cookies in repositories.
- **Do not** introduce an ORM unless a future plan explicitly adopts one.
- Full Clean Architecture / ports-and-adapters / DDD aggregates are **out of scope** unless a dedicated plan justifies them.

### Platform vs game packages (multi-game ready)

This repo will host **more than one game**. Organize so shared shell and per-game logic do not merge:

| Kind | Lives in | Examples |
|------|----------|----------|
| **Platform (shared)** | `api/auth/`, `api/db.py`, accounts, future shared lobby helpers; frontend shell (`Login`, `GamesHub`, account) | Identity, session cookies, hub catalog |
| **Game domain** | One Python package per game (today: `secret_cards/`) | Rules, phases, wins — never in FastAPI routes |
| **Generic card primitives** | `cards/` only | Piles/tables; **no** game rules; reusable by every game |
| **Game HTTP** | Dedicated router module per game (today: `api/routes.py` for Secret Cards) | Thin: validate → call engine → map errors → JSON |
| **Game UI** | Screens/session helpers scoped to that game; hub only lists entries | Secret Cards flow stays out of unrelated games |

**Rules**

1. **New game = new domain package + its own HTTP router + its own UI flow** — do not stuff foreign rules into `secret_cards/`.
2. **Hub is data-driven** (`gameCatalog` / equivalent): add a catalog entry; do not rewrite the app shell per game.
3. **Auth and accounts are platform** — all games reuse the same session; guests remain a frontend mode unless a later plan changes that.
4. **Path naming (evolve carefully):** keep today’s `/api/games/*` for Secret Cards until a dedicated rename/migration plan; **new** games should prefer `/api/<game-slug>/…` so namespaces stay clear. Do not globally rename in `01`.
5. Ephemeral play state may stay in-memory (`api/session.py` or per-game store) until a plan requires durable rooms/DB.

See `01-accounts-auth.md` → **Auth layering** for the auth module map. Second-game product work remains deferred (`99`) until explicitly planned — but **structure for it starts now**.

## Current bug plans

_(None — add `bug-NN-…` files here when open defects are planned.)_
