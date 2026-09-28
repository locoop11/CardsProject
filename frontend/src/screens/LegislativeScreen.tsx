import { useEffect, useState } from 'react'
import {
  chancellorEnact,
  getHand,
  presidentDiscard,
} from '../api/client'
import type { LawCardDto } from '../api/types'
import {
  mergeView,
  playerById,
  president,
  winFromView,
  type GameSession,
  type WinResult,
} from '../gameSession'
import { LawCardView } from './LawCardView'
import { TableBoard } from './TableBoard'

type Phase =
  | 'loading'
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
  const [phase, setPhase] = useState<Phase>('loading')
  const [hand, setHand] = useState<LawCardDto[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [enactedColor, setEnactedColor] = useState<'red' | 'black' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const prez = president(session)
  const chancellor = playerById(session, chancellorId)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await getHand(session.gameId, prez.id)
        if (cancelled) return
        setHand(res.cards)
        setPhase('passPresident')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load hand')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session.gameId, prez.id])

  async function confirmPresidentDiscard() {
    if (selectedId === null || hand.length !== 3 || busy) return
    setBusy(true)
    setError(null)
    try {
      const action = await presidentDiscard(session.gameId, selectedId)
      onSessionChange(mergeView(session, action.view))
      setHand(action.hand ?? hand.filter((c) => c.id !== selectedId))
      setSelectedId(null)
      setPhase('passChancellor')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Discard failed')
    } finally {
      setBusy(false)
    }
  }

  /** Chancellor discards 1 of 2; API enacts the remaining LawCard. */
  async function confirmChancellorDiscard() {
    if (selectedId === null || hand.length !== 2 || busy) return
    const remaining = hand.find((c) => c.id !== selectedId)
    if (!remaining) return
    setBusy(true)
    setError(null)
    try {
      const action = await chancellorEnact(session.gameId, remaining.id)
      onSessionChange(mergeView(session, action.view))
      const color = action.enacted?.color ?? remaining.color
      setEnactedColor(color)
      const win = winFromView(action.view)
      if (win) {
        onWin(win)
        return
      }
      setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enact failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="screen table-layout legislative-screen">
      <header className="screen-header">
        <p className="brand">Secret Cards</p>
        <h1>
          {phase === 'loading' && 'Drawing LawCards…'}
          {phase === 'passPresident' && 'Pass to president'}
          {phase === 'presidentDiscard' && 'President discard'}
          {phase === 'passChancellor' && 'Pass to chancellor'}
          {phase === 'chancellorDiscard' && 'Chancellor discard'}
          {phase === 'done' && 'Law enacted'}
        </h1>
      </header>

      {(phase === 'passPresident' ||
        phase === 'passChancellor' ||
        phase === 'done') && (
        <TableBoard
          players={session.players}
          presidentId={prez.id}
          rejectedIds={session.rejectedIds}
          redsOnTable={session.redsOnTable}
          blacksOnTable={session.blacksOnTable}
          roundNumber={session.roundNumber}
        />
      )}

      {error && (
        <p className="warning" role="alert">
          {error}
        </p>
      )}

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
              disabled={selectedId === null || busy}
              onClick={() => void confirmPresidentDiscard()}
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
              disabled={selectedId === null || busy}
              onClick={() => void confirmChancellorDiscard()}
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
