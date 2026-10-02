# 99 — Out of scope for v1

**Status:** proposed (explicit non-goals — not a build queue)  
**Depends on:** n/a

## Goal

Record unfinished ideas that remain **intentionally not part of v1**, so agents do not treat them as current v1 implementation work.

## Why

Legacy root plans mixed shipped work and deferred product ideas. This file keeps the deferred “won’t do in v1” list. Items **promoted** into numbered v2/v3 plans are tracked there instead.

## In scope / out of scope

This file does not schedule implementation. Items below stay out of the **v1 pass-and-play** product unless a human promotes one into a numbered plan.

## Deferred / won’t do in v1

| Item | Still true because… |
|------|----------------------|
| Player eliminations / presidential powers / investigation powers | `Player.is_alive` exists but unused; no powers in engine |
| Multi-worker shared game state / durable game rooms as a generic platform | Games still process-local until a future persistence plan beyond `03` rooms |
| Action-log / stats **persistence** and replay storage | `action_log` is appended in-process; not persisted or exposed on public views |
| Full configurable **engine** settings UI (term limits, voting window, etc.) | Engine `Settings` toggles exist as defaults only; pre-game hub is shipped — this row is only about engine rule toggles |
| Other games built on `cards/` | Package stays game-agnostic; no second game |
| Cryptographically strong default RNG (`secrets.SystemRandom`) | Enough for local shared-device play; crypto RNG is online hardening — promote separately if needed after multi-device |

## Promoted out of this table (tracked as plans)

| Item | Plan |
|------|------|
| Accounts / authentication | `01-accounts-auth.md` |
| Bottom-anchor seats + rotation | `02-seat-layout-anchor.md` |
| Multi-device Option A privacy + rooms/join | `03-multi-device-privacy.md` |
| Per-player owned skin packs | `04-per-player-owned-skins.md` |
| Hybrid table-phone local (v3) | `05-hybrid-table-phone-local.md` |
| Google / social OAuth | `06-google-oauth.md` |

## Acceptance criteria

- [ ] Agents treat this file as **non-goals for v1**, not as tasks to implement unless the human splits an item into a new numbered plan.
- [ ] Living maps (`ai-context/*.md`) remain the source of truth for what **is** built today.

## Notes for implementers

- Do not implement items here “while you’re in the area.”
- If a deferred item becomes active work, create/update a numbered plan and trim it from the deferred table above.
