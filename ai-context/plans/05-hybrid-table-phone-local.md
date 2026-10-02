# 05 — Hybrid table-phone local play (v3)

**Kind:** feature  
**Status:** proposed  
**Depends on:** `01-accounts-auth`, `02-seat-layout-anchor`, `03-multi-device-privacy`  
**Priority:** lowest — remember only; do not implement until human promotes

## Goal

Local in-person play that combines v1 table UX with v2 phones: everyone is on their phone with an account; **one designated table device** shows the full public law board; phones hold private identity/roles/hands; some actions (e.g. voting scenes) may still use a grabbed/shared phone for table-side actions.

## Why

Physical groups may want a shared “table” screen for laws while keeping per-player privacy on phones. This is a conversion of pass-and-play + multi-device, not a replacement for either until both are solid.

## In scope / out of scope (when promoted)

**Likely in scope**

- Role: **table host** device vs **player** devices.
- Table device: public board / full enacted laws; no other seats’ private roles.
- Player devices: account-bound seats, private role/hand, rotated “me” layout from `02`.
- Clarify which actions stay on the table phone vs personal phones.

**Out of scope until promoted**

- Any implementation work.
- Redesigning engine rules solely for this mode.

## Acceptance criteria (placeholder)

- [ ] Product rules for table vs phone responsibilities documented and approved.
- [ ] Table device never receives other players’ mid-game roles/hands (Option A).
- [ ] Player devices remain bound to one seat each.

## Notes for implementers

- Do not start this while `01`–`03` are open.
- Living maps and v2 plans are the active source of truth until this file is promoted to `ready`.
