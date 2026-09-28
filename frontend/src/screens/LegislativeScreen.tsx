import { useMemo, useState } from 'react'
import {
  applyLegislativeEnact,
  playerById,
  president,
  toPublicBoard,
  type GameSession,
  type WinResult,
} from '../gameSession'
import { drawLawCards, type LawCardModel } from '../lawCards'
import { BoardStatus } from './BoardStatus'
import { LawCardView } from './LawCardView'

type Phase =
  | 'passPresident'
  | 'presidentDiscard'
  | 'passChancellor'
  | 'chancellorDiscard'
  | 'done'

type Props = {
  session: GameSession
  chancellorId: string
  onSessionChange: (session: GameSession) => void
  onRoundComplete: () => void
  onWin: (win: WinResult) => void
}

export function LegislativeScreen({
  session,
  chancellorId,
  onSessionChange,
  onRoundComplete,
  onWin,
}: Props) {
  const [phase, setPhase] = useState<Phase>('passPresident')
  const [hand, setHand] = useState<LawCardModel[]>(() => drawLawCards(3))
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [enactedColor, setEnactedColor] = useState<'red' | 'black' | null>(null)

  const board = useMemo(() => toPublicBoard(session), [session])
  const prez = president(session)
  const chancellor = playerById(session, chancellorId)

  function confirmPresidentDiscard() {
    if (selectedId === null || hand.length !== 3) return
    setHand(hand.filter((c) => c.id !== selectedId))
    setSelectedId(null)
    setPhase('passChancellor')
  }

  /** Chancellor discards 1 of 2; the remaining LawCard is enacted. */
  function confirmChancellorDiscard() {
    if (selectedId === null || hand.length !== 2) return
    const remaining = hand.find((c) => c.id !== selectedId)
    if (!remaining) return
    const { session: next, win } = applyLegislativeEnact(
      session,
      remaining.color,
    )
    setEnactedColor(remaining.color)
    onSessionChange(next)
    if (win) {
      onWin(win)
      return
    }
    setPhase('done')
  }

  return (
    <main className="screen legislative-screen">
      <header className="screen-header">
        <p className="brand">Secret Cards</p>
        <h1>
          {phase === 'passPresident' && 'Pass to president'}
          {phase === 'presidentDiscard' && 'President discard'}
          {phase === 'passChancellor' && 'Pass to chancellor'}
          {phase === 'chancellorDiscard' && 'Chancellor discard'}
          {phase === 'done' && 'Law enacted'}
        </h1>
      </header>

      {/* Public board only on pass / done — never beside private hands */}
      {(phase === 'passPresident' ||
        phase === 'passChancellor' ||
        phase === 'done') && <BoardStatus board={board} />}

      {phase === 'passPresident' && (
        <section className="settings-block reveal-card">
          <p className="reveal-prompt">
            Pass the device to <strong>{prez.name}</strong> (president).
          </p>
          <p className="hint">Others look away before the LawCards are shown.</p>
          <div className="screen-actions nested-actions">
            <button
              type="button"
              className="btn primary"
              onClick={() => setPhase('presidentDiscard')}
            >
              Reveal hand
            </button>
          </div>
        </section>
      )}

      {phase === 'presidentDiscard' && (
        <section className="settings-block">
          <p className="lede tight">
            <strong>{prez.name}</strong>, discard exactly one LawCard (returns
            to the deck).
          </p>
          <div className="law-hand" role="radiogroup" aria-label="LawCards">
            {hand.map((card) => (
              <LawCardView
                key={card.id}
                card={card}
                selected={selectedId === card.id}
                onSelect={() => setSelectedId(card.id)}
              />
            ))}
          </div>
          <div className="screen-actions nested-actions">
            <button
              type="button"
              className="btn primary"
              disabled={selectedId === null}
              onClick={confirmPresidentDiscard}
            >
              Discard selected
            </button>
          </div>
        </section>
      )}

      {phase === 'passChancellor' && (
        <section className="settings-block reveal-card">
          <p className="reveal-prompt">
            Pass the device to{' '}
            <strong>{chancellor?.name ?? 'chancellor'}</strong>.
          </p>
          <p className="hint">
            Two LawCards remain. Do not show them until the chancellor is ready.
          </p>
          <div className="screen-actions nested-actions">
            <button
              type="button"
              className="btn primary"
              onClick={() => setPhase('chancellorDiscard')}
            >
              Reveal hand
            </button>
          </div>
        </section>
      )}

      {phase === 'chancellorDiscard' && (
        <section className="settings-block">
          <p className="lede tight">
            <strong>{chancellor?.name}</strong>, discard exactly one LawCard
            (returns to the deck). The other is enacted on the table.
          </p>
          <div className="law-hand" role="radiogroup" aria-label="LawCards">
            {hand.map((card) => (
              <LawCardView
                key={card.id}
                card={card}
                selected={selectedId === card.id}
                onSelect={() => setSelectedId(card.id)}
              />
            ))}
          </div>
          <div className="screen-actions nested-actions">
            <button
              type="button"
              className="btn primary"
              disabled={selectedId === null}
              onClick={confirmChancellorDiscard}
            >
              Discard selected
            </button>
          </div>
        </section>
      )}

      {phase === 'done' && (
        <section className="settings-block reveal-card">
          <p className="reveal-prompt">
            A <strong className={`law-${enactedColor}`}>{enactedColor}</strong>{' '}
            LawCard was enacted. Round advances.
          </p>
          <div className="screen-actions nested-actions">
            <button
              type="button"
              className="btn primary"
              onClick={onRoundComplete}
            >
              Continue to nomination
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
