# 02 — Bottom-anchor seat layout

**Kind:** feature  
**Status:** ready  
**Depends on:** none (UI-only; accounts/`01` already shipped)  
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

## Developer starting point

**Suggested order:** (1) Change `seatPosition` start offset to mid-bottom → (2) manual visual check 5 then 6–10 → (3) extract/add `rotatePlayersForViewer` → (4) unit test helper → (5) optionally accept `viewerPlayerId` on `TableBoard` but leave pass-and-play callers unrotated until `03`.

**Do not touch:** `api/**`, `secret_cards/**`, nominate/vote API payloads.

### Files likely to create

| Path | Purpose |
|------|---------|
| `frontend/src/seatLayout.ts` | `rotatePlayersForViewer(players, viewerPlayerId)`; keep pure / easy to test |
| `tests/frontend/…` or colocated test | Only if the repo gains a TS/pytest home for it; otherwise document manual checks. Today frontend automated coverage is thin (`tests/frontend/test_card_skin_catalog.py` is Python catalog check) — prefer a small pure function + manual board check unless you add a vitest later |

### Files likely to modify

| Path | Change |
|------|--------|
| `frontend/src/screens/TableBoard.tsx` | `seatPosition`: change `start` from mid-top (`width / 2`) to mid-bottom (after walking top + right sides, or set `start` so index 0 lands on bottom center). Comment update. Optional prop `viewerPlayerId` that rotates `players` **for rendering only**. |
| Call sites (`NominationScreen`, `LegislativeScreen`, `WinScreen`) | Usually **no change** for pass-and-play; only pass `viewerPlayerId` when `03` lands |

### Direction notes

- Today the function comments say: *“Start mid-top, walk clockwise…”* — invert so index `0` is mid-bottom, still clockwise.
- Rotation: find viewer index `i`, return `players.slice(i).concat(players.slice(0, i))`.
- Seat taps must still use `player.id` from the (possibly rotated) objects — ids travel with the objects, so taps stay correct if you rotate the array of player objects, not bare indices.

## Notes for implementers

- Primary bug/feature locus: `seatPosition` in `TableBoard.tsx` (~lines 46–98).
- Do not send rotated order to the API.
