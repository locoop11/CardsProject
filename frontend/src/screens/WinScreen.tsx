import {
  president,
  type GameSession,
  type TablePlayer,
  type WinResult,
} from '../gameSession'
import { teamLabel, type Role, type Team } from '../roles'
import { TableBoard } from './TableBoard'

type Props = {
  session: GameSession
  win: WinResult
  onPlayAgain: () => void
}

export function WinScreen({ session, win, onPlayAgain }: Props) {
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

  return (
    <main className="screen table-layout win-screen">
      <header className="screen-header">
        <p className="brand">Secret Cards</p>
        <h1>Game over</h1>
        <p className="lede">
          <strong className={`team-${win.winner}`}>
            {teamLabel(win.winner)}
          </strong>{' '}
          win — {reasonLabel}. Roles are face up on the table.
        </p>
      </header>

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

      <footer className="screen-actions">
        <button type="button" className="btn primary" onClick={onPlayAgain}>
          Play again
        </button>
      </footer>
    </main>
  )
}
