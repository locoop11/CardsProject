# Plans (future work only)

Ordered implementation plans for work **not yet done**. Living system truth stays in the sibling `ai-context/*.md` files — not here.

## Rules

1. **No obsolete content.** Do not copy finished phases, old “gaps” tables, or historical code sketches from root plan files.
2. **Mine, don’t move.** Root files `inicial_Plan.md`, `class_design.md`, and `planFileUI.md` are temporary sources. The Planner extracts only still-valid unfinished work into new files here; then those root files can be deleted.
3. **One concern per file.** Clear goal, scope, acceptance criteria, dependencies.
4. **When shipped:** remove the plan file (or the Documentation Agent archives it out of this folder). Finished work updates living `ai-context/` maps instead.

## Naming (order + distinction)

Use a zero-padded sequence prefix so agents can sort by priority:

```text
NN-short-kebab-name.md
```

Examples:

- `01-multi-device-privacy.md`
- `02-ui-legislative-on-table.md`
- `99-out-of-scope.md` — reserved for explicit “won’t do in v1” items (not a build queue)

Lower number = do sooner. Gaps in numbering are fine after deletions.

## Suggested plan skeleton

```markdown
# NN — Title

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
Pointers into living ai-context files (contracts, maps) — not duplicated rules.
```

## Current plans

| File | Concern |
|------|---------|
| `01-multi-device-privacy.md` | Per-device role/hand privacy (API building block exists; product path not wired) |
| `99-out-of-scope.md` | Explicit v1 non-goals (eliminations, online multiplayer, persistence, full settings UI, crypto shuffle, other games) |
