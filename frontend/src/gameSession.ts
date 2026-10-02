import type { LawCardDto, PublicView } from './api/types'
import type { CardSkinId } from './cardAssets'
import type { Role, Team } from './roles'

/** Seconds each player gets to cast Ja/Nein during pass-and-play voting. */
export const SECONDS_PER_VOTER = 10
export const RED_WIN = 5
export const BLACK_WIN = 6
export const HITLER_ZONE_BLACKS = 3

export type TablePlayer = {
  id: string
  name: string
  role?: Role
  team?: Team
  /**
   * Optional seat role-card art pack. Frontend-only for now; when unset,
   * seats use the table skin. Future: profile / lobby picker or API field.
   */
  cardSkin?: CardSkinId
}

export type WinResult = {
  winner: Team
  reason: 'communist_laws' | 'fascist_laws' | 'hitler_elected'
  players: Array<{
    name: string
    role: Role
    team: Team
  }>
}

export type GameSession = {
  gameId: string
  players: TablePlayer[]
  presidentIndex: number
  roundNumber: number
  redsOnTable: number
  blacksOnTable: number
  /** Enacted LawCards in play order (for true ranks on the board). */
  lawsOnTable: LawCardDto[]
  rejectedIds: string[]
  previousChancellorId: string | null
  phase: string
  eligibleIds: string[]
  nominatedChancellorId: string | null
  chancellorId: string | null
}

export function sessionFromView(
  view: PublicView,
  rolesById?: Map<string, { role: Role; team: Team }>,
  skinsById?: Map<string, CardSkinId>,
): GameSession {
  return {
    gameId: view.game_id,
    players: view.players.map((p) => {
      const roleInfo = rolesById?.get(p.id)
      return {
        id: p.id,
        name: p.name,
        role: roleInfo?.role,
        team: roleInfo?.team,
        cardSkin: skinsById?.get(p.id),
      }
    }),
    presidentIndex: view.president_index,
    roundNumber: view.round_number,
    redsOnTable: view.reds_on_table,
    blacksOnTable: view.blacks_on_table,
    lawsOnTable: view.laws_on_table ?? [],
    rejectedIds: view.rejected_nominee_ids,
    previousChancellorId: view.previous_chancellor_id,
    phase: view.phase,
    eligibleIds: view.eligible_chancellor_ids,
    nominatedChancellorId: view.nominated_chancellor_id,
    chancellorId: view.chancellor_id,
  }
}

export function mergeView(
  session: GameSession,
  view: PublicView,
): GameSession {
  const rolesById = new Map(
    session.players
      .filter((p) => p.role && p.team)
      .map((p) => [p.id, { role: p.role!, team: p.team! }]),
  )
  const skinsById = new Map(
    session.players
      .filter((p) => p.cardSkin)
      .map((p) => [p.id, p.cardSkin!]),
  )
  return sessionFromView(view, rolesById, skinsById)
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

export function winFromView(view: PublicView): WinResult | null {
  if (view.phase !== 'game_over' || !view.winner || !view.win_reason) {
    return null
  }
  const reason = view.win_reason as WinResult['reason']
  return {
    winner: view.winner as Team,
    reason,
    players: view.result?.players ?? [],
  }
}

export type { Role, Team }
