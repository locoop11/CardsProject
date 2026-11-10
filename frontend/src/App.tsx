import { useCallback, useEffect, useState } from 'react'
import { ApiError, createGame, deleteGame, getSeatEquips, getSkinMe, updateMe } from './api/client'
import type { PublicView, RoleRevealPlayer, SkinEquip, User } from './api/types'
import { loadMe } from './auth'
import {
  asCardSkinId,
  DEFAULT_CARD_SKIN,
  type CardSkinId,
} from './cardAssets'
import type { SupportedPlayerCount } from './constants'
import {
  mergeView,
  seatArtForNamedAccount,
  seatArtFromSeatEquips,
  sessionFromView,
  type GameSession,
  type SeatArt,
  type WinResult,
} from './gameSession'
import { resolvePlayerNames } from './names'
import {
  fetchOwnRole,
  playerIdsFromView,
  resolveSelfPlayerId,
  type OnlinePlay,
} from './onlineSession'
import { AccountScreen } from './screens/AccountScreen'
import { GamesHubScreen } from './screens/GamesHubScreen'
import { LegislativeScreen } from './screens/LegislativeScreen'
import { LoginScreen } from './screens/LoginScreen'
import { NamesScreen } from './screens/NamesScreen'
import { NominationScreen } from './screens/NominationScreen'
import {
  OnlineLobbyScreen,
  type LobbyDeviceRole,
} from './screens/OnlineLobbyScreen'
import { RoleRevealScreen } from './screens/RoleRevealScreen'
import { SettingsHubScreen } from './screens/SettingsScreen'
import { SkinScreen } from './screens/SkinScreen'
import { TableDisplayScreen } from './screens/TableDisplayScreen'
import { WinScreen } from './screens/WinScreen'
import './App.css'

type Step =
  | 'login'
  | 'gamesHub'
  | 'account'
  | 'onlineLobby'
  | 'tableDisplay'
  | 'settings'
  | 'roleReveal'
  | 'nomination'
  | 'legislative'
  | 'win'

type OnlineLobbyKind = 'v2' | 'v3'

type SettingsPanel = 'hub' | 'names' | 'skin'

/** Frontend-only guest vs account; no guest API user. */
type PlayMode = 'guest' | 'account'

function emptyNames(count: number): string[] {
  return Array.from({ length: count }, () => '')
}

export default function App() {
  const [step, setStep] = useState<Step>('login')
  const [playMode, setPlayMode] = useState<PlayMode | null>(null)
  const [settingsPanel, setSettingsPanel] = useState<SettingsPanel>('hub')
  const [playerCount, setPlayerCount] = useState<SupportedPlayerCount>(5)
  const [names, setNames] = useState<string[]>(() => emptyNames(5))
  const [cardSkin, setCardSkin] = useState<CardSkinId>(DEFAULT_CARD_SKIN)
  const [hitlerSkin, setHitlerSkin] = useState<CardSkinId | null>(null)
  const [roleSkin, setRoleSkin] = useState<CardSkinId | null>(null)
  const [seatArt, setSeatArt] = useState<Map<string, SeatArt>>(() => new Map())
  const [user, setUser] = useState<User | null>(null)
  const [roleReveal, setRoleReveal] = useState<RoleRevealPlayer[]>([])
  const [session, setSession] = useState<GameSession | null>(null)
  const [chancellorId, setChancellorId] = useState<string | null>(null)
  const [legislativeKey, setLegislativeKey] = useState(0)
  const [win, setWin] = useState<WinResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [skinError, setSkinError] = useState<string | null>(null)
  const [authStatus, setAuthStatus] = useState<'loading' | 'ready'>('loading')
  const [authWarning, setAuthWarning] = useState<string | null>(null)
  /** Set for multi-device v2/v3 player path; null for local pass-and-play. */
  const [onlinePlay, setOnlinePlay] = useState<OnlinePlay | null>(null)
  const [onlineLobbyKind, setOnlineLobbyKind] = useState<OnlineLobbyKind>('v2')
  const [tableDisplay, setTableDisplay] = useState<{
    roomId: string
    gameId: string
    view: PublicView
  } | null>(null)

  const applyUser = useCallback((next: User | null) => {
    setUser(next)
    if (!next) return
    const skin = asCardSkinId(next.card_skin)
    if (skin) setCardSkin(skin)
  }, [])

  const applyEquip = useCallback((equip: SkinEquip) => {
    setHitlerSkin(asCardSkinId(equip.hitler_pack_code))
    setRoleSkin(asCardSkinId(equip.role_pack_code))
  }, [])

  useEffect(() => {
    let cancelled = false
    void loadMe()
      .then(async (me) => {
        if (cancelled) return
        applyUser(me)
        setAuthWarning(null)
        setAuthStatus('ready')
        if (me) {
          setPlayMode('account')
          setStep('gamesHub')
          try {
            const skins = await getSkinMe()
            if (!cancelled) applyEquip(skins.equip)
          } catch {
            // Missing equip falls back to the table preset.
          }
        } else {
          setPlayMode(null)
          setStep('login')
        }
      })
      .catch(() => {
        if (cancelled) return
        setAuthWarning(
          'Could not reach the account service. You can still play as guest.',
        )
        setAuthStatus('ready')
        setPlayMode(null)
        setStep('login')
      })
    return () => {
      cancelled = true
    }
  }, [applyUser, applyEquip])

  const handleSessionChange = useCallback((next: GameSession) => {
    setSession(next)
  }, [])

  function goToLogin() {
    setUser(null)
    setPlayMode(null)
    setSettingsPanel('hub')
    setError(null)
    setSkinError(null)
    setAuthWarning(null)
    setCardSkin(DEFAULT_CARD_SKIN)
    setHitlerSkin(null)
    setRoleSkin(null)
    setSeatArt(new Map())
    setStep('login')
  }

  function enterGuestV1() {
    setPlayMode('guest')
    setUser(null)
    setSettingsPanel('hub')
    setError(null)
    setSkinError(null)
    setCardSkin(DEFAULT_CARD_SKIN)
    setHitlerSkin(null)
    setRoleSkin(null)
    setSeatArt(new Map())
    setStep('settings')
  }

  function enterAccountV1() {
    setPlayMode('account')
    setSettingsPanel('hub')
    setError(null)
    setSkinError(null)
    setStep('settings')
  }

  function leaveV1Settings() {
    setSettingsPanel('hub')
    setError(null)
    setSkinError(null)
    if (playMode === 'account' && user) {
      setStep('gamesHub')
      return
    }
    goToLogin()
  }

  async function handleCardSkinChange(skin: CardSkinId) {
    setCardSkin(skin)
    setSkinError(null)
    if (playMode !== 'account' || !user) return
    try {
      const next = await updateMe({ card_skin: skin })
      setUser(next)
    } catch (err) {
      const detail =
        err instanceof ApiError
          ? err.message
          : 'Could not save account card skin'
      setSkinError(
        `Table skin updated for this session, but account skin was not saved. ${detail}`,
      )
    }
  }

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

  async function startRoleReveal() {
    const resolved = resolvePlayerNames(names.slice(0, playerCount))
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
      const art =
        playMode === 'account' && user
          ? seatArtForNamedAccount(
              created.role_reveal,
              user.display_name,
              hitlerSkin,
              roleSkin,
            )
          : new Map<string, SeatArt>()
      setSeatArt(art)
      setRoleReveal(created.role_reveal)
      setSession(sessionFromView(created.view, rolesById, art))
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

  async function returnToV1Settings() {
    if (session?.gameId) {
      try {
        await deleteGame(session.gameId)
      } catch {
        /* session may already be gone */
      }
    }
    setRoleReveal([])
    setSession(null)
    setChancellorId(null)
    setWin(null)
    setError(null)
    setSettingsPanel('hub')
    setStep('settings')
  }

  async function playAgain() {
    await returnToV1Settings()
  }

  function handleSelectGame(gameId: string) {
    if (gameId === 'secret-cards-v1') {
      enterAccountV1()
      return
    }
    if (gameId === 'secret-cards-v2' || gameId === 'secret-cards-v3') {
      if (!user || playMode !== 'account') return
      setError(null)
      setOnlinePlay(null)
      setTableDisplay(null)
      setOnlineLobbyKind(gameId === 'secret-cards-v3' ? 'v3' : 'v2')
      setStep('onlineLobby')
    }
  }

  function enterTableDisplay(payload: {
    roomId: string
    gameId: string
    view: PublicView
  }) {
    setOnlinePlay(null)
    setRoleReveal([])
    setTableDisplay(payload)
    setSession(sessionFromView(payload.view))
    setStep('tableDisplay')
  }

  async function enterOnlineGame(payload: {
    roomId: string
    gameId: string
    view: PublicView
    deviceRole: LobbyDeviceRole
  }) {
    if (payload.deviceRole === 'table') {
      enterTableDisplay(payload)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const selfPlayerId = await resolveSelfPlayerId(
        payload.gameId,
        playerIdsFromView(payload.view),
      )
      const own = await fetchOwnRole(payload.gameId, selfPlayerId)
      const rolesById = new Map([
        [own.id, { role: own.role, team: own.team }],
      ])
      let art = new Map<string, SeatArt>()
      try {
        const seats = await getSeatEquips(payload.gameId)
        art = seatArtFromSeatEquips(seats.seats)
      } catch {
        // Table preset covers seats when equip cannot be loaded.
      }
      setTableDisplay(null)
      setOnlinePlay({
        gameId: payload.gameId,
        selfPlayerId,
        roomId: payload.roomId,
      })
      setSeatArt(art)
      setRoleReveal([own])
      setSession(sessionFromView(payload.view, rolesById, art))
      setStep('roleReveal')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enter online game')
      setStep('onlineLobby')
    } finally {
      setBusy(false)
    }
  }

  async function leaveOnlineToHub() {
    if (session?.gameId && !tableDisplay) {
      try {
        await deleteGame(session.gameId)
      } catch {
        /* may already be gone */
      }
    }
    setOnlinePlay(null)
    setTableDisplay(null)
    setRoleReveal([])
    setSession(null)
    setChancellorId(null)
    setWin(null)
    setError(null)
    setStep('gamesHub')
  }

  function leaveTableToHub() {
    setTableDisplay(null)
    setSession(null)
    setError(null)
    setStep('gamesHub')
  }

  if (step === 'tableDisplay' && tableDisplay) {
    return (
      <TableDisplayScreen
        gameId={tableDisplay.gameId}
        initialView={tableDisplay.view}
        cardSkin={cardSkin}
        onLeave={leaveTableToHub}
      />
    )
  }

  if (step === 'win' && session && win) {
    return (
      <WinScreen
        session={session}
        win={win}
        cardSkin={cardSkin}
        viewerPlayerId={onlinePlay?.selfPlayerId}
        onPlayAgain={() =>
          void (onlinePlay ? leaveOnlineToHub() : playAgain())
        }
      />
    )
  }

  if (step === 'legislative' && session && chancellorId) {
    return (
      <LegislativeScreen
        key={legislativeKey}
        session={session}
        chancellorId={chancellorId}
        cardSkin={cardSkin}
        selfPlayerId={onlinePlay?.selfPlayerId}
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
        cardSkin={cardSkin}
        selfPlayerId={onlinePlay?.selfPlayerId}
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
        cardSkin={cardSkin}
        seatArt={seatArt}
        onBackToHub={() =>
          void (onlinePlay ? leaveOnlineToHub() : returnToV1Settings())
        }
        onComplete={beginGame}
      />
    )
  }

  if (step === 'onlineLobby' && user && playMode === 'account') {
    return (
      <OnlineLobbyScreen
        user={user}
        allowTableDisplay={onlineLobbyKind === 'v3'}
        onBack={() => {
          setError(null)
          setOnlinePlay(null)
          setTableDisplay(null)
          setStep('gamesHub')
        }}
        onGameStarted={(payload) => void enterOnlineGame(payload)}
      />
    )
  }

  if (step === 'settings' && settingsPanel === 'names') {
    return (
      <NamesScreen
        playerCount={playerCount}
        names={names}
        onNameChange={handleNameChange}
        onBack={() => setSettingsPanel('hub')}
        busy={busy}
      />
    )
  }

  if (step === 'settings' && settingsPanel === 'skin') {
    return (
      <SkinScreen
        cardSkin={cardSkin}
        onCardSkinChange={(skin) => void handleCardSkinChange(skin)}
        onBack={() => {
          setSkinError(null)
          setSettingsPanel('hub')
        }}
        error={skinError}
        signedIn={playMode === 'account'}
      />
    )
  }

  if (step === 'settings') {
    return (
      <SettingsHubScreen
        playerCount={playerCount}
        cardSkin={cardSkin}
        onPlayerCountChange={handlePlayerCountChange}
        onOpenNames={() => setSettingsPanel('names')}
        onOpenSkin={() => {
          setSkinError(null)
          setSettingsPanel('skin')
        }}
        onLeaveV1={leaveV1Settings}
        leaveLabel={
          playMode === 'account' ? 'Back to games' : 'Back to sign in'
        }
        onStartGame={startRoleReveal}
        busy={busy}
        error={error}
      />
    )
  }

  if (step === 'account' && user) {
    return (
      <AccountScreen
        user={user}
        onUserChange={(next) => applyUser(next)}
        onEquipChange={applyEquip}
        onLoggedOut={goToLogin}
        onBack={() => setStep('gamesHub')}
      />
    )
  }

  if (step === 'gamesHub' && user && playMode === 'account') {
    return (
      <GamesHubScreen
        displayName={user.display_name}
        onSelectGame={handleSelectGame}
        onOpenAccount={() => setStep('account')}
      />
    )
  }

  return (
    <LoginScreen
      onAuthenticated={(next) => {
        applyUser(next)
        setPlayMode('account')
        setAuthWarning(null)
        setStep('gamesHub')
      }}
      onPlayAsGuest={enterGuestV1}
      busyBoot={authStatus === 'loading'}
      bootWarning={authWarning}
    />
  )
}
