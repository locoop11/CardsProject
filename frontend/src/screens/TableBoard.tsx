import type { LawCardDto } from '../api/types'
import { BLACK_WIN, RED_WIN, type TablePlayer } from '../gameSession'
import { PlayingCardFace } from './PlayingCardFace'

type VoteBorder = 'ja' | 'nein'

type Props = {
  players: TablePlayer[]
  presidentId: string
  rejectedIds: string[]
  previousChancellorId?: string | null
  redsOnTable: number
  blacksOnTable: number
  /** Enacted cards in play order; ranks shown on filled slots. */
  lawsOnTable?: LawCardDto[]
  roundNumber: number
  voteBorders?: Record<string, VoteBorder>
  voteOutcome?: 'approved' | 'rejected' | null
  onDeckTap?: () => void
  deckEnabled?: boolean
  onSeatTap?: (playerId: string) => void
  tappableSeatIds?: string[]
  selectedSeatId?: string | null
  eligibleHighlightIds?: string[]
}

/** Place seats evenly around a rounded-rectangle perimeter (phone-friendly). */
function seatPosition(index: number, total: number): {
  left: string
  top: string
} {
  const insetX = 12
  // Keep mid-top / mid-bottom seats clear of the center law rectangle.
  const top = 3.5
  const bottom = 96.5
  const left = insetX
  const right = 100 - insetX
  const width = right - left
  const height = bottom - top
  const perimeter = 2 * (width + height)
  // Start mid-top, walk clockwise so seats hug the rectangle edges.
  const start = width / 2
  let d = (start + (index / total) * perimeter) % perimeter

  if (d <= width) {
    return { left: `${left + d}%`, top: `${top}%` }
  }
  d -= width
  if (d <= height) {
    return { left: `${right}%`, top: `${top + d}%` }
  }
  d -= height
  if (d <= width) {
    return { left: `${right - d}%`, top: `${bottom}%` }
  }
  d -= width
  return { left: `${left}%`, top: `${bottom - d}%` }
}

export function TableBoard({
  players,
  presidentId,
  rejectedIds,
  previousChancellorId = null,
  redsOnTable,
  blacksOnTable,
  lawsOnTable = [],
  roundNumber,
  voteBorders,
  voteOutcome = null,
  onDeckTap,
  deckEnabled = false,
  onSeatTap,
  tappableSeatIds,
  selectedSeatId = null,
  eligibleHighlightIds,
}: Props) {
  const rejected = new Set(rejectedIds)
  const tappable = new Set(tappableSeatIds ?? [])
  const eligible = new Set(eligibleHighlightIds ?? tappableSeatIds ?? [])
  const revealingVotes = Boolean(voteBorders)
  const redLaws = lawsOnTable.filter((c) => c.color === 'red')
  const blackLaws = lawsOnTable.filter((c) => c.color === 'black')

  return (
    <section
      className="table-board"
      aria-label={`Game table, round ${roundNumber}`}
    >
      <div className="table-felt">
        {voteOutcome && (
          <div className="table-vote-banner" aria-live="polite">
            {voteOutcome === 'approved' && (
              <button
                type="button"
                className="deck-pile"
                aria-label="Draw LawCards from deck"
                disabled={!deckEnabled || !onDeckTap}
                onClick={onDeckTap}
              >
                <span className="deck-pile-card" aria-hidden="true">
                  <PlayingCardFace color="black" number={1} faceDown />
                </span>
                <span className="deck-pile-card" aria-hidden="true">
                  <PlayingCardFace color="black" number={1} faceDown />
                </span>
                <span className="deck-pile-card" aria-hidden="true">
                  <PlayingCardFace color="black" number={1} faceDown />
                </span>
              </button>
            )}
            <p
              className={
                voteOutcome === 'approved'
                  ? 'banner-text approved'
                  : 'banner-text rejected'
              }
            >
              {voteOutcome === 'approved'
                ? 'Vote Approved'
                : 'Vote Rejected — Try again'}
            </p>
          </div>
        )}

        <div className="table-oval" aria-label="Enacted LawCards">
          <div className="law-row law-row-red">
            <span className="law-row-label">Communist</span>
            <div
              className="law-row-slots"
              aria-label={`Red laws ${redsOnTable} of ${RED_WIN}`}
            >
              {Array.from({ length: RED_WIN }, (_, i) => {
                const card = redLaws[i]
                return (
                  <span
                    key={`red-${i}`}
                    className={
                      card ? 'table-law-slot filled red' : 'table-law-slot'
                    }
                  >
                    {card && (
                      <PlayingCardFace
                        color="red"
                        number={card.number}
                      />
                    )}
                  </span>
                )
              })}
            </div>
          </div>
          <div className="law-row law-row-black">
            <span className="law-row-label">Fascist</span>
            <div
              className="law-row-slots"
              aria-label={`Black laws ${blacksOnTable} of ${BLACK_WIN}`}
            >
              {Array.from({ length: BLACK_WIN }, (_, i) => {
                const card = blackLaws[i]
                return (
                  <span
                    key={`black-${i}`}
                    className={
                      card
                        ? 'table-law-slot filled black'
                        : 'table-law-slot'
                    }
                  >
                    {card && (
                      <PlayingCardFace
                        color="black"
                        number={card.number}
                      />
                    )}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        <ul className="table-seats" aria-label="Players">
          {players.map((player, index) => {
            const pos = seatPosition(index, players.length)
            const isPresident = player.id === presidentId
            const isBarred =
              rejected.has(player.id) || player.id === previousChancellorId
            // During vote reveal, keep seats undimmed so Ja/Nein borders read clearly.
            const isRejected = isBarred && !revealingVotes
            const isTappable = tappable.has(player.id) && Boolean(onSeatTap)
            const isEligible = eligible.has(player.id)
            const isSelected = selectedSeatId === player.id
            const vote = voteBorders?.[player.id]
            const className = [
              'table-seat',
              isPresident ? 'is-president' : '',
              isRejected ? 'is-rejected' : '',
              isEligible ? 'is-eligible' : '',
              isSelected ? 'is-selected' : '',
              vote === 'ja' ? 'vote-ja' : '',
              vote === 'nein' ? 'vote-nein' : '',
            ]
              .filter(Boolean)
              .join(' ')

            const content = (
              <>
                <div
                  className="seat-role-card"
                  aria-hidden="true"
                  title="Role (hidden)"
                />
                <div className="seat-name-card">
                  <span className="seat-name">{player.name}</span>
                  {isPresident && (
                    <span className="seat-office">President</span>
                  )}
                  {rejected.has(player.id) && !isPresident && !revealingVotes && (
                    <span className="seat-office muted">Rejected</span>
                  )}
                </div>
              </>
            )

            return (
              <li
                key={player.id}
                className={className}
                style={{ left: pos.left, top: pos.top }}
              >
                {isTappable ? (
                  <button
                    type="button"
                    className="seat-hit"
                    aria-label={`Nominate ${player.name}`}
                    onClick={() => onSeatTap?.(player.id)}
                  >
                    {content}
                  </button>
                ) : (
                  content
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
