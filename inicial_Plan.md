# Secret Cards — Initial Plan (v1)

This is the locked implementation plan. Prefer this document over any prior notes when implementing.

**Stack (v1):** Python game engine + React frontend (local pass-and-play).

---

## 0. Shared architecture

Two layers:

1. **Generic cards system** — reusable for this game and future games. Not Secret-Cards-specific (`DeckProtocol`, `CardPile`, `CardTable`, `Card`).
2. **Secret Cards game engine** — uses `SecretCardsLawDeck` (implements `DeckProtocol`) plus `LawCard` helpers.

Class boundaries, mutation style, and action-log plans: see `class_design.md`.
Implement the cards system first, then the game model on top of it.

---

### 0.1 Generic cards system

A normal deck/hand/table card model. Games supply their own card types; the system only moves cards between piles.

```python
from dataclasses import dataclass, field
from typing import Optional, Protocol, Sequence
import random


@dataclass(frozen=True)
class Card:
    """
    Generic card. `kind` is an opaque string defined by the consuming game
    (e.g. "law_red", "law_black", or later "hearts_ace", "item_sword", …).
    `id` uniquely identifies this physical card instance in a deck.
    """
    id: str
    kind: str
    # Optional free-form metadata for future games; unused by core pile logic.
    meta: dict = field(default_factory=dict)


class DeckProtocol(Protocol):
    def shuffle(self, rng: random.Random | None = None) -> None: ...
    def draw(self, n: int = 1) -> list[Card]: ...
    def return_and_shuffle(
        self, cards: Sequence[Card], rng: random.Random | None = None
    ) -> None: ...
    def __len__(self) -> int: ...


@dataclass
class CardPile:
    """Basic deck simulator. Implements DeckProtocol. Index 0 is the top."""
    cards: list[Card] = field(default_factory=list)

    def shuffle(self, rng: random.Random | None = None) -> None: ...
    def draw(self, n: int = 1) -> list[Card]:
        """Remove and return the top `n` cards. Raises if not enough cards."""
        ...
    def peek(self, n: int = 1) -> list[Card]:
        """Return top cards without removing."""
        ...
    def add_top(self, cards: Sequence[Card]) -> None: ...
    def add_bottom(self, cards: Sequence[Card]) -> None: ...
    def return_and_shuffle(
        self, cards: Sequence[Card], rng: random.Random | None = None
    ) -> None:
        """Return cards into the pile and shuffle (typical discard-back-to-deck)."""
        ...
    def remove(self, card_ids: Sequence[str]) -> list[Card]:
        """Remove specific cards by id (e.g. moving from hand to table)."""
        ...
    def __len__(self) -> int: ...


@dataclass
class CardTable:
    """Public face-up area (enacted / played cards). No LawTable wrapper."""
    cards: list[Card] = field(default_factory=list)

    def play(self, card: Card) -> None:
        """Move a card permanently onto the table (does not return to the deck)."""
        ...
```

**Design rules for the cards system**
- No game rules inside `Card` / `CardPile` / `CardTable` (no “president”, no win checks).
- Drawing is always **from the top** of a pile after shuffle.
- Returning discarded cards uses `return_and_shuffle` — they are back in the deck.
- Cards moved to `CardTable` stay there until a future game rule clears them.
- Randomness injected via `rng` so tests can seed it.
- **v1 shuffle is not perfect randomness** (Python PRNG). Future: default to OS/crypto randomness (`SystemRandom`) for online fairness; keep `rng` injection for tests.
- `SecretCardsLawDeck` implements the same `DeckProtocol` as `CardPile`.

**Acceptance criteria (cards system unit tests)**
- Draw order matches top-of-pile order after a known shuffle seed.
- Discard → `return_and_shuffle` restores count to the deck; table play does not.
- Drawing more cards than remain raises a clear error.
- System has no imports from the Secret Cards game package (dependency direction: game → cards, never reverse).

---

### 0.2 LawCard (this game’s card type)

Secret Cards only uses law cards. Prefer the names **`LawCard`** / **`LawCards`** in game code and UI copy — not “policy”.

```python
class LawColor(str, Enum):
    RED = "red"
    BLACK = "black"


def make_law_card(color: LawColor, index: int) -> Card:
    """Factory: a LawCard is a generic Card with kind 'law_red' or 'law_black'."""
    return Card(id=f"law_{color.value}_{index}", kind=f"law_{color.value}")


def is_law_card(card: Card) -> bool: ...
def law_color(card: Card) -> LawColor: ...


# Starting LawCards deck for Secret Cards v1:
# 11 black + 6 red = 17 LawCards
LAW_DECK_BLACK_COUNT = 11
LAW_DECK_RED_COUNT = 6
```

Helpers may wrap `Card` as a typed view named `LawCard` if that reads clearer in game code; underneath it remains the generic `Card`.

The draw pile for this game is **`SecretCardsLawDeck`**, which implements `DeckProtocol` (same interface as the basic `CardPile` deck simulator). See `class_design.md`.

---

### 0.3 Secret Cards game model

```python
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional


class Team(str, Enum):
    RED = "red"
    BLACK = "black"


class Role(str, Enum):
    RED_MEMBER = "red_member"
    BLACK_MEMBER = "black_member"
    LEADER = "leader"  # team = BLACK


class Phase(str, Enum):
    NOMINATION = "nomination"
    VOTING = "voting"
    LEGISLATIVE_PRESIDENT = "legislative_president"    # president holds 3 LawCards, discards 1
    LEGISLATIVE_CHANCELLOR = "legislative_chancellor"  # chancellor holds 2 LawCards, enacts 1
    GAME_OVER = "game_over"


@dataclass
class Player:
    id: str
    name: str
    role: Role  # assigned once at game start, never changes
    # Unused in v1 (no eliminations); kept to avoid a schema migration for later powers.
    is_alive: bool = True


@dataclass
class Settings:
    """
    v1 uses the defaults below. Extra fields exist so future settings UI can toggle
    behavior without a schema rewrite. Do not add a full settings panel in v1 beyond
    player_count (and any stubs already planned).
    """
    player_count: int  # must be in SUPPORTED_PLAYER_COUNTS
    bar_previous_chancellor: bool = True
    bar_previous_president: bool = False  # off in v1; only current president is barred by office
    clear_term_limits_on_auto_enact: bool = True  # clears previous_chancellor_id after top-card enact
    voting_window_seconds: int = 5  # timed group vote once voting is started


@dataclass
class GameState:
    players: list[Player]
    settings: Settings
    phase: Phase
    round_number: int
    president_index: int  # index into players[] for current president
    nominated_chancellor_id: Optional[str]
    chancellor_id: Optional[str]  # set only after a nomination is approved
    previous_president_id: Optional[str]  # reserved for future settings; unused for eligibility in v1
    previous_chancellor_id: Optional[str]  # immediate last successful chancellor; barred when setting on
    rejected_nominee_ids: list[str]  # nominees rejected this round; cleared when presidency rotates
    votes: dict[str, bool]  # player_id -> True(Ja) / False(Nein); cleared each nomination

    # --- cards (via generic cards system) ---
    law_deck: SecretCardsLawDeck  # draw pile; implements DeckProtocol
    law_table: CardTable          # enacted LawCards (plain CardTable; no LawTable)
    drawn_law_cards: list[Card]   # legislative hand — full Card objects for UI visuals

    winner: Optional[Team]
    win_reason: Optional[str]  # "red_laws" | "black_laws" | "leader_elected"
    result: Optional[dict]  # see Task 2.6 — set only when phase == GAME_OVER
    action_log: list  # append-only GameAction records; future replay/persistence
```

**Derived counts (do not store separately if avoidable; compute from `law_table`):**
- `red_enacted` = number of red LawCards on `law_table`
- `black_enacted` = number of black LawCards on `law_table`

**LawCards deck behavior in this game**
- Start: `SecretCardsLawDeck.new_standard(rng)` (11 black + 6 red).
- Legislative draw: `law_deck.draw(3)` into `drawn_law_cards`.
- President discard: that LawCard returns via `law_deck.return_and_shuffle([discarded])`.
- Chancellor enact / top-of-deck path: move LawCard onto `law_table` (stays on the table; never returns to the deck).
- If the deck ever runs low for a draw, reshuffle is already handled when discards return; if still empty, that is a hard error / game design bug for v1 (17 cards, at most 5+6 enacted before a win).

**Engine mutability:** functions mutate `GameState` in place and append to `action_log`. See `class_design.md` §5.

---

## Locked rules summary (v1)

### Roles / teams
- Red members vs Black members; exactly one **Leader** on Black.
- Role assignment only at game start.

### Presidency & rounds
- **Presidency does not rotate on a failed vote.** The same president nominates another eligible person.
- A **round ends when one LawCard is enacted onto the table** — whether that happened through a successful government **or** through the top-card path after every eligible nominee was rejected.
- **A successful vote is not required for the round to end.** Every available chancellor can be rejected; then one LawCard is taken from the **top of the deck** and enacted. Round ends; presidency rotates.
- After a successful government (vote approved → legislative session → enact one LawCard): round ends; presidency rotates.

### Chancellor eligibility (v1)
A player may be nominated if they are **not**:
1. the current president, and
2. the immediate last chancellor (when `bar_previous_chancellor` is True), and
3. already in `rejected_nominee_ids` for this round.

`bar_previous_president` is **False** in v1.

### Voting
- Nomination is public.
- Someone starts the vote (UI button). Then **everyone has `voting_window_seconds` (default 5)** to cast Ja/Nein.
- After the window ends, votes are **revealed**.
- A player **cannot change** their vote once cast.
- Players who do not vote in time: treat as **Nein** (document in code; changeable later via settings).
- Government **approved** only on **strict majority** Ja (`ja_count > nein_count`). Ties and Nein-majority = rejected.
- On reject: add the nominee to `rejected_nominee_ids`, clear nomination/votes, stay in `NOMINATION` with the **same** president.
- Rejected votes only narrow who can still be nominated. They do **not** by themselves enact a LawCard. Enactment after total rejection is the separate top-of-deck path below.

### Top-of-deck enact when everyone available is rejected
- There is **no** “3 failed elections” tracker.
- When **no eligible chancellor nominees remain**, draw **exactly 1** LawCard from the **top** of `law_deck` and enact it onto `law_table` immediately (no president/chancellor discard steps).
- Then: if `clear_term_limits_on_auto_enact`, clear `previous_chancellor_id`; advance round / rotate presidency.
- This path is normal and expected, not an error case. The game must never soft-lock waiting for a vote to pass.

### Win conditions (instant; check at the points below)
1. **After every successful election** (before drawing LawCards): if black LawCards on table `>= 3` and the elected chancellor’s role is `LEADER` → Black wins (`leader_elected`).
2. **After every LawCard enactment** (legislative or top-of-deck): if red on table `>= 5` → Red (`red_laws`); if black on table `>= 6` → Black (`black_laws`).

---

## Phase 1 — Rules data (constants / config)

### Task 1.0 — Generic cards package
Implement §0.1 as its own module/package (e.g. `cards/`), with no dependency on Secret Cards.

### Task 1.1 — Role distribution table

| Player count | Red members | Black members (incl. Leader) |
|-------------:|------------:|-----------------------------:|
| 5 | 3 | 2 (1 + Leader) |
| 6 | 4 | 2 (1 + Leader) |
| 7 | 4 | 3 (2 + Leader) |
| 8 | 5 | 3 (2 + Leader) |
| 9 | 5 | 4 (3 + Leader) |
| 10 | 6 | 4 (3 + Leader) |

**Acceptance criteria**
- `ROLE_DISTRIBUTION: dict[int, tuple[int, int]]` → `(red_count, black_count_including_leader)`.
- `SUPPORTED_PLAYER_COUNTS = tuple(ROLE_DISTRIBUTION.keys())`.
- `assign_roles(player_count: int) -> list[Role]`: shuffled list of exactly `player_count` roles (exactly one `LEADER`, rest split); `ValueError` if count unsupported.

### Task 1.2 — Round-flow flowchart

```
game start
  → NOMINATION
  → (no eligible nominee?)
        → draw top 1 LawCard → enact to table → win check
        → (else) advance round → NOMINATION
  → nominate → VOTING (5s window)
  → rejected → rejected_nominee_ids += nominee → NOMINATION (same president)
        → (if now no eligible nominees) → top-of-deck enact path above
  → approved → leader-elected win check
       → (win) GAME_OVER
       → (no win) draw 3 LawCards → LEGISLATIVE_PRESIDENT
            → discard 1 LawCard back to deck (shuffle)
            → LEGISLATIVE_CHANCELLOR → enact 1 LawCard to table → win check
            → (else) advance round → NOMINATION
```

Every phase name must match the `Phase` enum.

### Task 1.3 — Settings schema

`Settings` in §0.3 is final for v1 field set. Extra booleans are defaults-only until a future settings UI.

### Task 1.4 — SecretCardsLawDeck

`SecretCardsLawDeck.new_standard(rng) -> SecretCardsLawDeck` creating 11 black + 6 red LawCards and shuffling. Implements `DeckProtocol`. Lives in the game package; generic `CardPile` stays in `cards/`.

---

## Phase 2 — Game engine (Python)

Engine functions **mutate `GameState` in place** and return the same state object for convenience. No I/O. Randomness only via injectable `rng` into the cards system / start_game.

Each public engine action should append a serializable entry to `state.action_log` (via a small `_record` helper) so a future use case can store/replay the full action history without changing the domain model. Persistence of that log is post-v1; appending in v1 is intentional.

### Task 2.1 — Game initialization

`start_game(settings: Settings, player_names: list[str]) -> GameState`

- Validate `len(player_names) == settings.player_count` and count supported.
- `assign_roles()`, zip into `Player`s; **shuffle player order**, then set `president_index = 0` (document in a code comment).
- `law_deck = SecretCardsLawDeck.new_standard(rng)`; empty `law_table`; empty `drawn_law_cards`; empty `action_log`.
- `rejected_nominee_ids = []`; phase `NOMINATION`; `round_number = 1`; optionals `None`.

**Tests:** correct role split; deck composition 11/6; invalid count → `ValueError`.

### Task 2.2 — Nomination

`nominate_chancellor(state: GameState, nominee_id: str) -> GameState`

- Valid only in `NOMINATION`.
- Nominee must be eligible per locked rules.
- If zero eligible nominees: top-of-deck LawCard enact path (engine must not soft-lock).
- On success: set `nominated_chancellor_id`, clear `votes`, → `VOTING`.
- On invalid nominee: domain exception (e.g. `InvalidNomineeError`).

**Tests:** normal nominate; barred last chancellor; rejected-this-round barred; all rejected / none eligible → top card enacted.

### Task 2.3 — Voting

`cast_vote(state: GameState, player_id: str, vote: bool) -> GameState`  
`resolve_votes(state: GameState) -> GameState`  # when the 5s window ends (timer is frontend; engine is pure)

- Valid only in `VOTING`.
- First vote is final — **no overwrites**.
- Missing votes at resolve → **Nein**.
- Approve iff `ja_count > nein_count`.
- **Approved:** set `chancellor_id`; Leader-elected win check **before** drawing LawCards; if no win, `law_deck.draw(3)` → `LEGISLATIVE_PRESIDENT`.
- **Rejected:** append nominee to `rejected_nominee_ids`; clear nomination/votes; → `NOMINATION` (same president). If no eligible nominees left → top-of-deck enact (vote never needed to pass).

**Tests:** majority Ja; tie = reject; vote lock; missing → Nein; chain of rejects until none eligible → top LawCard enacted; Leader-elected before any draw.

### Task 2.4 — Drawing & enacting LawCards

Uses the generic cards system:

- President discard: remove one of 3 from `drawn_law_cards`; `law_deck.return_and_shuffle([discarded])`; leave 2; → `LEGISLATIVE_CHANCELLOR`.
- Chancellor enact: move one of 2 onto `law_table`; clear hand; win check; else `advance_round`.
- Top-of-deck path: `law_deck.draw(1)` → play onto `law_table`; win check; else advance round (term-limit clear per settings).

**Tests:** discards return to deck; enacted stay on table; top-card path skips legislative phases; never draw more than `len(law_deck)`.

### Task 2.5 — Win condition checks

`check_win_condition(state: GameState) -> Optional[tuple[Team, str]]`

1. After successful election, before draw: black on table `>= 3` and chancellor is `LEADER` → `(BLACK, "leader_elected")`.
2. After enactment: red on table `>= 5` → `(RED, "red_laws")`; black on table `>= 6` → `(BLACK, "black_laws")`.
3. Else `None`.

**Tests:** each path; electing Leader before 3 black LawCards on the table does **not** win.

### Task 2.6 — End-of-game result object

Populated exactly once when entering `GAME_OVER`:

```python
result = {
    "winner": Team,
    "win_reason": str,
    "round_count": int,
    "players": [
        {"name": str, "role": Role, "team": Team}
    ],
    "red_enacted": int,   # count of red LawCards on law_table
    "black_enacted": int, # count of black LawCards on law_table
}
```

Never mutate `result` afterward.

### Task 2.7 — Round advancement

`advance_round(state: GameState) -> GameState`

- Update `previous_president_id` / `previous_chancellor_id` from the finished round, **unless** top-of-deck enact path with `clear_term_limits_on_auto_enact` (clear chancellor term limit as specified).
- Advance `president_index` clockwise.
- Increment `round_number`.
- Clear: `rejected_nominee_ids`, `nominated_chancellor_id`, `chancellor_id`, `votes`, `drawn_law_cards`.
- Phase → `NOMINATION`.

**Tests:** rotation + wraparound; rejected list cleared; term-limit behavior on legislative enact vs top-of-deck enact.

### Task 2.8 — Full-game simulation tests

At least 3 seeded full-game simulations through public APIs only. Include at least one where **every eligible chancellor is rejected** and the **top LawCard** is enacted.

---

## Phase 3 — Local pass-and-play frontend (React)

Components receive only the data they may see; emit actions upward; never read raw `GameState`.

UI copy uses **Law** / **LawCard** / **LawCards**, not “policy”.

### Task 3.1 — Pre-game settings
- Player count limited to `SUPPORTED_PLAYER_COUNTS`.
- Future-facing settings may be stubbed/hidden; v1 must at least collect `player_count`.
- Cannot proceed with unsupported count.

### Task 3.2 — Player name entry
- One field per slot.
- Blank names: **auto-fill** placeholders (`Player 1`, …) — documented.
- Duplicate names allowed; show a non-blocking warning.

### Task 3.3 — Role reveal (pass-and-play)
- Per player: “Pass to {name}” → Reveal → role+team only → hide → next.
- No going back to re-reveal earlier players without restarting the sequence.
- Never show two roles at once; all players exactly once.

### Task 3.4 — Voting (pass-and-play + timed window)
- Nomination visible to the group.
- Start-vote control begins the **5 second** window.
- During the window, inputs stay private (pass-and-play friendly).
- Votes lock on cast; after 5s, **reveal all votes** (individual + totals).
- Non-voters count as Nein at resolve.
- UI must support the path where nominations keep failing until top-of-deck LawCard enact (no assumption that a government will pass).

### Task 3.5 — Legislative screens
- President: 3 full LawCard visuals (from full `Card` objects: id + kind), discard exactly 1 (returns to deck).
- Chancellor: 2 full LawCard visuals, enact exactly 1 (to table).
- Only reachable by the correct player in the pass flow; LawCards never shown on other views.

### Task 3.6 — Game board / status
- Round number, red/black LawCards on the table (progress tracks), current president, rejected-this-round public info.
- No roles/teams on this screen.

### Task 3.7 — Win screen
- Winning team, `win_reason`, full role reveal.
- Only when `GAME_OVER`; “Play again” → settings (3.1).

---

## Phase 4 — Wiring frontend to engine

### Task 4.1 — Local transport
- Python engine behind a thin local API (e.g. FastAPI on localhost) called by React, **or** an equivalent documented bridge.
- Document request/response shapes so a later networked multiplayer phase can reuse them.

### Task 4.2 — Privacy enforcement
- Never send raw `GameState` to the UI.
- Always return a **player-scoped projection**.
- Test: player A’s view never contains player B’s `role`, in every phase.

---

## Phase 5 — Playtest & polish

Manual: real playtests, log edge cases, visual polish. Not code-precise.

---

## Decisions log (resolved)

| Topic | Decision |
|-------|----------|
| Stack | Python engine + React |
| Card naming | **LawCard** / **LawCards** (not “policy”) |
| Cards architecture | `DeckProtocol` ← `CardPile` (basic) and `SecretCardsLawDeck` (this game) |
| Law deck class | **`SecretCardsLawDeck`** |
| Enacted area | Plain **`CardTable`** (no `LawTable`) |
| GameState updates | **Mutate in place**; append to **`action_log`** for future replay/storage |
| UI hands | **Full Card visual** (id + kind), not color-only tokens |
| Shuffle (v1) | `random.shuffle` / injectable `rng` — **not** cryptographically secure |
| Shuffle (future) | Upgrade default to full/OS randomness (`secrets.SystemRandom` or equivalent) for online fairness; keep injectable `rng` for tests |
| Failed vote | Same president nominates again |
| Vote approval required to end round? | **No** — all eligible nominees may be rejected |
| After all eligible rejected | Top LawCard from deck is enacted; round ends |
| Round end | When one LawCard is enacted (government path or top-of-deck path) |
| Presidency rotate | On round end only |
| Previous president bar | Off in v1 |
| Last chancellor bar | On in v1; cleared after top-of-deck enact by default |
| Rejected nominees | Barred for rest of round; list cleared on presidency rotate |
| Voting | 5s window after start; no vote changes; reveal after window; missing = Nein |
| Discards | Return to `law_deck` (shuffle); enacted LawCards stay on `law_table` |
| Settings extras | Present on `Settings` for future toggles; no full settings product in v1 |

---

## Out of scope for v1

- Player eliminations / presidential powers / investigation powers
- Networked multiplayer
- Stats / action-log persistence (result object + `action_log` prepared for later)
- Full configurable settings UI (fields reserved only)
- Other games using the cards system (API only must stay game-agnostic)
- Cryptographically strong / “full” shuffle default (tracked; upgrade before online play)
