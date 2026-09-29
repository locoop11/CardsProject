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
const PLAY_AGAIN_DELAY_MS = ROLE_FLIP_MS + 450

function winMessage(win: WinResult): string {
  const side = win.winner === 'communist' ? 'Communist' : 'Fascist'
  const reason =
    win.reason === 'communist_laws'
      ? '5 red LawCards enacted'
      : win.reason === 'fascist_laws'
        ? '6 black LawCards enacted'
        : 'Hitler elected Chancellor'
  return `${side} Win: ${reason}`
}

export function WinScreen({ session, win, onPlayAgain }: Props) {
  const [showPlayAgain, setShowPlayAgain] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(
      () => setShowPlayAgain(true),
      PLAY_AGAIN_DELAY_MS,
    )
    return () => window.clearTimeout(id)
  }, [])

  // Prefer roles kept on the session; fall back to win result by seat order.
  const players: TablePlayer[] = session.players.map((p, i) => {
    const fromWin = win.players[i]
    return {
      ...p,
      role: (p.role ?? fromWin?.role) as Role | undefined,
      team: (p.team ?? fromWin?.team) as Team | undefined,
    }
  })

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
        winSummary={{ winner: win.winner, message: winMessage(win) }}
      />

      {showPlayAgain && (
        <div className="win-play-again">
          <button type="button" className="btn primary" onClick={onPlayAgain}>
            Play again
          </button>
        </div>
      )}
    </main>
  )
}
