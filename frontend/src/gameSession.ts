import type { LawCardDto, PublicView } from './api/types'
import { asCardSkinId, type CardSkinId } from './cardAssets'
import type { Role, Team } from './roles'

/** Seconds each player gets to cast Ja/Nein during pass-and-play voting. */
export const SECONDS_PER_VOTER = 10
export const RED_WIN = 5
export const BLACK_WIN = 6
export const HITLER_ZONE_BLACKS = 3

export type SeatArt = {
  /** Hitler face pack. Unset falls back to cardSkin, then the table preset. */
  hitlerSkin?: CardSkinId
  /** Communist/fascist face pack. Unset falls back to cardSkin, then the table preset. */
  roleSkin?: CardSkinId
  /** Optional single-pack override kept for older call sites. */
  cardSkin?: CardSkinId
}

export type TablePlayer = {
  id: string
  name: string
  role?: Role
  team?: Team
  /**
   * Optional single-pack seat override. Hitler/role equip uses the fields
   * below; when those are unset, seats use this override or the table skin.
   */
  cardSkin?: CardSkinId
  hitlerSkin?: CardSkinId
  roleSkin?: CardSkinId
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
  artById?: Map<string, SeatArt>,
): GameSession {
  return {
    gameId: view.game_id,
    players: view.players.map((p) => {
      const roleInfo = rolesById?.get(p.id)
      const art = artById?.get(p.id)
      return {
        id: p.id,
        name: p.name,
        role: roleInfo?.role,
        team: roleInfo?.team,
        cardSkin: art?.cardSkin,
        hitlerSkin: art?.hitlerSkin,
        roleSkin: art?.roleSkin,
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
  const artById = new Map<string, SeatArt>()
  for (const player of session.players) {
    if (!player.hitlerSkin && !player.roleSkin && !player.cardSkin) continue
    artById.set(player.id, {
      hitlerSkin: player.hitlerSkin,
      roleSkin: player.roleSkin,
      cardSkin: player.cardSkin,
    })
  }
  return sessionFromView(view, rolesById, artById)
}

/**
 * Shared-device seats whose typed name matches the account display name
 * use that account's Hitler/role packs. Every other seat stays unset so
 * the table preset applies.
 */
export function seatArtForNamedAccount(
  players: Array<{ id: string; name: string }>,
  displayName: string,
  hitlerSkin: CardSkinId | null,
  roleSkin: CardSkinId | null,
): Map<string, SeatArt> {
  const artById = new Map<string, SeatArt>()
  const target = displayName.trim()
  if (!target || (!hitlerSkin && !roleSkin)) return artById
  for (const player of players) {
    if (player.name !== target) continue
    const art: SeatArt = {}
    if (hitlerSkin) art.hitlerSkin = hitlerSkin
    if (roleSkin) art.roleSkin = roleSkin
    artById.set(player.id, art)
  }
  return artById
}

/** Online seat payload → art map. Unknown pack codes are ignored (table fallback). */
export function seatArtFromSeatEquips(
  seats: Array<{
    player_id: string
    hitler_pack_code: string | null
    role_pack_code: string | null
  }>,
): Map<string, SeatArt> {
  const artById = new Map<string, SeatArt>()
  for (const seat of seats) {
    const hitlerSkin = asCardSkinId(seat.hitler_pack_code)
    const roleSkin = asCardSkinId(seat.role_pack_code)
    if (!hitlerSkin && !roleSkin) continue
    const art: SeatArt = {}
    if (hitlerSkin) art.hitlerSkin = hitlerSkin
    if (roleSkin) art.roleSkin = roleSkin
    artById.set(seat.player_id, art)
  }
  return artById
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
