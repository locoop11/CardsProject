import { useMemo } from 'react'
import type { SupportedPlayerCount } from '../constants'
import { hasDuplicateNames, resolvePlayerNames } from '../names'

type Props = {
  playerCount: SupportedPlayerCount
  names: string[]
  onNameChange: (index: number, value: string) => void
  onBack: () => void
  busy?: boolean
}

export function NamesScreen({
  playerCount,
  names,
  onNameChange,
  onBack,
  busy = false,
}: Props) {
  const previewResolved = useMemo(
    () => resolvePlayerNames(names.slice(0, playerCount)),
    [names, playerCount],
  )
  const duplicates = hasDuplicateNames(previewResolved)

  return (
    <main className="screen settings-screen settings-hub">
      <div className="settings-hub-backdrop" aria-hidden="true">
        <div className="table-felt settings-hub-felt">
          <div className="table-oval settings-hub-oval" />
        </div>
      </div>

      <header className="settings-hub-header">
        <p className="brand">Secret Cards</p>
        <h1>Player names</h1>
      </header>

      <div className="settings-hub-options">
        <div className="settings-hub-options-inner">
          <p className="lede">
            One name per seat. Leave a field blank to use Player 1, Player 2, …
          </p>

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
        </div>
      </div>

      <footer className="settings-hub-footer">
        <button
          type="button"
          className="btn primary"
          disabled={busy}
          onClick={onBack}
        >
          Back
        </button>
      </footer>
    </main>
  )
}
