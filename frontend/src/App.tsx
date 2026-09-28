import { useCallback, useState } from 'react'
import type { SupportedPlayerCount } from './constants'
import { createSession, type GameSession, type WinResult } from './gameSession'
import { assignRoles, type RevealedPlayer } from './roles'
import { LegislativeStubScreen } from './screens/LegislativeStubScreen'
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
  const [players, setPlayers] = useState<RevealedPlayer[]>([])
  const [session, setSession] = useState<GameSession | null>(null)
  const [chancellorId, setChancellorId] = useState<string | null>(null)
  const [win, setWin] = useState<WinResult | null>(null)

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

  function startRoleReveal(resolved: string[]) {
    setPlayers(assignRoles(resolved))
    setStep('roleReveal')
  }

  function beginGame() {
    setSession(createSession(players))
    setChancellorId(null)
    setWin(null)
    setStep('nomination')
  }

  function playAgain() {
    setStep('settings')
    setPlayers([])
    setSession(null)
    setChancellorId(null)
    setWin(null)
  }

  if (step === 'win' && session && win) {
    return (
      <WinScreen session={session} win={win} onPlayAgain={playAgain} />
    )
  }

  if (step === 'legislative' && session && chancellorId) {
    return (
      <LegislativeStubScreen
        session={session}
        chancellorId={chancellorId}
        onBackToNomination={() => setStep('nomination')}
      />
    )
  }

  if (step === 'nomination' && session) {
    return (
      <NominationScreen
        session={session}
        onSessionChange={handleSessionChange}
        onGovernmentApproved={(id) => {
          setChancellorId(id)
          setStep('legislative')
        }}
        onWin={(result) => {
          setWin(result)
          setStep('win')
        }}
      />
    )
  }

  if (step === 'roleReveal') {
    return (
      <RoleRevealScreen
        players={players}
        onBackToNames={() => setStep('names')}
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
