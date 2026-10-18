# 04 — Per-player owned skin packs

**Kind:** feature  
**Status:** implemented — **not fully completed**  
**Depends on:** accounts auth (**shipped**); multi-device optional for online seats  
**Priority:** in code; keep open until fuller human verification  

### Completion note (human)

- Implementation is in the repo (schema, `api/skins/`, Account equip UI, seat art wiring, `tests/api/test_skins.py`).
- Living maps / `api-contracts.md` updated to match code.
- **No full human test pass yet** (API tests + light browser smoke only). Behavior looks good enough to **advance** to other work; do **not** remove this plan file or mark it shipped until a fuller human check.
- Remaining product gaps still out of scope here: storefront, law packs, `CardAsset*` rows, auto-equip defaults.

## Goal

Let each account **own** skin packs and **equip** Hitler / role art independently so two players at the same table can show different Hitler (or role) skins. Law art stays the **table preset** for this plan. Image **bytes** stay on disk / object storage; the DB holds pack/ownership/equip metadata (`00-data-entities.md`).

## Why

Skins become collectible / owned, not only one whole-table `card_skin`. Role and Hitler cards are per-player; laws are shared board objects — law ownership rules stay deferred.

## Product locks (this plan)

| Topic | Lock |
|-------|------|
| **Law art** | **Table preset only** — use existing whole-table skin (`User.card_skin` / table `cardSkin`). No per-player law equip in `04`. |
| **Hitler / role** | Per-player via **`UserEquip`** → owned **`SkinPack`**. |
| **Ownership** | **`UserSkinPacks`** join table (not a JSON list on `User`). |
| **Granting** | No storefront. On register (and one-time migration for existing users): grant seeded packs **`default`** and **`party`**. |
| **Identity** | All durable rows use **`id` PKs / FKs**. Packs may have a unique **`code`** (`default`, `party`) only to map to existing `public/cards/<code>/` folders — not as a substitute for `id`. |
| **Bytes** | `CardAsset.storage_key` (or pack `code` + resolve helpers) → files under `frontend/public/cards/…`. **No image BLOBs in SQLite.** |
| **Guest** | No ownership. Guest keeps client-only whole-table skin picker as today. |
| **Online** | Each bound seat’s equipped Hitler/role comes from that seat’s user; law/back still table preset. |

## In scope / out of scope

**In scope**

- SQLite: `skin_packs`, `user_skin_packs`, `user_equip`; optional `card_assets` + `skin_pack_assets` (+ optional `card_asset_game_rules`) if seeding asset rows — otherwise pack `code` + existing `cardAssets.ts` resolve path is enough for v1 packs.
- Layered API: routes → service → repository → `db` (same as auth).
- HTTP: list owned packs; equip Hitler/role; profile/`me` exposes owned pack ids + equip summary.
- Seed `default` + `party` packs; grant both to new and existing users.
- UI: account (or skin) UI to equip Hitler/role from owned packs; gameplay screens resolve per-seat Hitler/role via helpers (extend `resolveHitler` / `resolveRole`).
- Pass-and-play with account: each typed seat that maps to the logged-in user can use that user’s equip; other seats fall back to table preset (local shared device — document in UI that only *your* seat personalization applies when multi-account isn’t present; online uses each user’s equip).

**Out of scope**

- Storefront / purchases / payments.
- Per-player **law** packs (explicitly table preset).
- Uploading custom PNGs.
- ORM / Alembic (additive `CREATE TABLE IF NOT EXISTS` / seed in `init_db` or auth-style init is fine).
- Durable `GameInstance` history (`00` Part 2 play entities).

## Acceptance criteria

- [x] Seeded packs `default` and `party` exist; registered users own both (`UserSkinPacks`).
- [x] User cannot equip a pack they do not own (`403`/`400`).
- [x] `GET` profile (or dedicated endpoints) returns owned packs + current Hitler/role equip. → `GET /api/skins/me`
- [x] Two different accounts at an online table can show different Hitler and/or role art for their seats. → covered by API seat-equip test + client wiring; **full multi-device human play not done**
- [x] Law cards still follow the **table preset** only.
- [x] Guests unchanged: no ownership API; client table skin only.
- [x] Image bytes not stored in SQLite.
- [x] Auth layering preserved; new persistence goes through a repository module.
- [x] Tests cover ownership grant, equip deny, and at least one happy-path equip + `/me` (or equivalent) shape.
- [ ] **Full human test pass** (account equip UX, shared-device name match, online two-player different art end-to-end) — **not done**; see status note above.

## Data contract (minimum)

| Method | Path | Auth | Body / notes | Success |
|--------|------|------|--------------|---------|
| GET | `/api/auth/me` (extend) **or** `/api/skins/me` | session | — | owned packs + equip (`hitler_pack_id`, `role_pack_id` or pack `code`s) + existing profile fields |
| PATCH | `/api/skins/equip` (or `/api/auth/me` equip fields) | session | `{ "hitler_pack_id"?`, `"role_pack_id"?` }` (ids) | `200` equip summary |
| GET | `/api/skins/packs` | session optional | catalog of active packs | `200` list |

Exact path names flexible if Router stays clear; prefer **`id`** in JSON, not folder codes alone (codes may appear as display/`code` fields).

**Wire for play (online):** when building client session / seat props, each seat’s Hitler/role skin comes from that bound user’s equip; do not put pack ownership secrets into `PublicView`. Prefer client fetch of own equip + optional lightweight public “equipped pack id per seat” only if needed for others to render your seat art — if others must see your Hitler card art on reveal, either (a) reveal screen only shows own card (already true for online role reveal) or (b) expose non-sensitive equip pack ids on a bound-safe endpoint. **Do not** leak other seats’ roles when exposing equip.

## Developer starting point

**Suggested order:**

1. Schema + seed in `api/db.py` (or skins module init): `skin_packs`, `user_skin_packs`, `user_equip`; seed `default`/`party`.
2. Repository + service + routes (layered); grant packs on register; backfill existing users once.
3. Extend `/me` (or skins routes) + pytest.
4. Frontend types/client; Account (or Skin) UI to equip Hitler/role from owned list.
5. Wire resolve helpers / seat props so online (and account pass-and-play where applicable) use per-player Hitler/role; law stays table `cardSkin`.
6. Keep `User.card_skin` as **table preset** for laws (and guest/fallback) until a later plan replaces it with `UserEquip` slot `table_preset`.

**Do not touch:** `secret_cards/` engine rules; room authz behavior; do not add image BLOBs.

### Files likely to create

| Path | Purpose |
|------|---------|
| `api/skins/` (routes, service, repository) **or** extend `api/auth/` carefully | Packs / ownership / equip — prefer **`api/skins/`** so auth stays login-focused |
| `tests/api/test_skins.py` | Grant, equip, deny, me shape |

### Files likely to modify

| Path | Change |
|------|--------|
| `api/db.py` | Tables + seed |
| `api/auth/service.py` | Grant packs on register (call skins service) |
| `api/schemas.py` | Pack / equip / extended me DTOs |
| `api/app.py` | Mount skins router if separate |
| `frontend/src/api/types.ts` / `client.ts` | Owned packs + equip |
| `frontend/src/screens/AccountScreen.tsx` (and/or Skin UI) | Equip pickers |
| `frontend/src/cardAssets.ts` / screens | Per-seat Hitler/role resolve |
| `frontend/src/App.tsx` / `gameSession.ts` | Pass per-seat skins where needed |

### Direction notes

- Entity detail: `00-data-entities.md` Part 2 (`SkinPack`, `UserSkinPacks`, `UserEquip`, optional `CardAsset*`).
- Prefer equip by **`skin_pack_id`** for Hitler and role slots; resolve art via pack `code` → existing folder catalogs until `CardAsset` rows are worth it.
- If you add `CardAsset` now: seed `storage_key` like `cards/party/hitler.png`; still no BLOBs.
- Multi-device: seat art for *other* players’ face-down roles must not reveal role; only use per-player art on surfaces that already show that seat’s identity (own reveal, win flip, etc.).

## Notes for implementers

- Shipped shape: `/api/skins/packs`, `/api/skins/me`, `/api/skins/equip`, `/api/skins/games/{id}/seats`; `User.card_skin` unchanged as table preset; pack DB column `code`.
- Living maps updated for current code. Close this plan only after fuller human verification.
- Google OAuth / hybrid table-phone remain `06` / `05`.
