import { useCallback, useState } from 'react'
import { createGame, deleteGame } from './api/client'
import type { RoleRevealPlayer } from './api/types'
import type { SupportedPlayerCount } from './constants'
import {
  mergeView,
  sessionFromView,
  type GameSession,
  type WinResult,
} from './gameSession'
import { LegislativeScreen } from './screens/LegislativeScreen'
import { NamesScreen } from './screens/NamesScreen'
import { NominationScreen } from './screens/NominationScreen'
import { RoleRevealScreen } from './screens/RoleRevealScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { WinScreen } from './screens/WinScreen'
import './App.css'

type Step =
  | 'settings'
  | 'names'
  | 'roleReveal'
  | 'nomination'
  | 'legislative'
  | 'win'

function emptyNames(count: number): string[] {
  return Array.from({ length: count }, () => '')
}

export default function App() {
  const [step, setStep] = useState<Step>('settings')
  const [playerCount, setPlayerCount] = useState<SupportedPlayerCount>(5)
  const [names, setNames] = useState<string[]>(() => emptyNames(5))
  const [roleReveal, setRoleReveal] = useState<RoleRevealPlayer[]>([])
  const [session, setSession] = useState<GameSession | null>(null)
  const [chancellorId, setChancellorId] = useState<string | null>(null)
  const [legislativeKey, setLegislativeKey] = useState(0)
  const [win, setWin] = useState<WinResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSessionChange = useCallback((next: GameSession) => {
    setSession(next)
  }, [])

  function handlePlayerCountChange(count: SupportedPlayerCount) {
    setPlayerCount(count)
    setNames((prev) => {
      if (count === prev.length) return prev
      if (count < prev.length) return prev.slice(0, count)
      return [...prev, ...emptyNames(count - prev.length)]
    })
  }

  function handleNameChange(index: number, value: string) {
    setNames((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  async function startRoleReveal(resolved: string[]) {
    setBusy(true)
    setError(null)
    try {
      const created = await createGame(playerCount, resolved)
      const rolesById = new Map(
        created.role_reveal.map((p) => [
          p.id,
          { role: p.role, team: p.team },
        ]),
      )
      setRoleReveal(created.role_reveal)
      setSession(sessionFromView(created.view, rolesById))
      setStep('roleReveal')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game')
    } finally {
      setBusy(false)
    }
  }

  function beginGame() {
    setChancellorId(null)
    setWin(null)
    setStep('nomination')
  }

  async function playAgain() {
    if (session?.gameId) {
      try {
        await deleteGame(session.gameId)
      } catch {
        /* session may already be gone */
      }
    }
    setStep('settings')
    setRoleReveal([])
    setSession(null)
    setChancellorId(null)
    setWin(null)
    setError(null)
  }

  if (step === 'win' && session && win) {
    return (
      <WinScreen session={session} win={win} onPlayAgain={playAgain} />
    )
  }

  if (step === 'legislative' && session && chancellorId) {
    return (
      <LegislativeScreen
        key={legislativeKey}
        session={session}
        chancellorId={chancellorId}
        onSessionChange={handleSessionChange}
        onRoundComplete={() => {
          setChancellorId(null)
          setStep('nomination')
        }}
        onWin={(result) => {
          setWin(result)
          setStep('win')
        }}
      />
    )
  }

  if (step === 'nomination' && session) {
    return (
      <NominationScreen
        key={`nom-${session.roundNumber}-${session.presidentIndex}`}
        session={session}
        onSessionChange={handleSessionChange}
        onGovernmentApproved={(id, nextView) => {
          setSession((prev) =>
            prev ? mergeView(prev, nextView) : sessionFromView(nextView),
          )
          setChancellorId(id)
          setLegislativeKey((k) => k + 1)
          setStep('legislative')
        }}
        onWin={(result) => {
          setWin(result)
          setStep('win')
        }}
      />
    )
  }

  if (step === 'roleReveal' && roleReveal.length > 0) {
    return (
      <RoleRevealScreen
        players={roleReveal}
        onBackToNames={() => {
          void (async () => {
            if (session?.gameId) {
              try {
                await deleteGame(session.gameId)
              } catch {
                /* ignore */
              }
            }
            setRoleReveal([])
            setSession(null)
            setStep('names')
          })()
        }}
        onComplete={beginGame}
      />
    )
  }

  if (step === 'names') {
    return (
      <NamesScreen
        playerCount={playerCount}
        names={names}
        onNameChange={handleNameChange}
        onBack={() => setStep('settings')}
        onContinue={startRoleReveal}
        busy={busy}
        error={error}
      />
    )
  }

  return (
    <SettingsScreen
      playerCount={playerCount}
      onPlayerCountChange={handlePlayerCountChange}
      onContinue={() => setStep('names')}
    />
  )
}
