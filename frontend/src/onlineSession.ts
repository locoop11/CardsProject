/** Helpers for multi-device online play (plan 03). */

import { ApiError, getPlayerRole } from './api/client'
import type { PublicView, RoleRevealPlayer } from './api/types'

export type OnlinePlay = {
  gameId: string
  selfPlayerId: string
  roomId: string
}

/**
 * Discover this device's bound seat by probing role GET until one succeeds.
 * Bound games return 403 for other seats (Option A).
 */
export async function resolveSelfPlayerId(
  gameId: string,
  playerIds: string[],
): Promise<string> {
  let lastError: unknown
  for (const playerId of playerIds) {
    try {
      await getPlayerRole(gameId, playerId)
      return playerId
    } catch (err) {
      lastError = err
      if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
        continue
      }
      throw err
    }
  }
  if (lastError instanceof Error) throw lastError
  throw new Error('Could not resolve your seat in this game')
}

export async function fetchOwnRole(
  gameId: string,
  selfPlayerId: string,
): Promise<RoleRevealPlayer> {
  return getPlayerRole(gameId, selfPlayerId)
}

export function playerIdsFromView(view: PublicView): string[] {
  return view.players.map((p) => p.id)
}
