import type { LawColor } from '../api/types'
import {
  DEFAULT_CARD_SKIN,
  cardBackSrc,
  resolveLaw,
  rankCode,
  type CardSkinId,
} from '../cardAssets'

type Props = {
  color: LawColor
  number: number
  faceDown?: boolean
  /** Whole-table (or seat) art pack; defaults to classic poker. */
  skin?: CardSkinId
  /** When set, used instead of resolving from color/number (role/Hitler art). */
  src?: string
  className?: string
  alt?: string
}

/**
 * Card image from public/cards/. Prefer resolve* helpers for the `src` /
 * law path so components never branch on pack shape.
 */
export function PlayingCardFace({
  color,
  number,
  faceDown = false,
  skin = DEFAULT_CARD_SKIN,
  src,
  className = '',
  alt,
}: Props) {
  const resolved = faceDown
    ? cardBackSrc(skin)
    : (src ?? resolveLaw(skin, color, number))
  const label =
    alt ??
    (faceDown
      ? 'Card back'
      : `${rankCode(number)} of ${color === 'red' ? 'hearts' : 'spades'}`)

  return (
    <img
      className={`playing-card-img ${className}`.trim()}
      src={resolved}
      alt={label}
      draggable={false}
    />
  )
}
