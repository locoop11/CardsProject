# 01 — Fair randomness and rule-accurate probabilities

**Status:** ready  
**Depends on:** none  
**Priority:** **first** — ahead of `02` / `03`

## Goal

Make every random game event use a **cryptographically strong** default RNG, keep **injectable RNG for tests**, and prove by tests that **rule probabilities / compositions** stay correct: law deck **11 black + 6 red**, role tables for 5–10 players, unbiased shuffles, and conservation of laws through discard/return.

## Why

Today the rules *structure* is mostly right (composition and role tables exist), but randomness is not “full fair”:

- Create game uses `random.Random()` (Mersenne Twister), not OS crypto entropy (`secrets.SystemRandom`).
- Optional API `seed` forces a predictable MT stream (fine for tests; bad if treated as production fairness).
- Mid-game `president_discard` / `chancellor_enact` are called from the API **without** an `rng`, so `return_and_shuffle` falls back to the **module-level** `random` — a different, also non-crypto generator than the one used at `start_game`.

“Accurate probabilities” means: given the remaining deck, every remaining LawCard is equally likely on top after a shuffle; roles are a uniform random permutation of the exact distribution; seats likewise. That requires a proper shuffle (Fisher–Yates via `.shuffle`) **and** a fair RNG source.

## In scope / out of scope

**In scope (server-side / engine / tests)**

1. **Default RNG upgrade**  
   When callers omit `rng`, use `secrets.SystemRandom()` (or equivalent CSPRNG wrapping the same `.shuffle` / `.random` interface), not bare `random.Random()` / module `random`.

2. **Single path for all shuffles in a live game**  
   API (and engine entry points used by API) must pass a crypto RNG into every shuffle that affects play: start (roles, seats, initial deck), and every `return_and_shuffle` on discard/enact. Prefer one helper e.g. `default_rng()` used by API when no test seed is set.

3. **Two lanes (locked) — fair play + working tests, seed concealed from players**

   | Lane | Who uses it | RNG | Purpose |
   |------|-------------|-----|---------|
   | **Live v1 play** | React UI → API **without** `seed` | `secrets.SystemRandom` for create **and** mid-game reshuffles | Fair, unpredictable game; finish version 1 for real play |
   | **Tests / debug** | pytest + API test client may pass `seed` or `rng=Random(seed)` | Seeded `random.Random` | Deterministic, repeatable tests |

   **Concealment (product):** Players never see or choose a seed. The settings hub / `createGame` client must **not** send `seed`. Optional API `seed` stays for automated tests and manual API debugging only — not exposed in the UI. That way the game “just works” fairly, and the test suite still controls outcomes.

   Do **not** remove API `seed` in this ticket (tests rely on it); do **not** add a seed field to the settings UI.

4. **Rule-accuracy tests (mandatory)**  
   - New standard deck: always **11 black + 6 red** (already partly covered — keep/strengthen).  
   - Role assignment: exact counts per `ROLE_DISTRIBUTION` for every supported player count; exactly one Hitler.  
   - After legislative discard/return: total laws in deck + hand + table still **17**; colors conserved (enacted leave deck; discards return).  
   - Draw never invents cards; empty-deck errors stay hard failures.  
   - Optional but recommended: Monte Carlo smoke (e.g. many seeded or crypto trials) that role→seat assignment frequencies are roughly uniform and opening top-card black rate is near **11/17** (tolerance band, not flaky exact equality).

5. **Docs touch**  
   Update `ai-context/decisions.md` / pile comments after ship: crypto default; injectable RNG for tests. Remove “crypto shuffle still deferred” from `99` (this plan replaces that deferral).

**Out of scope**

- UI changes.  
- Changing the **11/6** composition or role tables (those stay the rules).  
- True remote multiplayer anti-cheat / commit–reveal protocols.  
- Replacing Fisher–Yates with a different shuffle algorithm (`.shuffle` is fine once RNG is fair).

## Solution shape (locked)

| Concern | Approach |
|---------|----------|
| Default entropy (live game) | `secrets.SystemRandom` when `rng is None` / no API seed |
| Tests | Pass `random.Random(seed)` into engine, or API body `seed` in pytest only |
| UI | Never send `seed` — players cannot see or set it |
| Mid-game API reshuffles | Same crypto default as create when unseeded |
| Probabilities | Exact 11/6 + role tables + uniform shuffle; unit + light Monte Carlo |

**How this finishes v1 without breaking tests**

```text
Player taps Start
  → POST /api/games  { player_count, player_names }   // no seed
  → API builds SystemRandom()
  → start_game(..., rng=crypto) + later discard/enact use crypto
  → Fair unpredictable roles / deck / reshuffles

pytest
  → start_game(..., rng=Random(42))  OR  POST with seed=42
  → Same code paths, deterministic outcomes
  → Assert 11/6, role counts, conservation, etc.
```

One codebase, two RNG sources selected only by “was a seed/rng provided?” — nothing for players to configure.

## Acceptance criteria

- [ ] Unseeded `start_game` / API create use CSPRNG by default (not MT `Random()` alone).
- [ ] Unseeded API discard/enact reshuffles also use CSPRNG (no silent fallback to module `random` for live games).
- [ ] Frontend create-game path does **not** send `seed` (seed stays concealed from players).
- [ ] Seeded `rng` / API `seed` still produce deterministic results for existing tests (update tests if defaults changed).
- [ ] Tests assert law deck **11 black + 6 red** at start; role tables exact; card conservation through legislative return paths.
- [ ] Light statistical / Monte Carlo checks (or documented equivalent) for uniformity / ~11/17 top black under fair shuffle.
- [ ] `99-out-of-scope.md` no longer lists crypto shuffle as deferred; `decisions.md` reflects the new default.
- [ ] No change to win rules, nomination rules, or deck size.

## Notes for implementers

- Touch points: `cards/pile.py` (`shuffle` / `return_and_shuffle`), `secret_cards/roles.py`, `secret_cards/engine/start.py`, `secret_cards/engine/legislative.py`, `api/routes.py` (create + discard + enact).  
- Prefer a tiny shared helper (e.g. in `cards` or `secret_cards`) `def default_rng() -> random.Random` returning `secrets.SystemRandom()` so defaults stay consistent.  
- `SystemRandom` supports `.shuffle` / `.random`; it may not support `.seed` — seeded tests must keep using `random.Random(seed)`, never seed SystemRandom.  
- Composition constants: `LAW_DECK_BLACK_COUNT` / `LAW_DECK_RED_COUNT` in `secret_cards/laws/law_card.py`.  
- Living rules: `ai-context/business-domain.md` (11+6, role table).
