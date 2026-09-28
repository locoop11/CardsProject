import type { LawCardModel } from '../lawCards'

type Props = {
  card: LawCardModel
  selected?: boolean
  onSelect?: () => void
  disabled?: boolean
}

export function LawCardView({ card, selected, onSelect, disabled }: Props) {
  const interactive = Boolean(onSelect) && !disabled
  const className = [
    'law-card',
    `law-card-${card.color}`,
    selected ? 'selected' : '',
    interactive ? 'interactive' : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (interactive) {
    return (
      <button
        type="button"
        className={className}
        aria-pressed={selected}
        onClick={onSelect}
      >
        <span className="law-card-kind">Law</span>
        <span className="law-card-number">{card.number}</span>
        <span className="law-card-color">{card.color}</span>
      </button>
    )
  }

  return (
    <div className={className} aria-label={`${card.color} LawCard ${card.number}`}>
      <span className="law-card-kind">Law</span>
      <span className="law-card-number">{card.number}</span>
      <span className="law-card-color">{card.color}</span>
    </div>
  )
}
