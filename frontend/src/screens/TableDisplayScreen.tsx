import { useEffect, useState } from 'react'
import { getGame } from '../api/client'
import type { PublicView } from '../api/types'
import {
  DEFAULT_CARD_SKIN,
  type CardSkinId,
} from '../cardAssets'
import {
  mergeView,
  president,
  sessionFromView,
  winFromView,
  type GameSession,
} from '../gameSession'
import { TableBoard } from './TableBoard'

type Props = {
  gameId: string
  initialView: PublicView
  cardSkin?: CardSkinId
  onLeave: () => void
}

const POLL_MS = 1500

/**
 * Public projector for hybrid v3. Polls the public board only — never fetches
 * roles, hands, or seat actions.
 */
export function TableDisplayScreen({
  gameId,
  initialView,
  cardSkin = DEFAULT_CARD_SKIN,
  onLeave,
}: Props) {
  const [view, setView] = useState<PublicView>(initialView)
  const [session, setSession] = useState<GameSession>(() =>
    sessionFromView(initialView),
  )
  const [error, setError] = useState<string | null>(null)
  const win = winFromView(view)

  useEffect(() => {
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const next = await getGame(gameId)
          setView(next)
          setSession((prev) => mergeView(prev, next))
          setError(null)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not refresh board')
        }
      })()
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [gameId])

  const phaseLabel =
    session.phase === 'game_over'
      ? 'Game over'
      : session.phase.replaceAll('_', ' ')

  return (
    <main className="screen table-layout table-display-screen">
      <header className="screen-header">
        <p className="brand">Secret Cards</p>
        <h1>Table</h1>
        <p className="lede tight">
          Round {session.roundNumber} · {phaseLabel}
        </p>
      </header>

      <TableBoard
        players={session.players}
        presidentId={president(session).id}
        rejectedIds={session.rejectedIds}
        previousChancellorId={session.previousChancellorId}
        redsOnTable={session.redsOnTable}
        blacksOnTable={session.blacksOnTable}
        lawsOnTable={session.lawsOnTable}
        roundNumber={session.roundNumber}
        cardSkin={cardSkin}
        revealRoles={false}
        winSummary={
          win
            ? {
                winner: win.winner,
                message:
                  win.winner === 'communist'
                    ? 'Communist Win'
                    : 'Fascist Win',
              }
            : null
        }
      />

      {error && (
        <p className="table-layout-warning" role="alert">
          {error}
        </p>
      )}

      <footer className="table-display-footer">
        <button type="button" className="btn ghost" onClick={onLeave}>
          Leave table
        </button>
      </footer>
    </main>
  )
}
