import { useState } from 'react'
import type { SupportedPlayerCount } from './constants'
import { assignRoles, type RevealedPlayer } from './roles'
import { NamesScreen } from './screens/NamesScreen'
import { NominationStubScreen } from './screens/NominationStubScreen'
import { RoleRevealScreen } from './screens/RoleRevealScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import './App.css'

type Step = 'settings' | 'names' | 'roleReveal' | 'nomination'

function emptyNames(count: number): string[] {
  return Array.from({ length: count }, () => '')
}

export default function App() {
  const [step, setStep] = useState<Step>('settings')
  const [playerCount, setPlayerCount] = useState<SupportedPlayerCount>(5)
  const [names, setNames] = useState<string[]>(() => emptyNames(5))
  const [resolvedNames, setResolvedNames] = useState<string[]>([])
  const [players, setPlayers] = useState<RevealedPlayer[]>([])

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
    setResolvedNames(resolved)
    setPlayers(assignRoles(resolved))
    setStep('roleReveal')
  }

  if (step === 'nomination') {
    return (
      <NominationStubScreen
        playerNames={resolvedNames}
        onBack={() => setStep('roleReveal')}
      />
    )
  }

  if (step === 'roleReveal') {
    return (
      <RoleRevealScreen
        players={players}
        onBackToNames={() => setStep('names')}
        onComplete={() => setStep('nomination')}
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
