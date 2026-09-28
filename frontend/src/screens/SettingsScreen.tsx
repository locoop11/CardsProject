import {
  SUPPORTED_PLAYER_COUNTS,
  type SupportedPlayerCount,
} from '../constants'

type Props = {
  playerCount: SupportedPlayerCount
  onPlayerCountChange: (count: SupportedPlayerCount) => void
  onContinue: () => void
}

export function SettingsScreen({
  playerCount,
  onPlayerCountChange,
  onContinue,
}: Props) {
  return (
    <main className="screen settings-screen">
      <header className="screen-header">
        <p className="brand">Secret Cards</p>
        <h1>Game settings</h1>
        <p className="lede">
          Choose how many players. Pass one device around the table.
        </p>
      </header>

      <section className="settings-block" aria-labelledby="player-count-label">
        <h2 id="player-count-label">Players</h2>
        <div className="count-grid" role="radiogroup" aria-label="Player count">
          {SUPPORTED_PLAYER_COUNTS.map((count) => {
            const selected = count === playerCount
            return (
              <button
                key={count}
                type="button"
                role="radio"
                aria-checked={selected}
                className={selected ? 'count-option selected' : 'count-option'}
                onClick={() => onPlayerCountChange(count)}
              >
                {count}
              </button>
            )
          })}
        </div>
        <p className="hint">Supported counts: 5–10.</p>
      </section>

      <footer className="screen-actions">
        <button type="button" className="btn primary" onClick={onContinue}>
          Continue
        </button>
      </footer>
    </main>
  )
}
