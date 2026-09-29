import { useEffect, useState } from 'react'
import {
  president,
  type GameSession,
  type TablePlayer,
  type WinResult,
} from '../gameSession'
import { type Role, type Team } from '../roles'
import { TableBoard } from './TableBoard'

type Props = {
  session: GameSession
  win: WinResult
  onPlayAgain: () => void
}

const ROLE_FLIP_MS = 550
const POPUP_DELAY_MS = ROLE_FLIP_MS + 450

export function WinScreen({ session, win, onPlayAgain }: Props) {
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => setShowResult(true), POPUP_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [])

  const reasonLabel =
    win.reason === 'communist_laws'
      ? '5 red LawCards enacted'
      : win.reason === 'fascist_laws'
        ? '6 black LawCards enacted'
        : 'Hitler elected chancellor'

  // Prefer roles kept on the session; fall back to win result by seat order.
  const players: TablePlayer[] = session.players.map((p, i) => {
    const fromWin = win.players[i]
    return {
      ...p,
      role: (p.role ?? fromWin?.role) as Role | undefined,
      team: (p.team ?? fromWin?.team) as Team | undefined,
    }
  })

  const winners =
    win.winner === 'communist' ? 'Communists' : 'Fascists'

  return (
    <main className="screen table-layout win-screen">
      <TableBoard
        players={players}
        presidentId={president(session).id}
        rejectedIds={[]}
        previousChancellorId={null}
        redsOnTable={session.redsOnTable}
        blacksOnTable={session.blacksOnTable}
        lawsOnTable={session.lawsOnTable}
        roundNumber={session.roundNumber}
        revealRoles
      />

      {showResult && (
        <div className="table-overlay" role="dialog" aria-modal="true">
          <div className="table-overlay-panel">
            <p className="table-overlay-title">
              <span className={`team-${win.winner}`}>{winners}</span> win
            </p>
            <p className="table-overlay-hint">{reasonLabel}.</p>
            <div className="table-overlay-actions single">
              <button
                type="button"
                className="btn primary"
                onClick={onPlayAgain}
              >
                Play again
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
