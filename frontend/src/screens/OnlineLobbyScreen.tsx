import { useEffect, useRef, useState } from 'react'
import {
  ApiError,
  attachTableDisplay,
  claimSeat,
  createRoom,
  getGame,
  getRoom,
  joinRoom,
  joinRoomAsTable,
  startRoom,
} from '../api/client'
import type { PublicView, Room, User } from '../api/types'
import {
  SUPPORTED_PLAYER_COUNTS,
  type SupportedPlayerCount,
} from '../constants'

export type LobbyDeviceRole = 'player' | 'table'

type Props = {
  user: User
  /** v3 hybrid lobby shows table-display entry; v2 is player-only. */
  allowTableDisplay?: boolean
  onBack: () => void
  onGameStarted: (payload: {
    roomId: string
    gameId: string
    view: PublicView
    deviceRole: LobbyDeviceRole
  }) => void
}

type Mode = 'choose' | 'lobby'

const POLL_MS = 2000

export function OnlineLobbyScreen({
  user,
  allowTableDisplay = false,
  onBack,
  onGameStarted,
}: Props) {
  const [mode, setMode] = useState<Mode>('choose')
  const [playerCount, setPlayerCount] = useState<SupportedPlayerCount>(5)
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [room, setRoom] = useState<Room | null>(null)
  const [deviceRole, setDeviceRole] = useState<LobbyDeviceRole>('player')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startedRef = useRef(false)
  const onGameStartedRef = useRef(onGameStarted)
  const deviceRoleRef = useRef(deviceRole)

  useEffect(() => {
    onGameStartedRef.current = onGameStarted
  }, [onGameStarted])

  useEffect(() => {
    deviceRoleRef.current = deviceRole
  }, [deviceRole])

  const isHost = room?.host_user_id === user.id
  const mySeat = room?.seats.find((s) => s.user_id === user.id)
  const allClaimed =
    room != null && room.seats.every((s) => s.user_id != null)
  const isTableDevice = deviceRole === 'table'

  const roomId = room?.room_id
  useEffect(() => {
    if (!roomId || startedRef.current) return
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const next = await getRoom(roomId)
          setRoom(next)
          if (next.game_id && !startedRef.current) {
            startedRef.current = true
            const view = await getGame(next.game_id)
            onGameStartedRef.current({
              roomId: next.room_id,
              gameId: next.game_id,
              view,
              deviceRole: deviceRoleRef.current,
            })
          }
        } catch {
          /* keep last snapshot */
        }
      })()
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [roomId])

  async function handleCreate() {
    setBusy(true)
    setError(null)
    try {
      const next = await createRoom(playerCount)
      startedRef.current = false
      setDeviceRole('player')
      setRoom(next)
      setMode('lobby')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create room')
    } finally {
      setBusy(false)
    }
  }

  async function handleJoinAsPlayer() {
    setBusy(true)
    setError(null)
    try {
      const next = await joinRoom(joinCodeInput.trim())
      startedRef.current = false
      setDeviceRole('player')
      setRoom(next)
      setMode('lobby')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not join room')
    } finally {
      setBusy(false)
    }
  }

  async function handleJoinAsTable() {
    setBusy(true)
    setError(null)
    try {
      const next = await joinRoomAsTable(joinCodeInput.trim())
      startedRef.current = false
      setDeviceRole('table')
      setRoom(next)
      setMode('lobby')
      if (next.game_id) {
        startedRef.current = true
        const view = await getGame(next.game_id)
        onGameStarted({
          roomId: next.room_id,
          gameId: next.game_id,
          view,
          deviceRole: 'table',
        })
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not join as table',
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleBecomeTable() {
    if (!room || busy) return
    setBusy(true)
    setError(null)
    try {
      const next = await attachTableDisplay(room.room_id)
      setRoom(next)
      setDeviceRole('table')
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not attach as table',
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleClaim(seatIndex: number) {
    if (!room || busy || isTableDevice) return
    setBusy(true)
    setError(null)
    try {
      const next = await claimSeat(room.room_id, seatIndex)
      setRoom(next)
      setDeviceRole('player')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not claim seat')
    } finally {
      setBusy(false)
    }
  }

  async function handleStart() {
    if (!room || busy) return
    setBusy(true)
    setError(null)
    try {
      const started = await startRoom(room.room_id)
      startedRef.current = true
      onGameStarted({
        roomId: room.room_id,
        gameId: started.game_id,
        view: started.view,
        deviceRole,
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start game')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="screen settings-screen settings-hub">
      <div className="settings-hub-backdrop" aria-hidden="true">
        <div className="table-felt settings-hub-felt">
          <div className="table-oval settings-hub-oval" />
        </div>
      </div>

      <header className="settings-hub-header">
        <p className="brand">Secret Cards</p>
        <h1>{allowTableDisplay ? 'Hybrid lobby' : 'Online lobby'}</h1>
      </header>

      <div className="settings-hub-options">
        <div className="settings-hub-options-inner">
          {mode === 'choose' && (
            <>
              <p className="lede">
                {allowTableDisplay
                  ? 'Host or join as a player on your phone, or attach this device as the shared table screen.'
                  : 'Host a room or join with a code. Guests cannot use this mode.'}
              </p>

              <ul className="name-list">
                <li className="name-row">
                  <label htmlFor="online-player-count">Players</label>
                  <select
                    id="online-player-count"
                    value={playerCount}
                    disabled={busy}
                    onChange={(e) =>
                      setPlayerCount(
                        Number(e.target.value) as SupportedPlayerCount,
                      )
                    }
                  >
                    {SUPPORTED_PLAYER_COUNTS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </li>
              </ul>

              <button
                type="button"
                className="btn primary"
                disabled={busy}
                onClick={() => void handleCreate()}
              >
                Host room
              </button>

              <ul className="name-list">
                <li className="name-row">
                  <label htmlFor="online-join-code">Join code</label>
                  <input
                    id="online-join-code"
                    value={joinCodeInput}
                    disabled={busy}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    onChange={(e) =>
                      setJoinCodeInput(e.target.value.toUpperCase())
                    }
                    placeholder="ABC123"
                  />
                </li>
              </ul>

              <button
                type="button"
                className="btn"
                disabled={busy || !joinCodeInput.trim()}
                onClick={() => void handleJoinAsPlayer()}
              >
                Join as player
              </button>

              {allowTableDisplay && (
                <button
                  type="button"
                  className="btn"
                  disabled={busy || !joinCodeInput.trim()}
                  onClick={() => void handleJoinAsTable()}
                >
                  This device is the table
                </button>
              )}
            </>
          )}

          {mode === 'lobby' && room && (
            <>
              <p className="lede">
                Code <strong>{room.join_code}</strong>
                {isHost ? ' (you are host)' : ''}
              </p>
              {isTableDevice ? (
                <p className="lede tight">
                  This device is the table display. It will show the public board
                  when the host starts. Table attach does not take a seat.
                  {room.table_display_count > 0
                    ? ` Table clients: ${room.table_display_count}.`
                    : ''}
                </p>
              ) : (
                <p className="lede tight">
                  Claim one seat. Host starts when all seats are filled.
                </p>
              )}

              {!isTableDevice && (
                <ul className="online-seat-list" aria-label="Seats">
                  {room.seats.map((seat) => {
                    const taken = seat.user_id != null
                    const mine = seat.user_id === user.id
                    return (
                      <li key={seat.seat_index}>
                        <button
                          type="button"
                          className={
                            mine
                              ? 'hub-row is-selected'
                              : taken
                                ? 'hub-row is-disabled'
                                : 'hub-row'
                          }
                          disabled={busy || (taken && !mine) || mySeat != null}
                          onClick={() => void handleClaim(seat.seat_index)}
                        >
                          <span className="hub-row-label">
                            Seat {seat.seat_index + 1}
                          </span>
                          <span className="hub-row-summary">
                            {taken
                              ? seat.display_name ?? 'Taken'
                              : 'Tap to claim'}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              {allowTableDisplay && !isTableDevice && (
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => void handleBecomeTable()}
                >
                  Switch this device to table display
                </button>
              )}

              {isHost && !isTableDevice && (
                <button
                  type="button"
                  className="btn primary"
                  disabled={busy || !allClaimed}
                  onClick={() => void handleStart()}
                >
                  Start game
                </button>
              )}

              {isHost && isTableDevice && (
                <p className="hint">
                  Start the game from a player phone (host seat). This table
                  screen waits for the board.
                </p>
              )}

              {!isHost && (
                <p className="lede tight">
                  {isTableDevice
                    ? 'Waiting for host to start…'
                    : 'Waiting for host to start…'}
                </p>
              )}
            </>
          )}

          {error && (
            <p className="warning" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            className="btn ghost"
            disabled={busy}
            onClick={onBack}
          >
            Back to games
          </button>
        </div>
      </div>
    </main>
  )
}
