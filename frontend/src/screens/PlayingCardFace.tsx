import type { LawColor } from '../api/types'
import {
  ACTIVE_CARD_SKIN,
  cardBackSrc,
  cardFaceSrc,
  rankCode,
  type CardSkinId,
} from '../cardAssets'

export { rankCode as rankLabel }

type Props = {
  color: LawColor
  number: number
  faceDown?: boolean
  /** Art pack; defaults to the shared table skin. */
  skin?: CardSkinId
  className?: string
}

/**
 * Playing card from public/cards/<skin>/.
 * Pass `skin` for per-player seat art; omit for shared table cards.
 */
export function PlayingCardFace({
  color,
  number,
  faceDown = false,
  skin = ACTIVE_CARD_SKIN,
  className = '',
}: Props) {
  const src = faceDown ? cardBackSrc(skin) : cardFaceSrc(color, number, skin)
  const label = faceDown
    ? 'Card back'
    : `${rankCode(number)} of ${color === 'red' ? 'hearts' : 'spades'}`

  return (
    <img
      className={`playing-card-img ${className}`.trim()}
      src={src}
      alt={label}
      draggable={false}
    />
  )
}
