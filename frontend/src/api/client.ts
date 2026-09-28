/** Fetch helpers for the local Secret Cards API (Vite proxies /api). */

import type {
  ActionResponse,
  CreateGameResponse,
  HandResponse,
  PublicView,
  RoleRevealPlayer,
} from './types'

export class ApiError extends Error {
  status: number

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = (await res.json()) as { detail?: string }
      if (body.detail) detail = body.detail
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail)
  }
  if (res.status === 204) {
    return undefined as T
  }
  return (await res.json()) as T
}

export function createGame(
  playerCount: number,
  playerNames: string[],
): Promise<CreateGameResponse> {
  return request<CreateGameResponse>('/api/games', {
    method: 'POST',
    body: JSON.stringify({
      player_count: playerCount,
      player_names: playerNames,
    }),
  })
}

export function getGame(gameId: string): Promise<PublicView> {
  return request<PublicView>(`/api/games/${gameId}`)
}

export function getPlayerRole(
  gameId: string,
  playerId: string,
): Promise<RoleRevealPlayer> {
  return request<RoleRevealPlayer>(`/api/games/${gameId}/role/${playerId}`)
}

export function getHand(
  gameId: string,
  viewerId: string,
): Promise<HandResponse> {
  return request<HandResponse>(
    `/api/games/${gameId}/hand?viewer_id=${encodeURIComponent(viewerId)}`,
  )
}

export function nominate(
  gameId: string,
  nomineeId: string,
): Promise<ActionResponse> {
  return request<ActionResponse>(`/api/games/${gameId}/nominate`, {
    method: 'POST',
    body: JSON.stringify({ nominee_id: nomineeId }),
  })
}

export function castVote(
  gameId: string,
  playerId: string,
  vote: boolean,
): Promise<ActionResponse> {
  return request<ActionResponse>(`/api/games/${gameId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, vote }),
  })
}

export function resolveVotes(gameId: string): Promise<ActionResponse> {
  return request<ActionResponse>(`/api/games/${gameId}/resolve-votes`, {
    method: 'POST',
  })
}

export function presidentDiscard(
  gameId: string,
  cardId: number,
): Promise<ActionResponse> {
  return request<ActionResponse>(`/api/games/${gameId}/president-discard`, {
    method: 'POST',
    body: JSON.stringify({ card_id: cardId }),
  })
}

export function chancellorEnact(
  gameId: string,
  cardId: number,
): Promise<ActionResponse> {
  return request<ActionResponse>(`/api/games/${gameId}/chancellor-enact`, {
    method: 'POST',
    body: JSON.stringify({ card_id: cardId }),
  })
}

export function deleteGame(gameId: string): Promise<void> {
  return request<void>(`/api/games/${gameId}`, { method: 'DELETE' })
}
