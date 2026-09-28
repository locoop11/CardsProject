import { useEffect, useMemo, useRef, useState } from 'react'
import { castVote as apiCastVote, nominate, resolveVotes } from '../api/client'
import type { ActionResponse, PublicView } from '../api/types'
import {
  SECONDS_PER_VOTER,
  mergeView,
  playerById,
  president,
  toPublicBoard,
  winFromView,
  type GameSession,
  type WinResult,
} from '../gameSession'
import { BoardStatus } from './BoardStatus'

type Phase = 'nominate' | 'voting' | 'reveal' | 'topEnactNotice'

type Props = {
  session: GameSession
  onSessionChange: (session: GameSession) => void
  onGovernmentApproved: (chancellorId: string, view: PublicView) => void
  onWin: (win: WinResult) => void
}

function isApprovedResult(action: ActionResponse): boolean {
  return (
    action.view.phase === 'legislative_president' ||
    (action.view.phase === 'game_over' &&
      action.view.win_reason === 'hitler_elected')
  )
}

export function NominationScreen({
  session,
  onSessionChange,
  onGovernmentApproved,
  onWin,
}: Props) {
  const [phase, setPhase] = useState<Phase>('nominate')
  const [nomineeId, setNomineeId] = useState<string | null>(null)
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
  const resolvedRef = useRef(false)
  const topEnactLock = useRef(false)
  const votesRef = useRef(votes)
  const castOnServer = useRef(new Set<string>())
  votesRef.current = votes

  const board = useMemo(() => toPublicBoard(session), [session])
  const eligible = session.eligibleIds
  const prez = president(session)

  const unvoted = useMemo(
    () => session.players.filter((p) => votes[p.id] === undefined),
    [session.players, votes],
  )
  const currentVoter = unvoted[0]

  async function finishVoting(currentVotes: Record<string, boolean>) {
    if (resolvedRef.current) return
    resolvedRef.current = true
    setBusy(true)
    setError(null)
    try {
      for (const [playerId, vote] of Object.entries(currentVotes)) {
        if (castOnServer.current.has(playerId)) continue
        await apiCastVote(session.gameId, playerId, vote)
        castOnServer.current.add(playerId)
      }
      const action = await resolveVotes(session.gameId)
      setLastAction(action)
      setLockedReveal(action.votes ?? currentVotes)
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
    if (phase !== 'voting' || !currentVoter) return
    setSecondsLeft(SECONDS_PER_VOTER)
    const voterId = currentVoter.id
    const started = Date.now()
    const id = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000)
      const left = Math.max(0, SECONDS_PER_VOTER - elapsed)
      setSecondsLeft(left)
      if (left === 0) {
        window.clearInterval(id)
        if (resolvedRef.current) return
        if (votesRef.current[voterId] !== undefined) return
        const next = { ...votesRef.current, [voterId]: false }
        votesRef.current = next
        setVotes(next)
        if (Object.keys(next).length === session.players.length) {
          void finishVotingRef.current(next)
        }
      }
    }, 200)
    return () => window.clearInterval(id)
  }, [phase, currentVoter?.id, session.players.length])

  async function castVoteLocal(playerId: string, ja: boolean) {
    if (votes[playerId] !== undefined || resolvedRef.current || busy) return
    const next = { ...votes, [playerId]: ja }
    setVotes(next)
    votesRef.current = next
    try {
      await apiCastVote(session.gameId, playerId, ja)
      castOnServer.current.add(playerId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vote failed')
      return
    }
    if (Object.keys(next).length === session.players.length) {
      await finishVoting(next)
    }
  }

  async function startVote() {
    if (!nomineeId || busy) return
    setBusy(true)
    setError(null)
    try {
      const action = await nominate(session.gameId, nomineeId)
      onSessionChange(mergeView(session, action.view))
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
      if (
        lastApproved &&
        nomineeId &&
        lastAction.view.phase === 'legislative_president'
      ) {
        onGovernmentApproved(nomineeId, lastAction.view)
        return
      }
    }
    setNomineeId(null)
    setVotes({})
    setLockedReveal(null)
    setLastApproved(null)
    setLastAction(null)
    setPhase('nominate')
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

  const nominee = nomineeId ? playerById(session, nomineeId) : null
  const jaCount = lockedReveal
    ? Object.values(lockedReveal).filter(Boolean).length
    : 0
  const neinCount = lockedReveal
    ? Object.values(lockedReveal).filter((v) => !v).length
    : 0

  return (
    <main className="screen nomination-screen">
      <header className="screen-header">
        <p className="brand">Secret Cards</p>
        <h1>
          {phase === 'nominate' && 'Nomination'}
          {phase === 'voting' && 'Voting'}
          {phase === 'reveal' && 'Vote results'}
          {phase === 'topEnactNotice' && 'Top Law enacted'}
        </h1>
      </header>

      <BoardStatus board={board} />
      {error && (
        <p className="warning" role="alert">
          {error}
        </p>
      )}

      {phase === 'nominate' && eligible.length > 0 && (
        <section className="settings-block">
          <p className="lede tight">
            <strong>{prez.name}</strong> (president) nominates a chancellor.
          </p>
          <div className="nominee-grid" role="radiogroup" aria-label="Nominee">
            {eligible.map((id) => {
              const p = playerById(session, id)!
              const selected = nomineeId === id
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={
                    selected ? 'count-option selected' : 'count-option'
                  }
                  onClick={() => setNomineeId(id)}
                >
                  {p.name}
                </button>
              )
            })}
          </div>
          <div className="screen-actions nested-actions">
            <button
              type="button"
              className="btn primary"
              disabled={!nomineeId || busy}
              onClick={() => void startVote()}
            >
              Start vote (10s each)
            </button>
          </div>
        </section>
      )}

      {phase === 'voting' && nominee && (
        <section className="settings-block reveal-card">
          <p className="reveal-progress">
            {currentVoter
              ? `${secondsLeft}s for ${currentVoter.name}`
              : 'Resolving…'}
          </p>
          <p className="reveal-prompt">
            Government: <strong>{prez.name}</strong> +{' '}
            <strong>{nominee.name}</strong>
          </p>
          {currentVoter ? (
            <>
              <p className="reveal-prompt">
                Pass to <strong>{currentVoter.name}</strong> to vote
              </p>
              <p className="hint">
                Others look away. {SECONDS_PER_VOTER}s to vote; timeout counts
                as Nein.
              </p>
              <div className="vote-actions">
                <button
                  type="button"
                  className="btn primary"
                  disabled={busy}
                  onClick={() => void castVoteLocal(currentVoter.id, true)}
                >
                  Ja
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busy}
                  onClick={() => void castVoteLocal(currentVoter.id, false)}
                >
                  Nein
                </button>
              </div>
              <p className="hint">
                Voted {Object.keys(votes).length}/{session.players.length}
              </p>
            </>
          ) : (
            <p className="hint">All votes cast — resolving…</p>
          )}
        </section>
      )}

      {phase === 'reveal' && lockedReveal && nominee && (
        <section className="settings-block">
          <p className="lede tight">
            {lastApproved ? (
              <>
                Government <strong>approved</strong> ({jaCount} Ja / {neinCount}{' '}
                Nein).
              </>
            ) : (
              <>
                Government <strong>rejected</strong>. {nominee.name} is barred
                this round; {prez.name} nominates again.
              </>
            )}
          </p>
          <ul className="vote-list">
            {session.players.map((p) => (
              <li key={p.id}>
                <span>{p.name}</span>
                <strong>{lockedReveal[p.id] ? 'Ja' : 'Nein'}</strong>
              </li>
            ))}
          </ul>
          <div className="screen-actions nested-actions">
            <button
              type="button"
              className="btn primary"
              onClick={afterRevealContinue}
            >
              Continue
            </button>
          </div>
        </section>
      )}

      {phase === 'topEnactNotice' && (
        <section className="settings-block reveal-card">
          <p className="reveal-prompt">
            No eligible nominees left. Top LawCard enacted
            {topEnactColor ? (
              <>
                :{' '}
                <strong className={`law-${topEnactColor}`}>
                  {topEnactColor}
                </strong>
              </>
            ) : null}
            .
          </p>
          <p className="hint">Round advances; presidency rotates.</p>
          <div className="screen-actions nested-actions">
            <button
              type="button"
              className="btn primary"
              onClick={afterTopEnactContinue}
            >
              Continue
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
