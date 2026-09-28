import { useState } from 'react'
import type { SupportedPlayerCount } from './constants'
import { NamesScreen } from './screens/NamesScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import './App.css'

type Step = 'settings' | 'names'

export default function App() {
  const [step, setStep] = useState<Step>('settings')
  const [playerCount, setPlayerCount] = useState<SupportedPlayerCount>(5)

  if (step === 'names') {
    return (
      <NamesScreen
        playerCount={playerCount}
        onBack={() => setStep('settings')}
      />
    )
  }

  return (
    <SettingsScreen
      playerCount={playerCount}
      onPlayerCountChange={setPlayerCount}
      onContinue={() => setStep('names')}
    />
  )
}
