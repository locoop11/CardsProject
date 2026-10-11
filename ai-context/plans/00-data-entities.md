# 00 — Data & entities catalog

**Kind:** reference (not a build ticket)  
**Status:** target model locked for planning — implement only what each numbered plan schedules  
**Depends on:** n/a  

## Purpose

Single catalog of **entities**, **relationships**, and **storage tiers**. Designed for multi-game escalation and later history/analytics — even when most durable entities are **not built yet**. Complements `plans/README.md` standing structure.

## Storage tiers

| Tier | Technology | Lifetime | Used for |
|------|------------|----------|----------|
| **A — Durable** | SQLite (+ later object/file store for image **bytes**) | Survives restart | Accounts, ownership, catalog metadata, later game history |
| **B — Ephemeral process** | In-memory Python stores | Dies on restart | Live rooms, live `GameSession` until a history plan persists them |
| **C — Domain** | Game package dataclasses | Lifetime of live session | Authoritative rules state (`secret_cards.GameState`, …) |
| **D — Client-only** | Browser / React | Tab / navigation | Guest mode, UI steps |

**Image bytes:** never SQLite BLOBs. DB stores **metadata + `storage_key`**; files today under `frontend/public/cards/…`, later object storage/CDN.

---

## How to read this file

| Tag | Meaning |
|-----|---------|
| **SHIP `01`** | Implement now (auth) |
| **TARGET** | Locked shape for future plans — do not invent competing models |
| **LIVE** | In-memory today / `03` — not history yet |

---

# Part 1 — Ship now (`01`)

### `User` — SHIP `01` (tier A)

| Field | Notes |
|-------|--------|
| `id` | PK |
| `username` | UNIQUE, nullable, case-folded |
| `email` | UNIQUE, nullable, lowered |
| `password_hash` | never client-visible |
| `display_name` | required |
| `card_skin` | **temporary** whole-table preset (`default` \| `party`) until `04` / equip model |
| `created_at` | ISO UTC |

**Ownership list:** not a JSON column on `User` in the target model. In SQL, “user owns packs” is the **`UserSkinPacks`** relationship (below). APIs may still return `owned_skin_packs: [...]` as a derived list.

### `Session` — SHIP `01` (tier A)

| Field | Notes |
|-------|--------|
| `id` | cookie `session_id` |
| `user_id` | FK → `User` |
| `expires_at`, `created_at` | |

### Guest — not an entity (tier D)

Frontend `playMode` only.

### Live Secret Cards (unchanged until history ships)

- **`GameSession` (LIVE / B):** `game_id`, `state`, later `user_id_by_player_id` (`03`)
- **`GameState` / `Player` / … (C):** engine truth; privacy views only
- **`Room` (LIVE / B, `03`):** lobby in memory

---

# Part 2 — Target durable model (organization / scalability)

History, skin shop, and ownership are **later**. Entities below are the agreed shape so we do not paint ourselves into a corner.

## Ownership & cosmetics (platform — mainly plan `04`)

### `SkinPack` — TARGET (tier A)

A purchasable / grantable **set** of card art (not a single PNG).

| Field | Notes |
|-------|--------|
| `id` | PK |
| `slug` | unique stable id (`default`, `party`, …) |
| `title` | display name |
| `description` | optional |
| `active` | can be listed / granted |
| `created_at` | |

Packs are **not** forced to one game. Which games may use which assets is enforced by **asset restrictions** and equip rules (below), not by stuffing `game_slug` as mandatory on every pack.

### `CardAsset` — TARGET (tier A)

One reusable card image (face, back, law art, …). **Not** forced to a single game.

| Field | Notes |
|-------|--------|
| `id` | PK |
| `storage_key` | path/object key — **bytes live outside DB** |
| `mime_type` | e.g. `image/png` |
| `label` | optional human label |
| `kind` | coarse type: `face` \| `back` \| `law` \| `other` (extensible) |
| `created_at` | |

**Game binding is optional and restriction-based**, not “this asset belongs to only Secret Cards forever”:

### `CardAssetGameRule` — TARGET (tier A)

When an asset **may** be used in a game / slot. Empty/missing rules for an asset can mean “unrestricted platform art” or “must be attached via pack only” — product rule to finalize in `04`.

| Field | Notes |
|-------|--------|
| `card_asset_id` | FK |
| `game_slug` | e.g. `secret-cards`, or `*` if you later allow global |
| `slot` | e.g. `hitler`, `role`, `law`, `back` — game-defined vocabulary |
| `role_key` / `law_key` | optional finer key (`fascist`, `black`, …) when the game requires it |

**Example:** law art for Secret Cards → rows with `game_slug=secret-cards`, `slot=law`. A generic decorative face might have broader rules or only appear inside a `SkinPack` without a law slot.

### `SkinPackAsset` — TARGET (tier A)

Membership: which assets are inside a pack (composition).

| Field | Notes |
|-------|--------|
| `skin_pack_id` | FK |
| `card_asset_id` | FK |
| `pack_slot` | optional order / role inside the pack |

### `UserSkinPacks` — TARGET (tier A) — **ownership list**

Join entity: **the list of skin packs a user owns**.  
Name locked per product preference (table/collection: `user_skin_packs`).

| Field | Notes |
|-------|--------|
| `user_id` | FK → `User` |
| `skin_pack_id` | FK → `SkinPack` |
| `acquired_at` | |
| PK | (`user_id`, `skin_pack_id`) |

**Why not a column on `User`:** relational ownership scales (many packs, queries, grants, revoke). The **User** domain object still “has” `skin_packs` via this relation; HTTP can expose it as an array.

### `UserEquip` — TARGET (tier A, with `04`)

What the user **currently applies** (owned packs/assets) per game/slot — separate from ownership.

| Field | Notes |
|-------|--------|
| `user_id` | FK |
| `game_slug` | which game the equip applies to |
| `slot` | `hitler` \| `role` \| `law` \| `table_preset` \| … |
| `skin_pack_id` and/or `card_asset_id` | what is equipped (finalize in `04`) |

Until this exists, `User.card_skin` remains the temporary whole-table preset for `01`.

---

## Durable play & history (TARGET — implement in a later plan, not `01`/`03`)

You may not store every game forever (storage limits). Still model for **scalability and selective retention** (e.g. keep N recent, or account games only).

### `GameInstance` — TARGET (tier A)

One played (or playing) match of **any** game product.

| Field | Notes |
|-------|--------|
| `id` | PK (may match or map from live `game_id`) |
| `game_slug` | string: which product (`secret-cards`, future games) |
| `mode` | e.g. `pass_and_play`, `multi_device` |
| `status` | `lobby` \| `active` \| `finished` \| `abandoned` |
| `started_at`, `ended_at` | |
| `settings_json` | optional opaque settings snapshot |
| `state_snapshot_json` | optional periodic/final snapshot for resume — **not** a substitute for the action list |

**Relationship:** a `GameInstance` **has an ordered list** of `GameAction` (1 → many). That list **is** the history.

### `GameParticipant` — TARGET (tier A)

Who was in the game and **which seat** they held. This is where seat lives.

| Field | Notes |
|-------|--------|
| `game_instance_id` | FK |
| `user_id` | FK, **nullable** only if you ever persist guest seats |
| `seat_key` | e.g. `p0`…`p9` for Secret Cards |
| `display_name` | name used at table |
| `result_role` | optional end-of-game role for analytics |

**Invariant for account history:** prefer one row per (`game_instance_id`, `user_id`) when `user_id` is set. Seat is looked up here — **not duplicated on every action**.

### `GameAction` — TARGET (tier A)

Append-only move / event log. Child of `GameInstance`.

| Field | Notes |
|-------|--------|
| `id` | PK |
| `game_instance_id` | FK → parent; defines the list membership |
| `seq` | monotonic per game (unique with `game_instance_id`) |
| `actor_user_id` | FK → `User`, nullable only for system events |
| `action_type` | e.g. `nominate`, `vote`, `discard`, `enact`, … |
| `payload_json` | action-specific data (nominee id, vote value, card ids, …) |
| `created_at` | |

**No `actor_seat_key` on `GameAction`.** Seat is recovered by:

```text
GameAction.actor_user_id + GameAction.game_instance_id
  → GameParticipant.seat_key
```

**Guest / no-user actors:** either (1) do not persist those games into history, or (2) allow `actor_user_id` null and put seat only in `payload_json` for system/guest edge cases. Default recommendation: **persist history for account-bound games**; skip or sample guest pass-and-play to save storage.

**Indexes (optimization):** `(game_instance_id, seq)`, `(actor_user_id, created_at)`, `(game_slug via GameInstance join)` for “my history”.

---

## Target relationship diagram

```
User 1──* Session
User 1──* UserSkinPacks *──1 SkinPack
SkinPack 1──* SkinPackAsset *──1 CardAsset
CardAsset 1──* CardAssetGameRule     ← optional per-game / per-slot restrictions
User 1──* UserEquip

GameInstance 1──* GameParticipant *──? User
GameInstance 1──* GameAction *──? User   (actor_user_id)
                 │
                 └── ordered by seq  = history list
```

Live path today (until history ships):

```
Room (B) → GameSession (B) → GameState (C)
```

Later, live play can **mirror** into `GameInstance` + append `GameAction` without changing engine packages.

---

## What we deliberately do **not** store

| Data | Why |
|------|-----|
| PNG/JPEG bytes in SQLite | Use `storage_key` + file/object store |
| Guest as `User` | Client mode only |
| Password plaintext | Hash only |
| Forcing every `CardAsset` to one `game_slug` | Breaks cross-game cosmetics; use `CardAssetGameRule` |
| `actor_seat_key` on every action | Redundant with `GameParticipant` |
| Full history for every guest game | Storage; policy later |

---

## Phased delivery

| Phase | Plan | Entities |
|-------|------|----------|
| Now | `01` | `User`, `Session` (+ temp `card_skin`); auth repository layering |
| UI seats | `02` | none durable |
| Multi-device live | `03` | `Room`, live seat map (memory) |
| Cosmetics / ownership | `04` | `SkinPack`, `CardAsset`, `SkinPackAsset`, `CardAssetGameRule`, `UserSkinPacks`, `UserEquip`; retire temp `card_skin` |
| History / analytics | **future numbered plan** | `GameInstance`, `GameParticipant`, `GameAction` (+ retention policy) |
| OAuth | `06` | link field/table on `User` |

---

## Plan cross-links

| Plan | Uses |
|------|------|
| `01` | Part 1 only |
| `03` | Live `Room` / seat map; does **not** require history tables |
| `04` | Ownership & asset entities (`UserSkinPacks`, …) |
| Future history plan | Part 2 play entities; retention/storage policy |
| Second game | New domain package; reuse `User`, packs/assets, `GameInstance.game_slug` |
