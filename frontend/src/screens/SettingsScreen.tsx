import { useState } from 'react'
import {
  SUPPORTED_PLAYER_COUNTS,
  type SupportedPlayerCount,
} from '../constants'
import {
  CARD_SKIN_LABELS,
  type CardSkinId,
} from '../cardAssets'

type HubProps = {
  playerCount: SupportedPlayerCount
  cardSkin: CardSkinId
  onPlayerCountChange: (count: SupportedPlayerCount) => void
  onOpenNames: () => void
  onOpenSkin: () => void
  onStartGame: () => void | Promise<void>
  busy?: boolean
  error?: string | null
}

export function SettingsHubScreen({
  playerCount,
  cardSkin,
  onPlayerCountChange,
  onOpenNames,
  onOpenSkin,
  onStartGame,
  busy = false,
  error = null,
}: HubProps) {
  const [playersOpen, setPlayersOpen] = useState(false)

  return (
    <main className="screen settings-screen settings-hub">
      <div className="settings-hub-backdrop" aria-hidden="true">
        <div className="table-felt settings-hub-felt">
          <div className="table-oval settings-hub-oval" />
        </div>
      </div>

      <header className="settings-hub-header">
        <p className="brand">Secret Cards</p>
        <h1>Game settings</h1>
      </header>

      <div className="settings-hub-options">
        <div className="settings-hub-options-inner">
          <p className="lede">
            Set up the table, then start. Pass one device around.
          </p>

          <nav className="hub-rows" aria-label="Settings">
            <div className="hub-row-group">
              <button
                type="button"
                className={
                  playersOpen
                    ? 'hub-row hub-row-expandable is-open'
                    : 'hub-row hub-row-expandable'
                }
                aria-expanded={playersOpen}
                aria-controls="players-number-choices"
                onClick={() => setPlayersOpen((open) => !open)}
              >
                <span className="hub-row-label">Players Number</span>
                <span className="hub-row-summary">{playerCount}</span>
              </button>

              {playersOpen && (
                <div
                  id="players-number-choices"
                  className="hub-row-panel"
                  role="radiogroup"
                  aria-label="Players Number"
                >
                  <div className="count-grid">
                    {SUPPORTED_PLAYER_COUNTS.map((count) => {
                      const selected = count === playerCount
                      return (
                        <button
                          key={count}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          className={
                            selected ? 'count-option selected' : 'count-option'
                          }
                          onClick={() => onPlayerCountChange(count)}
                        >
                          {count}
                        </button>
                      )
                    })}
                  </div>
                  <p className="hint">Supported counts: 5–10.</p>
                </div>
              )}
            </div>

            <button type="button" className="hub-row" onClick={onOpenNames}>
              <span className="hub-row-label">Player names</span>
              <span className="hub-row-summary">{playerCount} seats</span>
            </button>
            <button type="button" className="hub-row" onClick={onOpenSkin}>
              <span className="hub-row-label">Card set skin</span>
              <span className="hub-row-summary">{CARD_SKIN_LABELS[cardSkin]}</span>
            </button>
          </nav>

          {error && (
            <p className="warning" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      <footer className="settings-hub-footer">
        <button
          type="button"
          className="btn primary"
          disabled={busy}
          onClick={() => void onStartGame()}
        >
          {busy ? 'Starting…' : 'Start game'}
        </button>
      </footer>
    </main>
  )
}
