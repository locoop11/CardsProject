import type { GameSession, WinResult } from '../gameSession'
import { teamLabel } from '../roles'
import { toPublicBoard } from '../gameSession'
import { BoardStatus } from './BoardStatus'

type Props = {
  session: GameSession
  win: WinResult
  onPlayAgain: () => void
}

export function WinScreen({ session, win, onPlayAgain }: Props) {
  const board = toPublicBoard(session)
  const reasonLabel =
    win.reason === 'communist_laws'
      ? '5 red LawCards enacted'
      : win.reason === 'fascist_laws'
        ? '6 black LawCards enacted'
        : 'Hitler elected chancellor'

  const roleRows =
    win.players.length > 0
      ? win.players
      : session.players.map((p) => ({
          name: p.name,
          role: p.role ?? 'communist',
          team: p.team ?? 'communist',
        }))

  return (
    <main className="screen win-screen">
      <header className="screen-header">
        <p className="brand">Secret Cards</p>
        <h1>Game over</h1>
        <p className="lede">
          <strong className={`team-${win.winner}`}>
            {teamLabel(win.winner)}
          </strong>{' '}
          win — {reasonLabel}.
        </p>
      </header>

      <BoardStatus board={board} />

      <section className="settings-block">
        <h2>Roles</h2>
        <ul className="vote-list">
          {roleRows.map((p) => (
            <li key={p.name}>
              <span>{p.name}</span>
              <strong>
                {p.role} · {p.team}
              </strong>
            </li>
          ))}
        </ul>
      </section>

      <footer className="screen-actions">
        <button type="button" className="btn primary" onClick={onPlayAgain}>
          Play again
        </button>
      </footer>
    </main>
  )
}
