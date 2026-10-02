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
import {
  DEFAULT_CARD_SKIN,
  type CardSkinId,
} from '../cardAssets'
import { ConfirmOverlay } from './ConfirmOverlay'
import { LawCardView } from './LawCardView'
import { TableBoard } from './TableBoard'

type Phase =
  | 'loading'
  | 'presidentSelect'
  | 'presidentFaceDown'
  | 'passChancellor'
  | 'chancellorSelect'
  | 'done'

type Props = {
  session: GameSession
  chancellorId: string
  cardSkin?: CardSkinId
  onSessionChange: (session: GameSession) => void
  onRoundComplete: () => void
  onWin: (win: WinResult) => void
}

export function LegislativeScreen({
  session,
  chancellorId,
  cardSkin = DEFAULT_CARD_SKIN,
  onSessionChange,
  onRoundComplete,
  onWin,
}: Props) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [hand, setHand] = useState<LawCardDto[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [pendingDiscardId, setPendingDiscardId] = useState<number | null>(null)
  const [cardsFaceDown, setCardsFaceDown] = useState(false)
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
        setPhase('presidentSelect')
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
    if (pendingDiscardId === null || hand.length !== 3 || busy) return
    setBusy(true)
    setError(null)
    try {
      const action = await presidentDiscard(session.gameId, pendingDiscardId)
      onSessionChange(mergeView(session, action.view))
      setHand(action.hand ?? hand.filter((c) => c.id !== pendingDiscardId))
      setSelectedId(null)
      setPendingDiscardId(null)
      setCardsFaceDown(true)
      setPhase('presidentFaceDown')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Discard failed')
    } finally {
      setBusy(false)
    }
  }

  /** Chancellor discards 1 of 2; API enacts the remaining LawCard. */
  async function confirmChancellorDiscard() {
    if (pendingDiscardId === null || hand.length !== 2 || busy) return
    const remaining = hand.find((c) => c.id !== pendingDiscardId)
    if (!remaining) return
    setBusy(true)
    setError(null)
    try {
      const action = await chancellorEnact(session.gameId, remaining.id)
      onSessionChange(mergeView(session, action.view))
      const color = action.enacted?.color ?? remaining.color
      setEnactedColor(color)
      setPendingDiscardId(null)
      setSelectedId(null)
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

  const showCardOverlay =
    phase === 'presidentSelect' ||
    phase === 'presidentFaceDown' ||
    phase === 'passChancellor' ||
    phase === 'chancellorSelect'

  const cardsInteractive =
    (phase === 'presidentSelect' || phase === 'chancellorSelect') &&
    pendingDiscardId === null

  return (
    <main className="screen table-layout legislative-screen">
      <TableBoard
        players={session.players}
        presidentId={prez.id}
        rejectedIds={session.rejectedIds}
        previousChancellorId={session.previousChancellorId}
        redsOnTable={session.redsOnTable}
        blacksOnTable={session.blacksOnTable}
        lawsOnTable={session.lawsOnTable}
        roundNumber={session.roundNumber}
        cardSkin={cardSkin}
      />

      {error && (
        <p className="warning table-layout-warning" role="alert">
          {error}
        </p>
      )}

      {showCardOverlay && (
        <div className="table-card-overlay" aria-label="LawCards">
          <p className="table-card-overlay-hint">
            {phase === 'presidentSelect' &&
              `${prez.name}: tap a LawCard to discard`}
            {(phase === 'presidentFaceDown' || phase === 'passChancellor') &&
              'LawCards face down — pass the phone'}
            {phase === 'chancellorSelect' &&
              `${chancellor?.name ?? 'Chancellor'}: tap a LawCard to discard`}
          </p>
          <div className="law-hand" role="radiogroup" aria-label="LawCards">
            {hand.map((card) => (
              <LawCardView
                key={card.id}
                card={card}
                cardSkin={cardSkin}
                faceDown={cardsFaceDown}
                selected={selectedId === card.id}
                onSelect={
                  cardsInteractive
                    ? () => {
                        setSelectedId(card.id)
                        setPendingDiscardId(card.id)
                      }
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      )}

      {phase === 'presidentSelect' && pendingDiscardId !== null && (
        <ConfirmOverlay
          title="Discard this LawCard?"
          hint="It returns to the deck. The other two pass face down to the chancellor."
          confirmLabel="Discard"
          cancelLabel="Change"
          busy={busy}
          onCancel={() => {
            setPendingDiscardId(null)
            setSelectedId(null)
          }}
          onConfirm={() => void confirmPresidentDiscard()}
        />
      )}

      {phase === 'presidentFaceDown' && (
        <ConfirmOverlay
          light
          title={`Pass the phone to ${chancellor?.name ?? 'chancellor'}?`}
          hint="Leave the two LawCards face down on the table."
          confirmLabel="Pass phone"
          onConfirm={() => {
            setCardsFaceDown(true)
            setPhase('passChancellor')
          }}
        />
      )}

      {phase === 'passChancellor' && (
        <ConfirmOverlay
          light
          title={`Ready, ${chancellor?.name ?? 'chancellor'}?`}
          hint="Others look away, then turn the LawCards face up."
          confirmLabel="Turn face up"
          onConfirm={() => {
            setCardsFaceDown(false)
            setSelectedId(null)
            setPendingDiscardId(null)
            setPhase('chancellorSelect')
          }}
        />
      )}

      {phase === 'chancellorSelect' && pendingDiscardId !== null && (
        <ConfirmOverlay
          title="Discard this LawCard?"
          hint="The other LawCard will be enacted on the table."
          confirmLabel="Discard & enact"
          cancelLabel="Change"
          busy={busy}
          onCancel={() => {
            setPendingDiscardId(null)
            setSelectedId(null)
          }}
          onConfirm={() => void confirmChancellorDiscard()}
        />
      )}

      {phase === 'done' && (
        <div className="table-overlay" role="dialog" aria-modal="true">
          <div className="table-overlay-panel">
            <p className="table-overlay-title">Law enacted</p>
            <p className="table-overlay-hint">
              A{' '}
              <strong className={`law-${enactedColor}`}>{enactedColor}</strong>{' '}
              LawCard was enacted. Round advances.
            </p>
            <div className="table-overlay-actions single">
              <button
                type="button"
                className="btn primary"
                onClick={onRoundComplete}
              >
                Continue to nomination
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'loading' && (
        <div className="table-overlay" role="status">
          <div className="table-overlay-panel">
            <p className="table-overlay-title">Drawing LawCards…</p>
          </div>
        </div>
      )}
    </main>
  )
}
