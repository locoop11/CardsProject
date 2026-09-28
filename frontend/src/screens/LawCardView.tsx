import type { LawCardModel } from '../lawCards'
import { PlayingCardFace } from './PlayingCardFace'

type Props = {
  card: LawCardModel
  selected?: boolean
  onSelect?: () => void
  disabled?: boolean
  faceDown?: boolean
}

export function LawCardView({
  card,
  selected,
  onSelect,
  disabled,
  faceDown = false,
}: Props) {
  const interactive = Boolean(onSelect) && !disabled && !faceDown
  const className = [
    'law-card',
    faceDown ? 'face-down' : `law-card-${card.color}`,
    selected ? 'selected' : '',
    interactive ? 'interactive' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const label = faceDown
    ? 'Face-down LawCard'
    : `${card.color} LawCard ${card.number}`

  const face = (
    <PlayingCardFace
      color={card.color}
      number={card.number}
      faceDown={faceDown}
    />
  )

  if (interactive) {
    return (
      <button
        type="button"
        className={className}
        aria-pressed={selected}
        aria-label={label}
        onClick={onSelect}
      >
        {face}
      </button>
    )
  }

  return (
    <div className={className} aria-label={label}>
      {face}
    </div>
  )
}
