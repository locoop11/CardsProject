import type { LawCardDto } from '../api/types'
import {
  DEFAULT_CARD_SKIN,
  resolvePlayerCardSkin,
  resolveRole,
  type CardSkinId,
} from '../cardAssets'
import { BLACK_WIN, RED_WIN, type TablePlayer } from '../gameSession'
import { roleLabel, type Role, type Team } from '../roles'
import { PlayingCardFace } from './PlayingCardFace'

type VoteBorder = 'ja' | 'nein'

type WinSummary = {
  winner: Team
  /** Full line, e.g. "Fascist Win: Hitler elected Chancellor" */
  message: string
}

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
  /** Whole-table card-set preset (Option A catalogs). */
  cardSkin?: CardSkinId
  voteBorders?: Record<string, VoteBorder>
  voteOutcome?: 'approved' | 'rejected' | null
  onDeckTap?: () => void
  deckEnabled?: boolean
  onSeatTap?: (playerId: string) => void
  tappableSeatIds?: string[]
  selectedSeatId?: string | null
  eligibleHighlightIds?: string[]
  /** Flip seat role cards face-up (win reveal). */
  revealRoles?: boolean
  /** Replace Communist/Fascist labels with a colored win message. */
  winSummary?: WinSummary | null
}

/** Place seats evenly around a rounded-rectangle perimeter (phone-friendly). */
function seatPosition(
  index: number,
  total: number,
  revealRoles = false,
): {
  left: string
  top: string
} {
  // Insets leave room for stacked role+name (centered on the point).
  const insetX = revealRoles ? 16 : 14
  const top = revealRoles ? 11 : 9
  const bottom = revealRoles ? 89 : 91
  const left = insetX
  const right = 100 - insetX
  const width = right - left
  const height = bottom - top
  const perimeter = 2 * (width + height)
  // Start mid-top, walk clockwise so seats hug the rectangle edges.
  const start = width / 2
  let d = (start + (index / total) * perimeter) % perimeter

  // Keep left/right seats out of the centered laws oval, but leave a
  // little gap from the top/bottom rows so name cards don't collide.
  const sideBandTopStart = revealRoles ? 16 : 15
  const sideBandTopEnd = revealRoles ? 28 : 27
  const sideBandBottomStart = revealRoles ? 72 : 73
  const sideBandBottomEnd = revealRoles ? 84 : 85
  const midY = (top + bottom) / 2

  const mapSideTop = (rawTop: number) => {
    if (rawTop <= midY) {
      const t = (rawTop - top) / Math.max(midY - top, 1)
      return sideBandTopStart + t * (sideBandTopEnd - sideBandTopStart)
    }
    const t = (rawTop - midY) / Math.max(bottom - midY, 1)
    return sideBandBottomStart + t * (sideBandBottomEnd - sideBandBottomStart)
  }

  if (d <= width) {
    return { left: `${left + d}%`, top: `${top}%` }
  }
  d -= width
  if (d <= height) {
    return { left: `${right}%`, top: `${mapSideTop(top + d)}%` }
  }
  d -= height
  if (d <= width) {
    return { left: `${right - d}%`, top: `${bottom}%` }
  }
  d -= width
  return { left: `${left}%`, top: `${mapSideTop(bottom - d)}%` }
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
  cardSkin = DEFAULT_CARD_SKIN,
  voteBorders,
  voteOutcome = null,
  onDeckTap,
  deckEnabled = false,
  onSeatTap,
  tappableSeatIds,
  selectedSeatId = null,
  eligibleHighlightIds,
  revealRoles = false,
  winSummary = null,
}: Props) {
  const rejected = new Set(rejectedIds)
  const tappable = new Set(tappableSeatIds ?? [])
  const eligible = new Set(eligibleHighlightIds ?? tappableSeatIds ?? [])
  const revealingVotes = Boolean(voteBorders)
  const redLaws = lawsOnTable.filter((c) => c.color === 'red')
  const blackLaws = lawsOnTable.filter((c) => c.color === 'black')

  const roleSrcById = new Map<string, string>()
  if (revealRoles) {
    const fascistIndex = { n: 0 }
    const communistIndex = { n: 0 }
    for (const player of players) {
      const role = player.role as Role | undefined
      if (!role) continue
      let same = 0
      if (role === 'fascist') {
        same = fascistIndex.n
        fascistIndex.n += 1
      } else if (role === 'communist') {
        same = communistIndex.n
        communistIndex.n += 1
      }
      const skin = resolvePlayerCardSkin(player.cardSkin, cardSkin)
      roleSrcById.set(player.id, resolveRole(skin, role, same))
    }
  }
  return (
    <section
      className={
        revealRoles ? 'table-board roles-revealed' : 'table-board'
      }
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
                  <PlayingCardFace
                    color="black"
                    number={1}
                    faceDown
                    skin={cardSkin}
                  />
                </span>
                <span className="deck-pile-card" aria-hidden="true">
                  <PlayingCardFace
                    color="black"
                    number={1}
                    faceDown
                    skin={cardSkin}
                  />
                </span>
                <span className="deck-pile-card" aria-hidden="true">
                  <PlayingCardFace
                    color="black"
                    number={1}
                    faceDown
                    skin={cardSkin}
                  />
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

        <div
          className={
            winSummary
              ? `table-oval table-oval-win table-oval-win-${winSummary.winner}`
              : 'table-oval'
          }
          aria-label="Enacted LawCards"
        >
          {winSummary && (
            <p className={`law-win-banner law-win-${winSummary.winner}`}>
              {winSummary.message}
            </p>
          )}
          <div className="law-row law-row-red">
            {!winSummary && (
              <span className="law-row-label">Communist</span>
            )}
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
                        skin={cardSkin}
                      />
                    )}
                  </span>
                )
              })}
            </div>
          </div>
          <div className="law-row law-row-black">
            {!winSummary && (
              <span className="law-row-label">Fascist</span>
            )}
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
                        skin={cardSkin}
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
            const pos = seatPosition(index, players.length, revealRoles)
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
                  className={
                    revealRoles && roleSrcById.has(player.id)
                      ? 'seat-role-card is-revealed'
                      : 'seat-role-card'
                  }
                  aria-hidden={!revealRoles}
                  title={
                    revealRoles && player.role
                      ? roleLabel(player.role)
                      : 'Role (hidden)'
                  }
                >
                  {/* Pass-and-play: seat shows table (or seat) skin back, then
                      face on reveal via resolveRole / resolveHitler. */}
                  {revealRoles && roleSrcById.has(player.id) ? (
                    <PlayingCardFace
                      color="black"
                      number={1}
                      skin={resolvePlayerCardSkin(player.cardSkin, cardSkin)}
                      src={roleSrcById.get(player.id)}
                      alt={
                        player.role ? `${roleLabel(player.role)} role card` : 'Role'
                      }
                    />
                  ) : (
                    <PlayingCardFace
                      color="black"
                      number={1}
                      faceDown
                      skin={resolvePlayerCardSkin(player.cardSkin, cardSkin)}
                    />
                  )}
                </div>
                <div className="seat-name-card">
                  <span className="seat-name">{player.name}</span>
                  {!revealRoles && isPresident && (
                    <span className="seat-office">President</span>
                  )}
                  {!revealRoles &&
                    rejected.has(player.id) &&
                    !isPresident &&
                    !revealingVotes && (
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
