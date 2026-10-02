# 02 — Bottom-anchor seat layout

**Kind:** feature  
**Status:** ready  
**Depends on:** none (UI-only; can ship before or after `01`)  
**Priority:** v2 phase 2

## Goal

Change the shared table geometry so seats are anchored at **bottom-center**, and add a pure **rotation helper** so multi-device clients can place “me” in that anchor without a second layout system. Pass-and-play uses the same geometry with an unrotated player list.

## Why

v1 `TableBoard` starts the perimeter walk mid-top (`seatPosition` in `frontend/src/screens/TableBoard.tsx`). For 5 players that puts one seat top-center and none at bottom-center. Multi-device needs “this phone’s player at lower middle” while preserving clockwise seat order — reuse one geometry + rotate display order.

## In scope / out of scope

**In scope**

- Change `seatPosition` start to **mid-bottom** (clockwise preserved).
- Verify visually for player counts **5–10** (overlaps with law oval / name cards).
- Pure helper (e.g. `seatLayout.ts`): `rotatePlayersForViewer(players, viewerPlayerId)` — viewer at display index 0; relative order unchanged.
- Pass-and-play: unrotated list (no viewer id).
- Multi-device (later `03`): pass rotated list for display only; API payloads always use real `player.id`.

**Out of scope**

- Accounts, rooms, privacy authz (`01`, `03`).
- Engine seat shuffle / presidency order changes.
- Redesigning card art or law oval beyond what seat collision fixes require.

## Acceptance criteria

- [ ] With 5 players, a seat sits at bottom-center on pass-and-play (no viewer rotation).
- [ ] Rotation helper places `viewerPlayerId` at bottom-center and keeps clockwise neighbors correct.
- [ ] Nominate/vote still target real player ids (never display index as identity).
- [ ] Pass-and-play gameplay unchanged aside from seat positions.

## Notes for implementers

- Current start: mid-top — see `seatPosition` comment “Start mid-top…” in `TableBoard.tsx`.
- Unit-test the rotation helper; manual check odd/even counts.
- Do not send rotated order to the API.
