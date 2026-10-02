/**
 * Card art is file-based so skins can be swapped without changing game logic.
 *
 * Layout:
 *   public/cards/<skinId>/
 *     back.svg|png|webp   — face-down
 *     AS.png, 2H.png, …   — rank + suit (A,2–10,J,Q,K + S|H|D|C)
 *
 * Two uses of skins:
 *   - Table skin (`ACTIVE_CARD_SKIN`): shared board art (deck, laws).
 *   - Player skin (`TablePlayer.cardSkin`): seat role card back/face.
 *     Optional today; falls back to the table skin until a picker exists.
 *
 * To add a skin: copy that folder structure under a new id (e.g. `midnight`),
 * then register it below (and later wire a settings / profile picker).
 */

export type CardSkinId = 'default'

/** Shared board art pack (deck pile, enacted laws). */
export const ACTIVE_CARD_SKIN: CardSkinId = 'default'

/** Seat / role-card skin for a player; defaults to the table skin. */
export function resolvePlayerCardSkin(
  cardSkin?: CardSkinId | null,
): CardSkinId {
  return cardSkin ?? ACTIVE_CARD_SKIN
}

export type CardSuit = 'S' | 'H' | 'D' | 'C'
export type LawColor = 'red' | 'black'

/** Per-skin mapping of law color → suit. Easy to customize per pack. */
const SKIN_SUITS: Record<
  CardSkinId,
  { red: CardSuit; black: CardSuit; backFile: string }
> = {
  default: {
    red: 'H',
    black: 'S',
    backFile: 'back.png',
  },
}

export function rankCode(number: number): string {
  if (number === 1) return 'A'
  if (number === 11) return 'J'
  if (number === 12) return 'Q'
  if (number === 13) return 'K'
  return String(number)
}

/** e.g. black Ace → "AS", red 10 → "10H" */
export function playingCardCode(
  color: LawColor,
  number: number,
  skin: CardSkinId = ACTIVE_CARD_SKIN,
): string {
  const suit = color === 'red' ? SKIN_SUITS[skin].red : SKIN_SUITS[skin].black
  return `${rankCode(number)}${suit}`
}

export function cardFaceSrc(
  color: LawColor,
  number: number,
  skin: CardSkinId = ACTIVE_CARD_SKIN,
): string {
  return `/cards/${skin}/${playingCardCode(color, number, skin)}.png`
}

export function cardBackSrc(skin: CardSkinId = ACTIVE_CARD_SKIN): string {
  return `/cards/${skin}/${SKIN_SUITS[skin].backFile}`
}
