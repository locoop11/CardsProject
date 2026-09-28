import { useMemo } from 'react'
import type { SupportedPlayerCount } from '../constants'
import { hasDuplicateNames, resolvePlayerNames } from '../names'

type Props = {
  playerCount: SupportedPlayerCount
  names: string[]
  onNameChange: (index: number, value: string) => void
  onBack: () => void
  onContinue: (resolvedNames: string[]) => void | Promise<void>
  busy?: boolean
  error?: string | null
}

export function NamesScreen({
  playerCount,
  names,
  onNameChange,
  onBack,
  onContinue,
  busy = false,
  error = null,
}: Props) {
  const previewResolved = useMemo(
    () => resolvePlayerNames(names.slice(0, playerCount)),
    [names, playerCount],
  )
  const duplicates = hasDuplicateNames(previewResolved)

  return (
    <main className="screen names-screen">
      <header className="screen-header">
        <p className="brand">Secret Cards</p>
        <h1>Player names</h1>
        <p className="lede">
          One name per seat. Leave a field blank to use Player 1, Player 2, …
        </p>
      </header>

      <section className="settings-block" aria-label="Player names">
        <ul className="name-list">
          {Array.from({ length: playerCount }, (_, i) => (
            <li key={i} className="name-row">
              <label htmlFor={`player-name-${i}`}>Seat {i + 1}</label>
              <input
                id={`player-name-${i}`}
                type="text"
                autoComplete="off"
                placeholder={`Player ${i + 1}`}
                value={names[i] ?? ''}
                onChange={(e) => onNameChange(i, e.target.value)}
              />
            </li>
          ))}
        </ul>

        {duplicates && (
          <p className="warning" role="status">
            Duplicate names are allowed, but they may be confusing at the
            table.
          </p>
        )}
      </section>

      {error && (
        <p className="warning" role="alert">
          {error}
        </p>
      )}

      <footer className="screen-actions">
        <button
          type="button"
          className="btn primary"
          disabled={busy}
          onClick={() =>
            void onContinue(resolvePlayerNames(names.slice(0, playerCount)))
          }
        >
          {busy ? 'Starting…' : 'Continue'}
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={busy}
          onClick={onBack}
        >
          Back to settings
        </button>
      </footer>
    </main>
  )
}
