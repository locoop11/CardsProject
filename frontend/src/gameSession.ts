import type { RevealedPlayer, Role, Team } from './roles'

/** Seconds each player gets to cast Ja/Nein during pass-and-play voting. */
export const SECONDS_PER_VOTER = 10
export const RED_WIN = 5
export const BLACK_WIN = 6
export const HITLER_ZONE_BLACKS = 3

export type TablePlayer = RevealedPlayer & { id: string }

export type PublicBoard = {
  roundNumber: number
  redsOnTable: number
  blacksOnTable: number
  presidentName: string
  rejectedNames: string[]
}

export type WinResult = {
  winner: Team
  reason: 'communist_laws' | 'fascist_laws' | 'hitler_elected'
}

export type GameSession = {
  players: TablePlayer[]
  presidentIndex: number
  roundNumber: number
  redsOnTable: number
  blacksOnTable: number
  rejectedIds: string[]
  previousChancellorId: string | null
}

export function createSession(players: RevealedPlayer[]): GameSession {
  return {
    players: players.map((p, i) => ({ ...p, id: `p${i}` })),
    presidentIndex: 0,
    roundNumber: 1,
    redsOnTable: 0,
    blacksOnTable: 0,
    rejectedIds: [],
    previousChancellorId: null,
  }
}

export function president(session: GameSession): TablePlayer {
  return session.players[session.presidentIndex]!
}

export function playerById(
  session: GameSession,
  id: string,
): TablePlayer | undefined {
  return session.players.find((p) => p.id === id)
}

export function eligibleChancellorIds(session: GameSession): string[] {
  const barred = new Set<string>([
    president(session).id,
    ...session.rejectedIds,
  ])
  if (session.previousChancellorId) {
    barred.add(session.previousChancellorId)
  }
  return session.players.filter((p) => !barred.has(p.id)).map((p) => p.id)
}

export function toPublicBoard(session: GameSession): PublicBoard {
  const rejectedNames = session.rejectedIds.map(
    (id) => playerById(session, id)?.name ?? id,
  )
  return {
    roundNumber: session.roundNumber,
    redsOnTable: session.redsOnTable,
    blacksOnTable: session.blacksOnTable,
    presidentName: president(session).name,
    rejectedNames,
  }
}

export function checkEnactmentWin(
  reds: number,
  blacks: number,
): WinResult | null {
  if (reds >= RED_WIN) {
    return { winner: 'communist', reason: 'communist_laws' }
  }
  if (blacks >= BLACK_WIN) {
    return { winner: 'fascist', reason: 'fascist_laws' }
  }
  return null
}

export function checkHitlerElected(
  session: GameSession,
  chancellorId: string,
): WinResult | null {
  if (session.blacksOnTable < HITLER_ZONE_BLACKS) return null
  const ch = playerById(session, chancellorId)
  if (ch?.role === 'hitler') {
    return { winner: 'fascist', reason: 'hitler_elected' }
  }
  return null
}

/** Resolve votes: missing = Nein; approve only on strict Ja majority. */
export function resolveElection(
  playerIds: string[],
  votes: Record<string, boolean>,
): { approved: boolean; ja: number; nein: number; locked: Record<string, boolean> } {
  const locked: Record<string, boolean> = {}
  for (const id of playerIds) {
    locked[id] = votes[id] ?? false
  }
  const ja = Object.values(locked).filter(Boolean).length
  const nein = playerIds.length - ja
  return { approved: ja > nein, ja, nein, locked }
}

export function rejectNominee(
  session: GameSession,
  nomineeId: string,
): GameSession {
  const rejectedIds = session.rejectedIds.includes(nomineeId)
    ? session.rejectedIds
    : [...session.rejectedIds, nomineeId]
  return { ...session, rejectedIds }
}

/** Top-of-deck enact: for UI stub, flip a coin for color until Phase 4. */
export function enactTopLaw(session: GameSession): {
  session: GameSession
  color: 'red' | 'black'
  win: WinResult | null
} {
  const color: 'red' | 'black' = Math.random() < 0.5 ? 'red' : 'black'
  const reds = session.redsOnTable + (color === 'red' ? 1 : 0)
  const blacks = session.blacksOnTable + (color === 'black' ? 1 : 0)
  const win = checkEnactmentWin(reds, blacks)
  const next = advanceRound(
    {
      ...session,
      redsOnTable: reds,
      blacksOnTable: blacks,
    },
    { clearChancellorTermLimit: true },
  )
  return { session: next, color, win }
}

export function advanceRound(
  session: GameSession,
  opts: { clearChancellorTermLimit: boolean; newChancellorId?: string },
): GameSession {
  const n = session.players.length
  return {
    ...session,
    presidentIndex: (session.presidentIndex + 1) % n,
    roundNumber: session.roundNumber + 1,
    rejectedIds: [],
    previousChancellorId: opts.clearChancellorTermLimit
      ? null
      : (opts.newChancellorId ?? session.previousChancellorId),
  }
}

export function afterLegislativeEnact(
  session: GameSession,
  color: 'red' | 'black',
  chancellorId: string,
): { session: GameSession; win: WinResult | null } {
  const reds = session.redsOnTable + (color === 'red' ? 1 : 0)
  const blacks = session.blacksOnTable + (color === 'black' ? 1 : 0)
  const win = checkEnactmentWin(reds, blacks)
  if (win) {
    return {
      session: { ...session, redsOnTable: reds, blacksOnTable: blacks },
      win,
    }
  }
  return {
    session: advanceRound(
      { ...session, redsOnTable: reds, blacksOnTable: blacks },
      { clearChancellorTermLimit: false, newChancellorId: chancellorId },
    ),
    win: null,
  }
}

export type { Role, Team }
