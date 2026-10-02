# 99 — Out of scope for v1

**Status:** proposed (explicit non-goals — not a build queue)  
**Depends on:** n/a

## Goal

Record unfinished ideas from the legacy root plans that remain **true** and are **intentionally not part of v1**, so agents do not treat them as current implementation work.

## Why

`inicial_Plan.md` / `class_design.md` / `planFileUI.md` mixed shipped work, phone-UI gaps (now largely done), and deferred product ideas. This file keeps only the deferred “won’t do in v1” list.

## In scope / out of scope

This file does not schedule implementation. Items below stay out of the v1 pass-and-play product unless a human promotes one into a numbered plan.

## Deferred / won’t do in v1

| Item | Still true because… |
|------|----------------------|
| Player eliminations / presidential powers / investigation powers | `Player.is_alive` exists but unused; no powers in engine |
| Full networked multiplayer (matchmaking, accounts, durable rooms, multi-worker sessions) | In-memory `SessionStore` only; no auth/DB |
| Action-log / stats **persistence** and replay storage | `action_log` is appended in-process; not persisted or exposed on public views |
| Full configurable **engine** settings UI (term limits, voting window, etc.) | Engine `Settings` toggles exist as defaults only; pre-game hub (names / count / card skin) is already shipped — this row is only about engine rule toggles |
| Other games built on `cards/` | Package stays game-agnostic; no second game |
| Cryptographically strong default shuffle | v1 uses injectable Python PRNG; upgrade to OS/`SystemRandom` default tracked for before online fairness (keep injectable `rng` for tests) |

## Related (tracked elsewhere)

- Pre-game settings hub + whole-table skin presets — shipped (see living `ai-context/frontend-map.md` / `decisions.md`)
- Multi-device / per-player privacy path → `02-multi-device-privacy.md`
- Per-player / account-owned skin packs (future) → `03-per-player-owned-skins.md`

## Acceptance criteria

- [ ] Agents treat this file as **non-goals for v1**, not as tasks to implement unless the human splits an item into a new numbered plan.
- [ ] Living maps (`ai-context/*.md`) remain the source of truth for what **is** built today.

## Notes for implementers

- Do not implement items here “while you’re in the area.”
- If a deferred item becomes active work, create a new `NN-short-kebab-name.md` and trim it from this table.
