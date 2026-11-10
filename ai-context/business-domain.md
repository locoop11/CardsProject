# Business domain

## Product

**Secret Cards** is a tabletop-style social deduction game for 5–10 players.

- **v1 — pass-and-play:** one shared device; the group passes the phone for private roles and acts.
- **v2 — multi-device:** each player on their own device in a room; each sees only their own secrets until the game ends.
- **v3 — hybrid:** same as v2 for phones, plus an optional shared **table display** that shows only the public board (laws, phase, offices). All secret actions stay on personal phones.

The product shell is **login-first**:

- Signed-in players use a **Games hub** (v1, v2, and v3).
- **Play as guest** is explicit and opens **v1 only**.
- Guests are not stored as users. No silent anonymous entry into play.

---

## Domain terms

| Term | Meaning |
|------|---------|
| **Account** | Durable player identity with display name, table card-skin preset, and owned/equipped Hitler–role packs |
| **Guest** | Explicit no-account mode; v1 only |
| **Games hub** | Signed-in landing place listing available modes |
| **Room** | Multi-device lobby with a join code until the host starts |
| **Join code** | Short code others use to enter the host’s room (players or table display) |
| **Seat claim** | Binding an account to a lobby seat before start |
| **Bound seat** | After start: that account may act/see only as that `player_id` |
| **Table display** | Authenticated projector for the public board — **not** a seat; no private roles/hands/actions |
| **Team** | `communist` or `fascist` |
| **Role** | `communist`, `fascist`, or `hitler` (Hitler on fascist team) |
| **President** | Rotating office; nominates chancellor |
| **Chancellor** | Nominee who, if elected, helps legislate |
| **LawCard** | Red (communist) or black (fascist) policy |
| **Law table** | Face-up enacted laws |
| **Nomination / Voting / Legislative** | Round phases |
| **Top enact / auto-enact** | Top deck law when no eligible nominee remains |
| **Term limit** | Previous chancellor barred by default next round |
| **Card skin (table preset)** | Whole-table art pack for laws, backs, and unequipped seats (`default` or `party`) |
| **Skin pack** | Owned art set (`default`, `party`, …) — grantable; not a single PNG |
| **Equip (Hitler / role)** | Which owned pack a player applies to Hitler vs role faces; laws stay on the table preset |

---

## Access rules (product)

| Actor | May do |
|-------|--------|
| Unauthenticated visitor | Login / register; Play as guest |
| Guest | Secret Cards v1 only; leave → Login |
| Signed-in account | Games hub; Account (display name + Hitler/role equip); v1 with saved table skin; **v2** host/join/claim/play; **v3** same plus attach a table display device |

---

## Multi-device secrecy (product)

- Mid-game, each **player** may know **only their own** role/team (and their legislative hand when they are the office holder).
- Co-players must not read another seat’s role or hand by guessing ids.
- A **table display** may show the public board only — never other players’ roles or hands.
- At `game_over`, player devices may reveal all roles (intentional flip); the table projector still does not fetch private role cards mid-game.
- Pass-and-play remains a separate trusted-device path with full create-time role reveal.

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

Roles are shuffled; seats are then shuffled. Presidency starts at seat index 0 after shuffle. Pass-and-play role reveal follows the order names were entered.

---

## Law deck

- 11 black + 6 red LawCards.
- Enacted laws stay on the table.
- Discarded / unchosen legislative cards return to the deck and the deck is shuffled.

---

## Round workflow

1. **Nomination** — President nominates an eligible player (not self; not barred previous chancellor by default; not already rejected this presidency). If nobody is eligible → auto-enact top law → advance round (or win).
2. **Voting** — Each player votes once (cannot change). Unresolved votes = Nein. Approve only if Ja **strictly greater** than Nein. Online: bound president may force resolve when ready.
3. **On reject** — Nominee barred this presidency; same president. If no eligible left → auto-enact.
4. **On approve** — Chancellor seated. If ≥3 black laws already on table **and** chancellor is Hitler → **fascist win** (`hitler_elected`). Else draw 3 → legislative.
5. **Legislative president** — Sees 3; discards 1.
6. **Legislative chancellor** — Sees 2; enacts 1; other returns to deck.
7. **After enact** — Check law wins; else advance round.

---

## Win conditions

| Condition | Winner | Reason code |
|-----------|--------|-------------|
| ≥5 red laws on table | Communist | `communist_laws` |
| ≥6 black laws on table | Fascist | `fascist_laws` |
| Hitler elected chancellor with ≥3 blacks already enacted | Fascist | `hitler_elected` |

---

## Settings (engine)

Defaults on `Settings` today:

- `bar_previous_chancellor = True`
- `bar_previous_president = False`
- `clear_term_limits_on_auto_enact = True`
- `voting_window_seconds = 10` (engine field; v1 UI uses `SECONDS_PER_VOTER = 10`)

Player `is_alive` exists but is unused in current play (reserved for future eliminations).
