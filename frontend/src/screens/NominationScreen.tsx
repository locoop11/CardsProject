import { useEffect, useMemo, useRef, useState } from 'react'
import {
  castVote as apiCastVote,
  getGame,
  nominate,
  resolveVotes,
} from '../api/client'
import type { ActionResponse, PublicView } from '../api/types'
import {
  SECONDS_PER_VOTER,
  mergeView,
  playerById,
  president,
  winFromView,
  type GameSession,
  type WinResult,
} from '../gameSession'
import { ConfirmOverlay } from './ConfirmOverlay'
import { TableBoard } from './TableBoard'
import {
  DEFAULT_CARD_SKIN,
  type CardSkinId,
} from '../cardAssets'

type Phase = 'nominate' | 'voting' | 'reveal' | 'topEnactNotice'

type Props = {
  session: GameSession
  cardSkin?: CardSkinId
  /** Multi-device: this device's bound seat (enables concurrent vote UX). */
  selfPlayerId?: string | null
  onSessionChange: (session: GameSession) => void
  onGovernmentApproved: (chancellorId: string, view: PublicView) => void
  onWin: (win: WinResult) => void
}

const ONLINE_POLL_MS = 1500

function isApprovedResult(action: ActionResponse): boolean {
  return (
    action.view.phase === 'legislative_president' ||
    (action.view.phase === 'game_over' &&
      action.view.win_reason === 'hitler_elected')
  )
}

export function NominationScreen({
  session,
  cardSkin = DEFAULT_CARD_SKIN,
  selfPlayerId = null,
  onSessionChange,
  onGovernmentApproved,
  onWin,
}: Props) {
  const online = Boolean(selfPlayerId)
  const [phase, setPhase] = useState<Phase>('nominate')
  const [nomineeId, setNomineeId] = useState<string | null>(null)
  const [pendingNomineeId, setPendingNomineeId] = useState<string | null>(null)
  const [pendingDrawConfirm, setPendingDrawConfirm] = useState(false)
  const [votes, setVotes] = useState<Record<string, boolean>>({})
  const [secondsLeft, setSecondsLeft] = useState(SECONDS_PER_VOTER)
  const [lockedReveal, setLockedReveal] = useState<Record<
    string,
    boolean
  > | null>(null)
  const [lastApproved, setLastApproved] = useState<boolean | null>(null)
  const [lastAction, setLastAction] = useState<ActionResponse | null>(null)
  const [topEnactColor, setTopEnactColor] = useState<'red' | 'black' | null>(
    null,
  )
  const [pendingWin, setPendingWin] = useState<WinResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingVote, setPendingVote] = useState<boolean | null>(null)
  const [confirmVoteOpen, setConfirmVoteOpen] = useState(false)
  const resolvedRef = useRef(false)
  const topEnactLock = useRef(false)
  const votesRef = useRef(votes)
  const castOnServer = useRef(new Set<string>())
  const timerPausedRef = useRef(false)
  const remainingMsRef = useRef(SECONDS_PER_VOTER * 1000)
  votesRef.current = votes

  const eligible = session.eligibleIds
  const prez = president(session)
  const isSelfPresident = online && selfPlayerId === prez.id
  const canNominate = !online || isSelfPresident

  const unvoted = useMemo(
    () => session.players.filter((p) => votes[p.id] === undefined),
    [session.players, votes],
  )
  const currentVoter = online ? null : unvoted[0]
  const selfHasVoted =
    online && selfPlayerId != null && votes[selfPlayerId] !== undefined

  async function applyResolveAction(
    action: ActionResponse,
    fallbackVotes: Record<string, boolean>,
  ) {
    setLastAction(action)
    const revealVotes =
      action.votes && Object.keys(action.votes).length > 0
        ? action.votes
        : fallbackVotes
    setLockedReveal(revealVotes)
    onSessionChange(mergeView(session, action.view))

    const approved = isApprovedResult(action)
    const topEnacted = Boolean(action.enacted) && !approved
    setLastApproved(approved)

    if (topEnacted && action.enacted) {
      setTopEnactColor(action.enacted.color)
      setPendingWin(winFromView(action.view))
      setPhase('topEnactNotice')
      return
    }
    setPhase('reveal')
  }

  async function finishVoting(currentVotes: Record<string, boolean>) {
    if (resolvedRef.current) return
    resolvedRef.current = true
    setBusy(true)
    setError(null)
    try {
      if (!online) {
        for (const [playerId, vote] of Object.entries(currentVotes)) {
          if (castOnServer.current.has(playerId)) continue
          await apiCastVote(session.gameId, playerId, vote)
          castOnServer.current.add(playerId)
        }
      }
      const action = await resolveVotes(session.gameId)
      await applyResolveAction(action, currentVotes)
    } catch (err) {
      resolvedRef.current = false
      setError(err instanceof Error ? err.message : 'Failed to resolve votes')
    } finally {
      setBusy(false)
    }
  }

  const finishVotingRef = useRef(finishVoting)
  finishVotingRef.current = finishVoting

  useEffect(() => {
    if (phase !== 'nominate' || eligible.length > 0) {
      if (eligible.length > 0) topEnactLock.current = false
      return
    }
    if (topEnactLock.current) return
    topEnactLock.current = true
    setBusy(true)
    setError(null)
    void (async () => {
      try {
        const action = await nominate(session.gameId, '')
        setLastAction(action)
        onSessionChange(mergeView(session, action.view))
        if (action.enacted) {
          setTopEnactColor(action.enacted.color)
          setPendingWin(winFromView(action.view))
          setPhase('topEnactNotice')
        }
      } catch (err) {
        topEnactLock.current = false
        setError(err instanceof Error ? err.message : 'Auto-enact failed')
      } finally {
        setBusy(false)
      }
    })()
    // Intentionally only when eligibility empties in nominate phase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, eligible.length])

  useEffect(() => {
    if (online || phase !== 'voting' || !currentVoter) return
    remainingMsRef.current = SECONDS_PER_VOTER * 1000
    setSecondsLeft(SECONDS_PER_VOTER)
    timerPausedRef.current = false
    setPendingVote(null)
    setConfirmVoteOpen(false)
    const voterId = currentVoter.id
    let lastTick = Date.now()
    const id = window.setInterval(() => {
      const now = Date.now()
      if (timerPausedRef.current) {
        lastTick = now
        return
      }
      const delta = now - lastTick
      lastTick = now
      remainingMsRef.current = Math.max(0, remainingMsRef.current - delta)
      const left = Math.ceil(remainingMsRef.current / 1000)
      setSecondsLeft(left)
      if (remainingMsRef.current <= 0) {
        window.clearInterval(id)
        if (resolvedRef.current) return
        if (votesRef.current[voterId] !== undefined) return
        const next = { ...votesRef.current, [voterId]: false }
        votesRef.current = next
        setVotes(next)
        setPendingVote(null)
        setConfirmVoteOpen(false)
        if (Object.keys(next).length === session.players.length) {
          void finishVotingRef.current(next)
        }
      }
    }, 100)
    return () => window.clearInterval(id)
  }, [online, phase, currentVoter?.id, session.players.length])

  // Online: poll for remote nominate / vote progress / resolve by another client.
  useEffect(() => {
    if (!online) return
    if (phase !== 'nominate' && phase !== 'voting') return
    const id = window.setInterval(() => {
      void (async () => {
        if (resolvedRef.current) return
        try {
          const view = await getGame(session.gameId)
          onSessionChange(mergeView(session, view))
          if (phase === 'nominate' && view.nominated_chancellor_id) {
            setNomineeId(view.nominated_chancellor_id)
            resolvedRef.current = false
            castOnServer.current = new Set(view.votes_cast)
            setVotes({})
            votesRef.current = {}
            setPhase('voting')
            return
          }
          if (phase !== 'voting') return

          const fromServer: Record<string, boolean> = { ...votesRef.current }
          for (const pid of view.votes_cast) {
            if (fromServer[pid] === undefined) fromServer[pid] = true
          }
          votesRef.current = fromServer
          setVotes(fromServer)

          const leftVoting =
            view.phase === 'legislative_president' ||
            view.phase === 'game_over' ||
            (view.phase === 'nomination' && !view.nominated_chancellor_id)
          if (leftVoting) {
            resolvedRef.current = true
            await applyResolveAction({ view }, fromServer)
          }
        } catch {
          /* keep polling */
        }
      })()
    }, ONLINE_POLL_MS)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, phase, session.gameId])

  useEffect(() => {
    timerPausedRef.current = confirmVoteOpen
  }, [confirmVoteOpen])

  // Hitler elected (or other win from vote resolve): brief vote reveal, then win table.
  const onWinRef = useRef(onWin)
  onWinRef.current = onWin
  useEffect(() => {
    if (phase !== 'reveal' || !lastAction) return
    const win = winFromView(lastAction.view)
    if (!win) return
    const id = window.setTimeout(() => onWinRef.current(win), 1400)
    return () => window.clearTimeout(id)
  }, [phase, lastAction])

  async function castVoteLocal(playerId: string, ja: boolean) {
    if (votes[playerId] !== undefined || resolvedRef.current || busy) return
    const next = { ...votes, [playerId]: ja }
    setVotes(next)
    votesRef.current = next
    setPendingVote(null)
    setConfirmVoteOpen(false)
    try {
      await apiCastVote(session.gameId, playerId, ja)
      castOnServer.current.add(playerId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vote failed')
      return
    }
    if (
      Object.keys(next).length === session.players.length &&
      (!online || isSelfPresident)
    ) {
      await finishVoting(next)
    }
  }

  async function startVote(confirmedNomineeId: string) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const action = await nominate(session.gameId, confirmedNomineeId)
      onSessionChange(mergeView(session, action.view))
      setNomineeId(confirmedNomineeId)
      setPendingNomineeId(null)
      resolvedRef.current = false
      castOnServer.current = new Set()
      setVotes({})
      votesRef.current = {}
      setLockedReveal(null)
      setLastApproved(null)
      setLastAction(null)
      setPendingWin(null)
      setPhase('voting')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nominate failed')
    } finally {
      setBusy(false)
    }
  }

  function afterRevealContinue() {
    if (lastAction) {
      const win = winFromView(lastAction.view)
      if (win) {
        onWin(win)
        return
      }
    }
    setNomineeId(null)
    setVotes({})
    setLockedReveal(null)
    setLastApproved(null)
    setLastAction(null)
    setPendingDrawConfirm(false)
    setPhase('nominate')
  }

  function enterLegislative() {
    if (!lastAction || !nomineeId) return
    const win = winFromView(lastAction.view)
    if (win) {
      onWin(win)
      return
    }
    if (lastAction.view.phase === 'legislative_president') {
      onGovernmentApproved(nomineeId, lastAction.view)
    }
  }

  function afterTopEnactContinue() {
    if (pendingWin) {
      onWin(pendingWin)
      return
    }
    setTopEnactColor(null)
    setPendingWin(null)
    setNomineeId(null)
    setLastAction(null)
    setPhase('nominate')
  }

  const pendingNominee = pendingNomineeId
    ? playerById(session, pendingNomineeId)
    : null

  const voteBorders: Record<string, 'ja' | 'nein'> | undefined =
    phase === 'reveal' && lockedReveal
      ? Object.fromEntries(
          Object.entries(lockedReveal).map(([id, ja]) => [
            id,
            ja ? ('ja' as const) : ('nein' as const),
          ]),
        )
      : undefined

  const revealWin =
    phase === 'reveal' && lastAction ? winFromView(lastAction.view) : null

  const voteOutcome =
    phase === 'reveal' && lastApproved !== null && !revealWin
      ? lastApproved
        ? 'approved'
        : 'rejected'
      : null

  return (
    <main className="screen table-layout nomination-screen">
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
        viewerPlayerId={selfPlayerId}
        voteBorders={voteBorders}
        voteOutcome={voteOutcome}
        deckEnabled={
          phase === 'reveal' &&
          lastApproved === true &&
          !revealWin &&
          !pendingDrawConfirm &&
          (!online || isSelfPresident)
        }
        onDeckTap={
          phase === 'reveal' &&
          lastApproved &&
          !revealWin &&
          (!online || isSelfPresident)
            ? () => setPendingDrawConfirm(true)
            : undefined
        }
        onSeatTap={
          phase === 'nominate' && eligible.length > 0 && canNominate
            ? (id) => setPendingNomineeId(id)
            : undefined
        }
        tappableSeatIds={
          phase === 'nominate' && eligible.length > 0 && canNominate
            ? eligible
            : undefined
        }
        selectedSeatId={pendingNomineeId}
        eligibleHighlightIds={
          phase === 'nominate' && eligible.length > 0 ? eligible : undefined
        }
      />

      {phase === 'nominate' && online && !canNominate && (
        <p className="lede tight table-layout-warning">
          Waiting for {prez.name} to nominate…
        </p>
      )}

      {error && (
        <p className="warning table-layout-warning" role="alert">
          {error}
        </p>
      )}

      {phase === 'nominate' && pendingNominee && (
        <ConfirmOverlay
          title={`Choose ${pendingNominee.name} as chancellor?`}
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          busy={busy}
          onCancel={() => setPendingNomineeId(null)}
          onConfirm={() => void startVote(pendingNominee.id)}
        />
      )}

      {phase === 'voting' && online && selfPlayerId && !selfHasVoted && !confirmVoteOpen && (
        <div className="table-overlay" role="dialog" aria-modal="true">
          <div className="table-overlay-panel">
            <p className="table-overlay-title">Your vote</p>
            <p className="table-overlay-hint">
              Voted {Object.keys(votes).length}/{session.players.length} · cast
              only your own ballot.
            </p>
            <div className="vote-overlay-choices">
              <button
                type="button"
                className={
                  pendingVote === true
                    ? 'vote-choice ja selected'
                    : 'vote-choice ja'
                }
                disabled={busy}
                onClick={() => setPendingVote(true)}
              >
                Ja
              </button>
              <button
                type="button"
                className={
                  pendingVote === false
                    ? 'vote-choice nein selected'
                    : 'vote-choice nein'
                }
                disabled={busy}
                onClick={() => setPendingVote(false)}
              >
                Nein
              </button>
            </div>
            <div className="table-overlay-actions single">
              <button
                type="button"
                className="btn primary"
                disabled={pendingVote === null || busy}
                onClick={() => setConfirmVoteOpen(true)}
              >
                Confirm vote
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'voting' &&
        online &&
        selfPlayerId &&
        confirmVoteOpen &&
        pendingVote !== null && (
          <ConfirmOverlay
            title={`Cast ${pendingVote ? 'Ja' : 'Nein'}?`}
            confirmLabel="Cast vote"
            cancelLabel="Change"
            busy={busy}
            onCancel={() => setConfirmVoteOpen(false)}
            onConfirm={() => void castVoteLocal(selfPlayerId, pendingVote)}
          />
        )}

      {phase === 'voting' && online && selfHasVoted && (
        <div className="table-overlay" role="status">
          <div className="table-overlay-panel">
            <p className="table-overlay-title">Waiting for other votes…</p>
            <p className="table-overlay-hint">
              Voted {Object.keys(votes).length}/{session.players.length}
            </p>
            {isSelfPresident && (
              <div className="table-overlay-actions single">
                <button
                  type="button"
                  className="btn primary"
                  disabled={busy}
                  onClick={() => void finishVoting(votesRef.current)}
                >
                  Force resolve (missing = Nein)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {phase === 'voting' && !online && currentVoter && !confirmVoteOpen && (
        <div className="table-overlay" role="dialog" aria-modal="true">
          <div className="table-overlay-panel">
            <p className="table-overlay-title">
              Pass to {currentVoter.name}
            </p>
            <p className="table-overlay-hint">
              {secondsLeft}s left · Others look away. Timeout counts as Nein.
            </p>
            <div className="vote-overlay-choices">
              <button
                type="button"
                className={
                  pendingVote === true
                    ? 'vote-choice ja selected'
                    : 'vote-choice ja'
                }
                disabled={busy}
                onClick={() => setPendingVote(true)}
              >
                Ja
              </button>
              <button
                type="button"
                className={
                  pendingVote === false
                    ? 'vote-choice nein selected'
                    : 'vote-choice nein'
                }
                disabled={busy}
                onClick={() => setPendingVote(false)}
              >
                Nein
              </button>
            </div>
            <div className="table-overlay-actions single">
              <button
                type="button"
                className="btn primary"
                disabled={pendingVote === null || busy}
                onClick={() => setConfirmVoteOpen(true)}
              >
                Confirm vote
              </button>
            </div>
            <p className="table-overlay-hint">
              Voted {Object.keys(votes).length}/{session.players.length}
            </p>
          </div>
        </div>
      )}

      {phase === 'voting' &&
        !online &&
        currentVoter &&
        confirmVoteOpen &&
        pendingVote !== null && (
          <ConfirmOverlay
            title={`Cast ${pendingVote ? 'Ja' : 'Nein'} for ${currentVoter.name}?`}
            confirmLabel="Cast vote"
            cancelLabel="Change"
            busy={busy}
            onCancel={() => setConfirmVoteOpen(false)}
            onConfirm={() => void castVoteLocal(currentVoter.id, pendingVote)}
          />
        )}

      {phase === 'voting' && !online && !currentVoter && (
        <div className="table-overlay" role="status">
          <div className="table-overlay-panel">
            <p className="table-overlay-title">Resolving…</p>
          </div>
        </div>
      )}

      {phase === 'reveal' && lastApproved === false && !revealWin && (
        <div className="reveal-continue-bar">
          <button
            type="button"
            className="btn primary"
            onClick={afterRevealContinue}
          >
            Continue
          </button>
        </div>
      )}

      {phase === 'reveal' && pendingDrawConfirm && !revealWin && (
        <ConfirmOverlay
          title="Draw 3 LawCards?"
          hint="President draws from the deck."
          confirmLabel="Draw"
          cancelLabel="Cancel"
          onCancel={() => setPendingDrawConfirm(false)}
          onConfirm={() => {
            setPendingDrawConfirm(false)
            enterLegislative()
          }}
        />
      )}

      {phase === 'topEnactNotice' && (
        <div className="table-overlay" role="dialog" aria-modal="true">
          <div className="table-overlay-panel">
            <p className="table-overlay-title">Top Law enacted</p>
            <p className="table-overlay-hint">
              No eligible nominees left.
              {topEnactColor ? (
                <>
                  {' '}
                  Enacted:{' '}
                  <strong className={`law-${topEnactColor}`}>
                    {topEnactColor}
                  </strong>
                  .
                </>
              ) : null}{' '}
              Round advances; presidency rotates.
            </p>
            <div className="table-overlay-actions single">
              <button
                type="button"
                className="btn primary"
                onClick={afterTopEnactContinue}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
