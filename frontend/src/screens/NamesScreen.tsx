import type { SupportedPlayerCount } from '../constants'

type Props = {
  playerCount: SupportedPlayerCount
  onBack: () => void
}

/** Task 3.2 stub — name entry comes next. */
export function NamesScreen({ playerCount, onBack }: Props) {
  return (
    <main className="screen names-screen">
      <header className="screen-header">
        <p className="brand">Secret Cards</p>
        <h1>Player names</h1>
        <p className="lede">
          TODO: collect {playerCount} names (Task 3.2). Blank slots will
          auto-fill as Player 1, Player 2, …
        </p>
      </header>

      <footer className="screen-actions">
        <button type="button" className="btn ghost" onClick={onBack}>
          Back to settings
        </button>
      </footer>
    </main>
  )
}
