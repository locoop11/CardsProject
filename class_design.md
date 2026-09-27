# Class & Data Design

Companion to `inicial_Plan.md`. **§7 choices are locked** (see below). This file is the agreed class list and data ownership model.

---

## 1. Goals

1. A **generic deck abstraction** usable by any future card game.
2. A **`SecretCardsLawDeck`** that implements that abstraction for this game (11 black + 6 red LawCards).
3. Game rules (nomination, voting, wins) stay **out of** the deck classes.
4. Clear ownership: who holds cards, who mutates piles, who only reads counts.
5. v1 mutates `GameState` in place, but structure code so we can later **record every action** (replay / persistence) without rewriting the domain model.

Product name (UI): **Secret Cards**.  
Law deck class (code): **`SecretCardsLawDeck`**.

---

## 2. Locked decisions

| # | Topic | Decision |
|---|--------|----------|
| 1 | Law deck name | `SecretCardsLawDeck` |
| 2 | Deck shape | **Interface + implementers**: basic deck/`CardPile` implements `DeckProtocol`; `SecretCardsLawDeck` also implements that interface (extends or structurally matches) |
| 3 | Enacted area | Plain **`CardTable`** only (no `LawTable` wrapper); helpers for red/black counts |
| 4 | `GameState` | **Mutate in place** in v1; design for future **action log** (each engine call appends a record) |
| 5 | UI hand | **Full `Card` visual** (id + kind / face) — not color-only tokens |

---

## 3. Package layout

```
cards/                          # generic, no game imports
  card.py                       # Card
  pile.py                       # CardPile — basic deck simulator
  table.py                      # CardTable
  protocols.py                  # DeckProtocol

secret_cards/                   # this game only
  laws/
    law_card.py                 # LawColor, factories, helpers
    secret_cards_law_deck.py    # SecretCardsLawDeck
  model.py                      # Player, Settings, Phase, GameState, …
  roles.py                      # ROLE_DISTRIBUTION, assign_roles
  actions.py                    # Action types for future log (define early, maybe unused in v1 UI)
  engine/                       # mutates GameState in place; returns the same state
    start.py
    nominate.py
    vote.py
    legislative.py
    win.py
    advance.py
  views.py                      # player-scoped projections (Phase 4)
```

**Rule:** `cards/` never imports `secret_cards/`.

---

## 4. Class map

### Layer A — Generic cards (`cards/`)

```text
DeckProtocol (interface)
  ├── CardPile                 # basic deck / pile simulator
  └── SecretCardsLawDeck       # in secret_cards/; implements same protocol + law setup
```

| Class / type | Kind | Responsibility | Does NOT |
|---|---|---|---|
| `Card` | immutable data | `id`, `type`, `number`, `color`, optional `meta` | Know game rules |
| `DeckProtocol` | interface | `shuffle`, `draw`, `return_and_shuffle`, `__len__`, … | Store game-specific rules |
| `CardPile` | mutable; implements `DeckProtocol` | Ordered pile; top = index 0 | Know “law” or wins |

**Shuffle note:** v1 uses Python’s PRNG (`random.shuffle`). Not cryptographically secure. Before online/multiplayer, switch the default shuffler to OS randomness (`secrets.SystemRandom`) while keeping injectable `rng` for tests.
| `CardTable` | mutable | Face-up played cards; `play(card)` | Auto-return to deck |

### Layer B — Law cards (`secret_cards/laws/`)

| Class / type | Responsibility |
|---|---|
| `LawColor` | `RED` / `BLACK` |
| `make_law_card(color, number) -> Card` | `type="law"`, `number` 1-based, `color` red/black |
| `law_color(card) -> LawColor` | Raises if not a law card |
| `is_law_card(card) -> bool` | Guard |
| `SecretCardsLawDeck` | Implements `DeckProtocol`; builds standard 11+6 deck; draw / discard-back / top-card draw |

**`SecretCardsLawDeck` surface**

```text
class SecretCardsLawDeck:  # implements DeckProtocol
    BLACK_COUNT = 11
    RED_COUNT = 6

    @classmethod
    def new_standard(cls, rng) -> SecretCardsLawDeck

    def remaining(self) -> int
    def count_in_deck(self, color: LawColor) -> int   # optional debug/UI
    def peek_top(self, n: int = 1) -> list[Card]

    def shuffle(self, rng=None) -> None
    def draw(self, n: int = 1) -> list[Card]
    def return_and_shuffle(self, cards, rng=None) -> None
    def draw_top_for_auto_enact(self) -> Card   # draw(1); named for rules clarity
```

Owns the **draw pile only**. Does not own enacted cards.

### Layer C — Table

Use **`CardTable`** on `GameState`. Count helpers as functions:

```text
red_enacted(table) / black_enacted(table)  # filter by law_color
```

### Layer D — Game data

| Type | Role |
|---|---|
| `Team`, `Role`, `Phase` | Enums |
| `Player` | id, name, role, is_alive |
| `Settings` | player_count + future toggles |
| `GameState` | Mutable snapshot (see §5) |
| `GameAction` (stub OK in v1) | One recorded action for future log/replay |

### Layer E — Engine

Functions **mutate `GameState` in place** and return it (same object) for chaining:

```text
start_game(...) -> GameState
nominate_chancellor(state, nominee_id) -> GameState
cast_vote(state, player_id, vote) -> GameState
resolve_votes(state, rng) -> GameState
president_discard(state, card_id, rng) -> GameState
chancellor_enact(state, card_id) -> GameState
enact_top_law_after_exhausted_nominees(state, rng) -> GameState
check_win_condition(state) -> tuple[Team, str] | None
advance_round(state) -> GameState
```

### Layer F — Errors

`InvalidNomineeError`, `InvalidPhaseError`, `VoteAlreadyCastError`, `InvalidCardChoiceError`, `EmptyDeckError` / pile errors from `cards/`.

---

## 5. `GameState` & future action log

### v1 mutability

Engine functions update fields on the existing `GameState` (and nested `SecretCardsLawDeck` / `CardTable`). No copy-on-write requirement in v1.

### Future: store each action

Reserve a place for history without implementing persistence yet:

```text
GameState
├── ...game fields...
└── action_log: list[GameAction]   # append-only; may stay empty until we need it
```

```text
GameAction:
  type: str          # e.g. "nominate", "cast_vote", "resolve_votes",
                     #      "president_discard", "chancellor_enact",
                     #      "top_law_enact", "advance_round", "game_over"
  payload: dict      # ids, card ids, vote value, etc. — serializable
  timestamp: optional / sequential index
```

**Convention for engine code (v1):**
- Mutate state as decided.
- Prefer a single internal helper e.g. `_record(state, type, payload)` that appends to `action_log` (can be a no-op flag later, but better to append from day one so replay work is cheap).
- Do not scatter ad-hoc history formats.

This keeps “mutate now” and “replay later” compatible: replay = create empty state + re-apply logged actions through the same engine functions.

---

## 6. Data ownership

```text
GameState
├── players, settings, phase, round_number, offices, votes, rejected_nominee_ids
├── law_deck: SecretCardsLawDeck     # draw pile
├── law_table: CardTable             # enacted LawCards
├── drawn_law_cards: list[Card]      # legislative hand (full Card objects)
├── winner, win_reason, result
└── action_log: list[GameAction]

SecretCardsLawDeck
└── (implements DeckProtocol; holds ordered LawCards internally)

Card
└── id, type, number, color, meta    # no back-reference to deck/game
```

**Rule:** `Card` never points at deck or game. Moves are remove-from-A / insert-into-B.

---

## 7. LawCard movement

### Legislative (vote approved)
```text
law_deck.draw(3) → drawn_law_cards
president discard 1 → law_deck.return_and_shuffle([card])
chancellor enact 1 → law_table.play(card); clear drawn_law_cards
```

### All eligible nominees rejected
```text
law_deck.draw(1) → law_table.play(card)   # no hand, no discard
```

### UI
President / chancellor screens receive **full `Card`** values (id + kind) so the client can render a full LawCard visual, not a bare color chip.

---

## 8. Interface sketch

```python
from typing import Protocol, Sequence
import random
from cards.card import Card


class DeckProtocol(Protocol):
    def shuffle(self, rng: random.Random | None = None) -> None: ...
    def draw(self, n: int = 1) -> list[Card]: ...
    def return_and_shuffle(
        self, cards: Sequence[Card], rng: random.Random | None = None
    ) -> None: ...
    def __len__(self) -> int: ...


class CardPile:
    """Basic deck simulator. Implements DeckProtocol."""
    ...


class SecretCardsLawDeck:
    """
    Law deck for Secret Cards. Implements DeckProtocol.
    Standard composition: 11 black + 6 red LawCards.
    No presidents, votes, or win logic here.
    """
    BLACK_COUNT = 11
    RED_COUNT = 6

    @classmethod
    def new_standard(cls, rng: random.Random | None = None) -> "SecretCardsLawDeck":
        ...
```

---

## 9. Build order

1. `DeckProtocol` + `Card` + `CardPile` + tests  
2. `CardTable` + tests  
3. `LawColor` / factories + `SecretCardsLawDeck` + tests  
4. `GameState` / `Settings` / enums + `GameAction` stub + `action_log`  
5. Engine functions per `inicial_Plan.md` (mutate + `_record`)  
6. React UI with full LawCard visuals for hands  

---

## 10. Sync

When this disagrees with `inicial_Plan.md`, update the plan’s decisions log. Class names and mutation/action-log rules in this file are authoritative for structure; game rules in `inicial_Plan.md` remain authoritative for behavior.
