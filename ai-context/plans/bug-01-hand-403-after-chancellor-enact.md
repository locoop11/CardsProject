# bug-01 — GET /hand 403 after chancellor enact

**Kind:** bug  
**Status:** ready  
**Severity:** high (noisy API errors; sometimes user-visible error on legislative screen)  
**Layer:** UI  
**Depends on:** none

## Symptom

**Expected:** After a successful `POST /api/games/{id}/chancellor-enact`, the legislative UI shows the “Law enacted” / continue state (or win). No further `GET .../hand` for that round. No hand-access error.

**Actual:** API console shows `403 Forbidden` on:

`GET /api/games/{id}/hand?viewer_id=pN`

immediately after chancellor enact, before the next nominate/vote cycle. Sometimes the UI shows: “Viewer is not allowed to see the legislative hand”.

## Root cause

Verified in code (not assumed):

1. `LegislativeScreen` loads the hand in a `useEffect` depending on `[session.gameId, prez.id]`, where `prez = president(session)` tracks the **live** session president (`frontend/src/screens/LegislativeScreen.tsx`).
2. On enact (`confirmChancellorDiscard`), the engine advances the round (`chancellor_enact` → `advance_round`), which increments `president_index` (`secret_cards/engine/legislative.py`, `secret_cards/engine/advance.py`).
3. Frontend applies `onSessionChange(mergeView(...))` with that new view, then sets local phase to `'done'`. The screen **stays mounted** (`App.tsx` remounts only on `legislativeKey` for a **new** government).
4. Live `prez.id` changes → effect re-runs `getHand` for the **next** president.
5. Phase is no longer `legislative_*` → `legislative_hand` returns `None` → API correctly responds **403** (`secret_cards/views.py`, `api/routes.py`).

**Conclusion:** UI bug. API 403 is correct privacy behavior.

## Fix

Fetch the hand only for the president who **started** this legislative mount, not whoever `session` says is president after enact.

`LegislativeScreen` already remounts each round via `key={legislativeKey}` in `App.tsx`, so a mount-stable id is enough, e.g. capture once with `useState` from the initial `president(session).id` and use **that** id (and only that + `gameId`) in the effect deps — **not** live `prez.id`.

Optional hardening: skip / don’t start a hand fetch when local phase is already `'done'` (mount-stable id alone should stop the spurious request).

## In scope / out of scope

**In scope**

- Fix hand-fetch identity / effect deps in `LegislativeScreen.tsx` as above.
- Confirm no error banner after a normal enact → continue path.

**Out of scope**

- Loosening API hand access or changing `legislative_hand` 403 rules.
- Treating double `GET /hand` on first enter (React Strict Mode) as this bug.
- Fair-randomness work (`01-fair-randomness-and-probabilities.md`).

## Acceptance criteria

- [ ] After chancellor enact (non-win), no `GET .../hand` is issued for the **new** president while still on the legislative “done” screen.
- [ ] No user-visible “Viewer is not allowed to see the legislative hand” after a successful enact.
- [ ] Entering a new legislative round (new `legislativeKey`) still loads the hand once for that round’s president.
- [ ] API hand authorization unchanged (wrong viewer / wrong phase still 403).

## Notes for implementers

- UI: `frontend/src/screens/LegislativeScreen.tsx` (`useEffect` ~lines 61–78; `confirmChancellorDiscard`).
- Remount: `frontend/src/App.tsx` `key={legislativeKey}`.
- Server (do not change for this bug): `secret_cards/views.py` `legislative_hand`, `api/routes.py` `GET .../hand`.
- Contracts: `ai-context/api-contracts.md` (hand requires authorized `viewer_id` for current legislative office).
