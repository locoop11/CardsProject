/**
 * Card art is file-based so skins can be swapped without changing game logic.
 *
 * Option A — each registered pack exposes three catalogs:
 *   Hitler  — single special face
 *   Role    — communist / fascist (Hitler uses the Hitler catalog)
 *   Law     — legislative / enacted faces
 *
 * Layout (custom packs):
 *   public/cards/<skinId>/
 *     hitler.png
 *     role-fascist.png
 *     role-communist.png
 *     law-fascist.png           — black laws (optional; else default poker)
 *     law-communist.png         — red laws (optional; else default poker)
 *     back.png                  — generic face-down
 *     back-fascist.png          — optional party back
 *     back-communist.png        — optional party back
 *
 * Layout (default poker pack):
 *   public/cards/default/
 *     AS.png, 2H.png, … + back.png
 *     Hitler = AS; laws = poker faces excluding AS; roles via rank mapping.
 *
 * Screens must call resolveHitler / resolveRole / resolveLaw (and cardBackSrc)
 * only — no pack-shape branching in components.
 */

import type { Role } from './roles'
import { roleToPlayingCard } from './roles'

export type CardSkinId = 'default' | 'party'

export type LawColor = 'red' | 'black'
export type CardSuit = 'S' | 'H' | 'D' | 'C'

/** Whole-table preset when settings have not chosen yet. */
export const DEFAULT_CARD_SKIN: CardSkinId = 'default'

/** @deprecated Prefer passing the session `cardSkin`; kept as default fallback. */
export const ACTIVE_CARD_SKIN: CardSkinId = DEFAULT_CARD_SKIN

export const CARD_SKIN_IDS: readonly CardSkinId[] = ['default', 'party']

export const CARD_SKIN_LABELS: Record<CardSkinId, string> = {
  default: 'Classic poker',
  party: 'Party',
}

type SkinMeta = {
  /** Face-down file under this pack (or absolute-under-/cards path). */
  backFile: string
  /** Optional team-colored party backs. */
  backFascistFile?: string
  backCommunistFile?: string
  /** Explicit Hitler / role files; omit to use default poker mapping. */
  hitlerFile?: string
  roleFascistFile?: string
  roleCommunistFile?: string
  /**
   * Dedicated law faces by color. When both set, resolveLaw uses them
   * (number ignored). When omitted, falls back to default poker laws.
   */
  lawFascistFile?: string
  lawCommunistFile?: string
  red: CardSuit
  black: CardSuit
}

const SKINS: Record<CardSkinId, SkinMeta> = {
  default: {
    backFile: 'back.png',
    red: 'H',
    black: 'S',
  },
  party: {
    // Same generic face-down as the classic poker pack.
    backFile: 'back.png',
    backFascistFile: 'back-fascist.png',
    backCommunistFile: 'back-communist.png',
    hitlerFile: 'hitler.png',
    roleFascistFile: 'role-fascist.png',
    roleCommunistFile: 'role-communist.png',
    lawFascistFile: 'law-fascist.png',
    lawCommunistFile: 'law-communist.png',
    red: 'H',
    black: 'S',
  },
}

/** Seat / role-card skin for a player; defaults to the table skin. */
export function resolvePlayerCardSkin(
  cardSkin?: CardSkinId | null,
  tableSkin: CardSkinId = DEFAULT_CARD_SKIN,
): CardSkinId {
  return cardSkin ?? tableSkin
}

function skinAsset(skinId: CardSkinId, file: string): string {
  return `/cards/${skinId}/${file}`
}

export function rankCode(number: number): string {
  if (number === 1) return 'A'
  if (number === 11) return 'J'
  if (number === 12) return 'Q'
  if (number === 13) return 'K'
  return String(number)
}

/**
 * Poker face code for the default pack.
 * Law faces never use Ace of Spades (reserved for Hitler).
 */
export function playingCardCode(
  color: LawColor,
  number: number,
  opts: { forLaw?: boolean } = {},
): string {
  const meta = SKINS.default
  let suit: CardSuit = color === 'red' ? meta.red : meta.black
  // AS reserved for Hitler — map black ace laws to Ace of Clubs.
  if (opts.forLaw && color === 'black' && number === 1) {
    suit = 'C'
  }
  return `${rankCode(number)}${suit}`
}

function defaultPokerFace(
  color: LawColor,
  number: number,
  forLaw: boolean,
): string {
  return skinAsset('default', `${playingCardCode(color, number, { forLaw })}.png`)
}

/** Hitler catalog entry for the pack. */
export function resolveHitler(skinId: CardSkinId): string {
  const meta = SKINS[skinId]
  if (meta.hitlerFile) {
    return skinAsset(skinId, meta.hitlerFile)
  }
  return skinAsset('default', 'AS.png')
}

/**
 * Role catalog entry for the pack.
 * `sameRoleIndex` distinguishes multiple fascists/communists in the default
 * poker mapping; custom packs that use a single art file ignore it.
 */
export function resolveRole(
  skinId: CardSkinId,
  role: Role,
  sameRoleIndex = 0,
): string {
  if (role === 'hitler') {
    return resolveHitler(skinId)
  }
  const meta = SKINS[skinId]
  if (role === 'fascist' && meta.roleFascistFile) {
    return skinAsset(skinId, meta.roleFascistFile)
  }
  if (role === 'communist' && meta.roleCommunistFile) {
    return skinAsset(skinId, meta.roleCommunistFile)
  }
  const face = roleToPlayingCard(role, sameRoleIndex)
  return defaultPokerFace(face.color, face.number, false)
}

/**
 * Law catalog entry. Packs with law-fascist / law-communist files use those
 * by color; otherwise fall back to default poker faces (excluding AS).
 */
export function resolveLaw(
  skinId: CardSkinId,
  color: LawColor,
  number: number,
): string {
  const meta = SKINS[skinId]
  const file =
    color === 'black' ? meta.lawFascistFile : meta.lawCommunistFile
  if (file) {
    return skinAsset(skinId, file)
  }
  return defaultPokerFace(color, number, true)
}

export function cardFaceSrc(
  color: LawColor,
  number: number,
  skin: CardSkinId = DEFAULT_CARD_SKIN,
): string {
  return resolveLaw(skin, color, number)
}

export function cardBackSrc(skin: CardSkinId = DEFAULT_CARD_SKIN): string {
  const meta = SKINS[skin]
  return skinAsset(skin, meta.backFile)
}

/** Optional party / team back when a pack defines one. */
export function cardTeamBackSrc(
  skin: CardSkinId,
  team: 'fascist' | 'communist',
): string {
  const meta = SKINS[skin]
  const file =
    team === 'fascist' ? meta.backFascistFile : meta.backCommunistFile
  if (file) {
    return skinAsset(skin, file)
  }
  return cardBackSrc(skin)
}
