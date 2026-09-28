import { useState } from 'react'
import type { RoleRevealPlayer } from '../api/types'
import { roleLabel, teamLabel } from '../roles'

type Phase = 'pass' | 'revealed'

type Props = {
  players: RoleRevealPlayer[]
  onBackToNames: () => void
  onComplete: () => void
}

export function RoleRevealScreen({
  players,
  onBackToNames,
  onComplete,
}: Props) {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('pass')

  const player = players[index]
  if (!player) {
    return null
  }

  const isFirst = index === 0 && phase === 'pass'
  const isLast = index === players.length - 1

  function handleHideAndContinue() {
    if (isLast) {
      onComplete()
      return
    }
    setIndex((i) => i + 1)
    setPhase('pass')
  }

  return (
    <main className="screen role-reveal-screen">
      <header className="screen-header">
        <p className="brand">Secret Cards</p>
        <h1>Role reveal</h1>
        <p className="lede">
          One player at a time. Look only at your own role, then pass the
          device.
        </p>
      </header>

      <section
        className="settings-block reveal-card"
        aria-live="polite"
        aria-atomic="true"
      >
        <p className="reveal-progress">
          Player {index + 1} of {players.length}
        </p>

        {phase === 'pass' ? (
          <>
            <p className="reveal-prompt">
              Pass the device to <strong>{player.name}</strong>
            </p>
            <p className="hint">
              Everyone else look away. {player.name} taps Reveal when ready.
            </p>
          </>
        ) : (
          <>
            <p className="reveal-prompt">
              <strong>{player.name}</strong>, your role
            </p>
            <p className={`role-badge role-${player.role}`}>
              {roleLabel(player.role)}
            </p>
            <p className={`team-line team-${player.team}`}>
              Team: {teamLabel(player.team)}
            </p>
            <p className="hint">Memorize this, then hide before passing on.</p>
          </>
        )}
      </section>

      <footer className="screen-actions">
        {phase === 'pass' ? (
          <button
            type="button"
            className="btn primary"
            onClick={() => setPhase('revealed')}
          >
            Reveal
          </button>
        ) : (
          <button
            type="button"
            className="btn primary"
            onClick={handleHideAndContinue}
          >
            {isLast ? 'Hide and start game' : 'Hide and continue'}
          </button>
        )}

        {isFirst && (
          <button type="button" className="btn ghost" onClick={onBackToNames}>
            Back to names
          </button>
        )}
      </footer>
    </main>
  )
}
