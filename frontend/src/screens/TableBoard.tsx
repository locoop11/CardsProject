import { BLACK_WIN, RED_WIN, type TablePlayer } from '../gameSession'

type Props = {
  players: TablePlayer[]
  presidentId: string
  rejectedIds: string[]
  redsOnTable: number
  blacksOnTable: number
  roundNumber: number
}

/** Place seats evenly around a rounded-rectangle perimeter (phone-friendly). */
function seatPosition(index: number, total: number): {
  left: string
  top: string
} {
  const insetX = 12
  const insetY = 8
  const left = insetX
  const right = 100 - insetX
  const top = insetY
  const bottom = 100 - insetY
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
  redsOnTable,
  blacksOnTable,
  roundNumber,
}: Props) {
  const rejected = new Set(rejectedIds)

  return (
    <section className="table-board" aria-label="Game table">
      <div className="table-felt">
        <p className="table-meta">
          <span>Round {roundNumber}</span>
        </p>

        <div className="table-oval" aria-label="Enacted LawCards">
          <div className="law-row law-row-red">
            <span className="law-row-label">Communist</span>
            <div className="law-row-slots" aria-label={`Red laws ${redsOnTable} of ${RED_WIN}`}>
              {Array.from({ length: RED_WIN }, (_, i) => (
                <span
                  key={`red-${i}`}
                  className={
                    i < redsOnTable
                      ? 'table-law-slot filled red'
                      : 'table-law-slot'
                  }
                />
              ))}
            </div>
          </div>
          <div className="law-row law-row-black">
            <span className="law-row-label">Fascist</span>
            <div
              className="law-row-slots"
              aria-label={`Black laws ${blacksOnTable} of ${BLACK_WIN}`}
            >
              {Array.from({ length: BLACK_WIN }, (_, i) => (
                <span
                  key={`black-${i}`}
                  className={
                    i < blacksOnTable
                      ? 'table-law-slot filled black'
                      : 'table-law-slot'
                  }
                />
              ))}
            </div>
          </div>
        </div>

        <ul className="table-seats" aria-label="Players">
          {players.map((player, index) => {
            const pos = seatPosition(index, players.length)
            const isPresident = player.id === presidentId
            const isRejected = rejected.has(player.id)
            return (
              <li
                key={player.id}
                className={[
                  'table-seat',
                  isPresident ? 'is-president' : '',
                  isRejected ? 'is-rejected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ left: pos.left, top: pos.top }}
              >
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
                  {isRejected && !isPresident && (
                    <span className="seat-office muted">Rejected</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
