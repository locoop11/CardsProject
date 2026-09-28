import { useEffect, useMemo, useRef, useState } from 'react'
import {
  SECONDS_PER_VOTER,
  checkEnactmentWin,
  checkHitlerElected,
  eligibleChancellorIds,
  enactTopLaw,
  playerById,
  president,
  rejectNominee,
  resolveElection,
  toPublicBoard,
  type GameSession,
  type WinResult,
} from '../gameSession'
import { BoardStatus } from './BoardStatus'

type Phase = 'nominate' | 'voting' | 'reveal' | 'topEnactNotice'

type Props = {
  session: GameSession
  onSessionChange: (session: GameSession) => void
  onGovernmentApproved: (chancellorId: string) => void
  onWin: (win: WinResult) => void
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
  const [topEnactColor, setTopEnactColor] = useState<'red' | 'black' | null>(
    null,
  )
  const [pendingWin, setPendingWin] = useState<WinResult | null>(null)
  const resolvedRef = useRef(false)
  const topEnactLock = useRef(false)
  const votesRef = useRef(votes)
  votesRef.current = votes

  const board = useMemo(() => toPublicBoard(session), [session])
  const eligible = useMemo(() => eligibleChancellorIds(session), [session])
  const prez = president(session)

  const unvoted = useMemo(
    () => session.players.filter((p) => votes[p.id] === undefined),
    [session.players, votes],
  )
  const currentVoter = unvoted[0]

  function finishVoting(currentVotes: Record<string, boolean>) {
    if (resolvedRef.current) return
    resolvedRef.current = true
    const { approved, locked } = resolveElection(
      session.players.map((p) => p.id),
      currentVotes,
    )
    setLockedReveal(locked)
    setLastApproved(approved)
    setPhase('reveal')
    if (!approved && nomineeId) {
      onSessionChange(rejectNominee(session, nomineeId))
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
    const { session: next, color, win } = enactTopLaw(session)
    setTopEnactColor(color)
    setPendingWin(win)
    setPhase('topEnactNotice')
    onSessionChange(next)
  }, [phase, eligible.length, session, onSessionChange])

  // Each voter gets SECONDS_PER_VOTER. Timeout → Nein for that player, then next.
  // Timer key is currentVoter so a fresh countdown starts on each pass.
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
          finishVotingRef.current(next)
        }
      }
    }, 200)
    return () => window.clearInterval(id)
  }, [phase, currentVoter?.id, session.players.length])

  function castVote(playerId: string, ja: boolean) {
    if (votes[playerId] !== undefined || resolvedRef.current) return
    const next = { ...votes, [playerId]: ja }
    setVotes(next)
    votesRef.current = next
    if (Object.keys(next).length === session.players.length) {
      finishVoting(next)
    }
  }

  function startVote() {
    if (!nomineeId) return
    resolvedRef.current = false
    setVotes({})
    votesRef.current = {}
    setLockedReveal(null)
    setLastApproved(null)
    setPendingWin(null)
    setPhase('voting')
  }

  function afterRevealContinue() {
    if (lastApproved && nomineeId) {
      const hitlerWin = checkHitlerElected(session, nomineeId)
      if (hitlerWin) {
        onWin(hitlerWin)
        return
      }
      onGovernmentApproved(nomineeId)
      return
    }
    setNomineeId(null)
    setVotes({})
    setLockedReveal(null)
    setLastApproved(null)
    setPhase('nominate')
  }

  function afterTopEnactContinue() {
    if (pendingWin) {
      onWin(pendingWin)
      return
    }
    const win = checkEnactmentWin(session.redsOnTable, session.blacksOnTable)
    if (win) {
      onWin(win)
      return
    }
    setTopEnactColor(null)
    setPendingWin(null)
    setNomineeId(null)
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
              disabled={!nomineeId}
              onClick={startVote}
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
                  onClick={() => castVote(currentVoter.id, true)}
                >
                  Ja
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => castVote(currentVoter.id, false)}
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
                : <strong className={`law-${topEnactColor}`}>
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
