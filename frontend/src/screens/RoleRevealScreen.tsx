import { useMemo, useState } from 'react'
import type { RoleRevealPlayer } from '../api/types'
import {
  roleLabel,
  roleToPlayingCard,
  teamLabel,
  type Role,
} from '../roles'
import { PlayingCardFace } from './PlayingCardFace'

type Phase = 'pass' | 'revealed'

type Props = {
  players: RoleRevealPlayer[]
  onBackToNames: () => void
  onComplete: () => void
}

function assignRevealCards(players: RoleRevealPlayer[]) {
  const fascistIndex = { n: 0 }
  const communistIndex = { n: 0 }
  const byId = new Map<string, { color: 'red' | 'black'; number: number }>()
  for (const player of players) {
    const role = player.role as Role
    let same = 0
    if (role === 'fascist') {
      same = fascistIndex.n
      fascistIndex.n += 1
    } else if (role === 'communist') {
      same = communistIndex.n
      communistIndex.n += 1
    }
    byId.set(player.id, roleToPlayingCard(role, same))
  }
  return byId
}

export function RoleRevealScreen({
  players,
  onBackToNames,
  onComplete,
}: Props) {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('pass')
  const cardsById = useMemo(() => assignRevealCards(players), [players])

  const player = players[index]
  if (!player) {
    return null
  }

  const card = cardsById.get(player.id) ?? { color: 'black' as const, number: 1 }
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
    <main className="screen table-layout role-reveal-screen">
      <div className="table-board" aria-hidden="true">
        <div className="table-felt role-reveal-felt">
          <div className="table-oval role-reveal-oval" />
        </div>
      </div>

      <div
        className="table-overlay table-overlay-light role-reveal-overlay"
        role="dialog"
        aria-modal="true"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="table-overlay-panel role-reveal-panel">
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

          <div
            className={
              phase === 'revealed'
                ? 'role-reveal-card is-face-up'
                : 'role-reveal-card'
            }
            aria-hidden={phase === 'pass'}
          >
            {phase === 'pass' ? (
              <PlayingCardFace color="black" number={1} faceDown />
            ) : (
              <PlayingCardFace color={card.color} number={card.number} />
            )}
          </div>

          <div className="table-overlay-actions single">
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
          </div>

          {isFirst && (
            <button
              type="button"
              className="btn ghost role-reveal-back"
              onClick={onBackToNames}
            >
              Back to names
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
