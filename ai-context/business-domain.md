# Business domain

## Product

**Secret Cards** is a tabletop-style social deduction game for 5–10 players. **v1** is played on one shared device (pass-and-play). Players have hidden roles on two teams and enact laws until a win condition is met.

The product shell is **login-first**:

- Signed-in players use a **Games hub** to choose what to play.
- Casual players may choose **Play as guest** and get **v1 only**.
- Guests are not stored as users. There is no silent anonymous entry into gameplay.

Online multi-device rooms (v2) are not available yet; the hub may list them as coming soon.

---

## Domain terms

| Term | Meaning |
|------|---------|
| **Account** | Durable player identity with display name and preferred card skin |
| **Guest** | Explicit no-account play mode; v1 pass-and-play only |
| **Games hub** | Signed-in landing place listing available games/modes |
| **Team** | `communist` or `fascist` — the side that can win |
| **Role** | `communist`, `fascist`, or `hitler` (Hitler is on the fascist team) |
| **President** | Rotating office; nominates chancellor each round |
| **Chancellor** | Nominee who, if elected, helps legislate laws |
| **LawCard** | Red (communist) or black (fascist) policy card |
| **Law table** | Face-up enacted laws; win tracks count by color |
| **Nomination** | President chooses an eligible chancellor candidate |
| **Voting** | All players Ja/Nein the government; missing votes count as Nein |
| **Legislative** | Elected government draws laws; president discards one; chancellor enacts one |
| **Top enact / auto-enact** | If no eligible nominee remains, the top deck law is enacted immediately |
| **Term limit** | Previous chancellor (default) cannot be renominated next round; previous president bar is off by default |
| **Card skin** | Whole-table art pack for the shared device (`default` or `party`) |

---

## Access rules (product)

| Actor | May do |
|-------|--------|
| Unauthenticated visitor | See Login; register; sign in; choose Play as guest |
| Guest | Play Secret Cards v1 only; leave → Login |
| Signed-in account | Games hub; Account (display name, logout); play v1 with saved card skin |

---

## Role distribution

Exactly one Hitler. Counts by player count (communists, fascists including Hitler):

| Players | Communists | Fascists (incl. Hitler) |
|---------|------------|-------------------------|
| 5 | 3 | 2 |
| 6 | 4 | 2 |
| 7 | 4 | 3 |
| 8 | 5 | 3 |
| 9 | 5 | 4 |
| 10 | 6 | 4 |

Roles are shuffled; seats are then shuffled. Presidency starts at seat index 0 after shuffle. Pass-and-play role reveal still follows the order names were entered.

---

## Law deck

- 11 black + 6 red LawCards.
- Enacted laws stay on the table.
- Discarded / unchosen legislative cards return to the deck and the deck is shuffled.

---

## Round workflow

1. **Nomination** — President nominates an eligible player (not self; not barred previous chancellor by default; not already rejected this presidency). If nobody is eligible → auto-enact top law → advance round (or win).
2. **Voting** — Each player votes once (cannot change). After the voting window, unresolved votes = Nein. Approve only if Ja count **strictly greater** than Nein count.
3. **On reject** — Nominee is barred for this presidency; stay in nomination with same president. If no eligible left → auto-enact.
4. **On approve** — Chancellor is seated. If ≥3 black laws already on the table **and** chancellor is Hitler → **fascist win** (`hitler_elected`). Else draw 3 laws → legislative.
5. **Legislative president** — Sees 3 cards; discards 1 into deck.
6. **Legislative chancellor** — Sees 2 cards; enacts 1; other returns to deck.
7. **After enact** — Check law wins; else advance round (rotate president, clear rejections/votes/hand, update term limits).

---

## Win conditions

| Condition | Winner | Reason code |
|-----------|--------|-------------|
| ≥5 red laws on table | Communist | `communist_laws` |
| ≥6 black laws on table | Fascist | `fascist_laws` |
| Government elected with Hitler as chancellor while ≥3 blacks already enacted | Fascist | `hitler_elected` |

Checked at election (Hitler path) or after any enactment (law counts), including auto-enact.

---

## Settings (engine)

Defaults on `Settings` today:

- `bar_previous_chancellor = True`
- `bar_previous_president = False`
- `clear_term_limits_on_auto_enact = True` (after auto-enact, previous chancellor bar clears)
- `voting_window_seconds = 10` (engine field; UI uses its own `SECONDS_PER_VOTER = 10` for pass-and-play timers)

Player `is_alive` exists but is unused in v1 (reserved for future eliminations).
