# Secret Cards — UI Plan (Pass-and-Play Phone)

Companion to `inicial_Plan.md`. This file locks **phone tabletop UI** requirements
and how we will solve them. Engine rules stay in the locked plan; this doc is
presentation / interaction only.

**Scope:** single-device pass-and-play on a cell phone.  
**Out of scope here:** multi-phone privacy (Phase 4.2), new game rules.

---

## Goals

1. The **felt table fills the phone screen** (primary surface).
2. Secondary UI (confirm, vote, results) **overlays** the table — it does not push
   the table into a small strip above a form.
3. Interactions stay **table-first**: tap seats, not long lists under the board.
4. Vote feedback is **visual** (seat borders, deck cue), not long paragraphs.
5. **Every player decision is two taps** (select → confirm) so mis-taps can be undone.
6. Legislative draw/discard happens **on the table as a card overlay**, not in a boxed panel under the board.

---

## Requirements (locked from reports)

### R1 — Table color
- Felt / table background: **light blue** (not green).
- Keep readable contrast for white outlines, name plates, and law slots.

### R2 — Chancellor nomination via seat tap + confirm
- President does **not** pick from a grid under the table.
- Flow:
  1. President taps the **name/seat** of the desired chancellor (eligible only).
  2. A **popup** asks to confirm that player as chancellor.
  3. Confirm → start the pass-and-play voting sequence.
  4. Cancel → close popup; table stays as-is.
- Ineligible seats (president, previous chancellor when barred, already rejected
  this round) must not open the confirm popup (or show a brief “not eligible”).

### R3 — Table fills all available phone area; overlays for the rest
- The table (felt + seats + center law zone) uses **almost the full viewport**.
- Header / brand should be minimal or overlaid so it does not steal vertical room.
- Nomination confirm, voting, and vote-reveal UIs are **modals / sheets over the
  table**, not stacked layout blocks that shrink the table.

### R4 — Voting popup: keep it focused
- Do **not** show a full “Government: President + Chancellor” summary block.
- Show clearly **who must vote now** (name / pass prompt).
- Show **Ja / Nein** (and timer if we keep the 10s rule).
- Everything else stays on the table underneath.

### R5 — Vote reveal: borders instead of a text list
- After all votes resolve, do **not** use a Ja/Nein text list as the main reveal.
- On the table, mark each seat:
  - **Ja** → green border on that player’s seat (name and/or role card pair).
  - **Nein** → red border (or a distinct non-green border — default **red** for Nein).
- Optional small Ja/Nein label on the seat is fine if it stays secondary to the border.

### R6 — Post-vote banner above the law zone
- Still **inside the felt**, but **above** the rounded rectangle that holds
  enacted LawCards (not inside that law box).
- If government **approved**:
  - Show a small **deck / card-pile image**.
  - Show text **“Vote Approved”** in **green**.
- If government **rejected**:
  - **No** deck image.
  - Show text **“Vote Rejected — Try again”** in **red**.
- Banner clears when the table returns to a calm nomination state (or when
  continuing into legislative / next nominate).

### R7 — President draw / discard on the table (after Vote Approved)
- After approval, the **deck pile** (R6) is tappable by the president to draw.
- Draw opens a **card overlay on top of the table**:
  - Table stays visible underneath.
  - **No settings/box panel** behind the cards (no white card chrome frame).
  - The **only clickable targets** are the three LawCards (and later confirm controls
    for the two-tap rule — see R8). Seats, banner text, etc. are not active.
- President discard sequence:
  1. Three LawCards appear face-up over the board.
  2. President selects which card to discard (tap 1) and confirms discard (tap 2).
  3. That card **disappears** (returned to deck in engine terms).
  4. The **remaining two** flip / show **face down**.
  5. **Only then** show the popup to **pass the phone** to the chancellor.
- Chancellor phase (same interaction pattern, still table overlay):
  1. After pass confirm, chancellor reveals the two face-down cards.
  2. Selects one to discard (tap 1) + confirms (tap 2); the other is enacted.
  3. Same two-tap rule (R8); no boxed panel under the table.

### R8 — Two-tap confirmation on every decision
- Any meaningful choice requires **two clicks** so a mis-tap can be corrected:
  1. **Select** the option (seat, Ja/Nein, LawCard, etc.).
  2. **Confirm** in a popup or explicit Confirm control.
- Cancel / change selection must be available between select and confirm.
- Applies at least to:
  - Nominate chancellor (already R2)
  - Cast Ja / Nein (select vote → confirm)
  - President discard card
  - Chancellor discard card (enact remaining)
  - Drawing from the deck (tap deck → confirm “Draw 3 LawCards?”) optional but
    preferred for consistency
- Timeouts (10s vote window) still count as Nein if no confirmed vote; document
  that confirming must fit inside the window or pause the timer while confirm is open
  (prefer: **pause / hold timer while confirm popup is open**).

---

## Current → target (gaps)

| Area | Today | Target |
|------|--------|--------|
| Felt color | Green | Light blue (R1) |
| Nominate | Nominee grid under table | Tap seat → confirm popup (R2) |
| Layout | Table + controls stacked | Table full-bleed; overlays (R3) |
| Voting UI | Large block under table + government text | Overlay focused on voter + Ja/Nein (R4) |
| Reveal | Text vote list | Seat borders green/red (R5) |
| After resolve | Text only in phase header | Deck + Approved / Rejected banner above laws (R6) |
| Legislative | Separate screen + boxed hand UI | Draw from deck on table; cards overlay felt; then pass popup (R7) |
| Decisions | Often single click | Select + confirm everywhere (R8) |

---

## Solution design

### 1. Layout shell (`table-layout`)

```
┌─────────────────────────────┐
│  [minimal brand / round]    │  ← optional thin overlay, not a big header stack
│ ┌─────────────────────────┐ │
│ │        FELT TABLE       │ │  ← height ~ full remaining viewport
│ │  seats around edges     │ │
│ │                         │ │
│ │   [R6 banner / deck]    │ │
│ │   ┌───────────────┐     │ │
│ │   │ law tracks    │     │ │
│ │   └───────────────┘     │ │
│ │                         │ │
│ │  [3 LawCards overlay]   │ │  ← R7: cards only, no box panel
│ └─────────────────────────┘ │
│                             │
│  ┌─ overlay when needed ─┐  │
│  │ confirm / vote / pass │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

**CSS approach**
- Felt: `position` filling the main stage; `width: 100%`; height from `dvh`
  minus a tiny top chrome.
- Overlays: `position: fixed` or absolute within the screen; dimmed backdrop
  for popups; **card overlay** uses transparent hit-layer (no white panel).
- Nomination / legislative flows stop using large `settings-block` panels *below*
  the table for pick/vote/hand; those become overlay or on-felt components.

### 2. Color tokens (R1)

Add CSS variables, e.g.:

- `--felt-light`, `--felt-mid`, `--felt-deep` — cool light-blue family
- Keep law red/black, Ja green, Nein red as semantic accents

Replace the green radial gradient on `.table-felt` only; do not force the whole
app chrome to blue unless we later unify pre-game screens.

### 3. Seat interaction (R2)

**State on nomination screen**

- `pendingNomineeId: string | null` — opens confirm overlay
- Eligible set from `session.eligibleIds` (already from API)

**Behavior**

- Tap eligible seat → set `pendingNomineeId`
- Confirm → existing API `nominate` then enter voting overlay phase
- Ineligible tap → ignore or short toast

**Visual**

- Eligible seats: subtle affordance (hover/press) while president is choosing
- President seat: keep existing office mark; not tappable as nominee

### 4. Overlays (R3, R4, R8)

Overlay modes (names illustrative):

1. **`ConfirmChancellorOverlay`** — “Choose {name} as chancellor?” Confirm / Cancel  
2. **`VoteOverlay`** — “Pass to {voter}” + timer + Ja / Nein select → confirm (R8)  
3. **`VoteOutcomeChrome`** — R6 banner on table; R5 borders; Continue if needed  
4. **`ConfirmDrawOverlay`** — after tapping deck: “Draw LawCards?” (R7 + R8)  
5. **`ConfirmDiscardOverlay`** — “Discard this LawCard?” / chancellor equivalent  
6. **`PassPhoneOverlay`** — only after president discard + remaining cards face down  

Voting overlay must **omit** government composition text (R4).

### 5. Vote borders (R5)

After `resolve-votes`, keep `lockedReveal: Record<playerId, boolean>` and map onto
`TableBoard`:

- Prop e.g. `voteBorders?: Record<string, 'ja' | 'nein'>`
- CSS: `.table-seat.vote-ja` green border; `.table-seat.vote-nein` red border
- Clear borders when leaving reveal / starting next nomination

### 6. Outcome banner + deck (R6, R7)

On `TableBoard` (or a child above the law rectangle):

- Props: `voteOutcome: 'approved' | 'rejected' | null`
- Approved: **tappable** deck graphic + green “Vote Approved”
- Rejected: red “Vote Rejected — Try again” only (deck not shown)

Placement: **above** `.table-oval` (law box), still on the felt.

### 7. Legislative card overlay (R7)

**President path**

1. `voteOutcome === 'approved'` and deck visible/tappable  
2. Tap deck → (R8) confirm draw → API already has hand from resolve, or fetch hand  
   (engine draws on approve; UI may only *reveal* the three cards here)  
3. Show three face-up LawCards centered over felt; pointer-events only on cards +
   confirm UI; dim or ignore rest of table  
4. Select card → confirm discard → `president_discard` API  
5. Animate: discarded card removed; other two → face-down backs  
6. Then **`PassPhoneOverlay`** to chancellor (not before face-down)

**Chancellor path**

1. Pass overlay dismissed / chancellor ready → reveal two face-down → face-up  
2. Select discard → confirm → API `chancellor_enact` with the *other* card id  
3. Clear overlay; update law tracks on table  

**Important:** No boxed “settings-block” hand panel under the table.

### 8. Two-tap pattern (R8)

Shared UX pattern:

```
idle → selected (highlight) → confirm popup → commit API / advance
                ↘ clear selection / cancel popup → idle
```

Reusable component idea: `ConfirmAction({ title, onConfirm, onCancel })`.

Vote timer: **pause while confirm popup is open** so players are not punished for
being careful.

### 9. What stays under / outside overlays

Keep as non-table UI only when necessary:

- Pre-game: settings, names, role reveal (unchanged for this plan)
- Win screen: can keep table + role list for now

---

## Implementation order (when coding starts)

Do **not** implement in this document’s task. Suggested sequence later:

1. **R1 + R3** — light-blue felt; resize table to full phone stage; slim chrome  
2. **R2 + R8 (nominate)** — seat tap + confirm overlay; remove nominee grid  
3. **R4 + R8 (vote)** — voting overlay; select then confirm Ja/Nein; pause timer  
4. **R5 + R6** — seat borders + approved/rejected banner with deck cue  
5. **R7 + R8 (legislative)** — tap deck → card overlay → discard → face-down → pass popup → chancellor  
6. Playtest on a real phone; tweak seat sizes / overlay spacing  

---

## Acceptance checks

- [ ] Felt reads as light blue on phone and desktop preview  
- [ ] Table uses nearly all phone vertical space; no large empty form block under it during nominate/vote  
- [ ] Chancellor chosen only by tapping a seat + confirming in a popup  
- [ ] Voting overlay shows current voter + Ja/Nein (and timer), not government blurb  
- [ ] Ja/Nein require select + confirm; timer pauses during confirm  
- [ ] Reveal uses green/red seat borders for Ja/Nein  
- [ ] Approved → deck image + green “Vote Approved” above law box  
- [ ] Rejected → no deck; red “Vote Rejected — Try again” above law box  
- [ ] President taps deck to show 3 cards over the table with no box panel behind  
- [ ] Only cards (and confirm UI) are clickable during draw/discard  
- [ ] After president confirms discard: that card gone; other two face down; **then** pass-phone popup  
- [ ] Chancellor discard also uses select + confirm  
- [ ] Engine behavior unchanged (eligibility, majority, timers, API calls)

---

## Notes / decisions

| Topic | Decision |
|-------|----------|
| Nein border color | Red (distinct from Ja green) |
| Deck graphic v1 | CSS/SVG mini pile; replace with art asset later if desired |
| Ineligible seat tap | No confirm popup (preferred); optional brief message |
| Draw vs engine | Resolve already draws 3; UI “draw” = reveal hand from deck tap |
| Pass popup timing | Only after remaining cards are face down |
| Two-tap scope | All player decisions listed in R8 |
| Vote timer + confirm | Pause while confirm popup open |
| Multi-phone | Still later; overlays assume one shared screen |

---

## Sync

When this disagrees with `inicial_Plan.md` on **rules**, the locked plan wins.  
When it disagrees on **phone UI chrome**, this file wins until updated.
