import type { GameSession } from '../gameSession'
import { playerById, president } from '../gameSession'
import { toPublicBoard } from '../gameSession'
import { BoardStatus } from './BoardStatus'

type Props = {
  session: GameSession
  chancellorId: string
  onBackToNomination: () => void
}

/** Task 3.5 stub — president/chancellor LawCard screens come next. */
export function LegislativeStubScreen({
  session,
  chancellorId,
  onBackToNomination,
}: Props) {
  const board = toPublicBoard(session)
  const prez = president(session)
  const chancellor = playerById(session, chancellorId)

  return (
    <main className="screen legislative-stub-screen">
      <header className="screen-header">
        <p className="brand">Secret Cards</p>
        <h1>Legislative session</h1>
        <p className="lede">
          TODO: {prez.name} discards 1 of 3 LawCards, then{' '}
          {chancellor?.name ?? 'chancellor'} enacts 1 of 2 (Task 3.5).
        </p>
      </header>

      <BoardStatus board={board} />

      <footer className="screen-actions">
        <button type="button" className="btn ghost" onClick={onBackToNomination}>
          Back to nomination (dev)
        </button>
      </footer>
    </main>
  )
}
