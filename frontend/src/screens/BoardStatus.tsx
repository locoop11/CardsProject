import type { PublicBoard } from '../gameSession'
import { BLACK_WIN, RED_WIN } from '../gameSession'

type Props = {
  board: PublicBoard
}

export function BoardStatus({ board }: Props) {
  return (
    <section className="board-status" aria-label="Game board">
      <div className="board-meta">
        <span>Round {board.roundNumber}</span>
        <span>President: {board.presidentName}</span>
      </div>

      <div className="tracks" aria-label="Law tracks">
        <div className="track track-red">
          <span className="track-label">Red Laws</span>
          <div className="track-slots" aria-hidden="true">
            {Array.from({ length: RED_WIN }, (_, i) => (
              <span
                key={`r${i}`}
                className={
                  i < board.redsOnTable ? 'slot filled red' : 'slot'
                }
              />
            ))}
          </div>
          <span className="track-count">
            {board.redsOnTable}/{RED_WIN}
          </span>
        </div>
        <div className="track track-black">
          <span className="track-label">Black Laws</span>
          <div className="track-slots" aria-hidden="true">
            {Array.from({ length: BLACK_WIN }, (_, i) => (
              <span
                key={`b${i}`}
                className={
                  i < board.blacksOnTable ? 'slot filled black' : 'slot'
                }
              />
            ))}
          </div>
          <span className="track-count">
            {board.blacksOnTable}/{BLACK_WIN}
          </span>
        </div>
      </div>

      <p className="board-rejected">
        {board.rejectedNames.length === 0
          ? 'No rejected nominees this round.'
          : `Rejected this round: ${board.rejectedNames.join(', ')}`}
      </p>
    </section>
  )
}
