/** Types matching docs/api.md (Phase 4.1). */

export type LawColor = 'red' | 'black'

export type LawCardDto = {
  id: number
  type: string
  number: number
  color: LawColor
}

export type PlayerPublic = {
  id: string
  name: string
}

export type RoleRevealPlayer = {
  id: string
  name: string
  role: 'communist' | 'fascist' | 'hitler'
  team: 'communist' | 'fascist'
}

export type PublicView = {
  game_id: string
  phase: string
  round_number: number
  president_id: string
  president_name: string
  president_index: number
  nominated_chancellor_id: string | null
  chancellor_id: string | null
  previous_chancellor_id: string | null
  rejected_nominee_ids: string[]
  rejected_names: string[]
  eligible_chancellor_ids: string[]
  players: PlayerPublic[]
  reds_on_table: number
  blacks_on_table: number
  /** Enacted LawCards in play order (public board). */
  laws_on_table: LawCardDto[]
  votes_cast: string[]
  winner: string | null
  win_reason: string | null
  result: {
    winner: string
    win_reason: string
    round_count: number
    players: Array<{
      name: string
      role: 'communist' | 'fascist' | 'hitler'
      team: 'communist' | 'fascist'
    }>
    reds_on_table: number
    blacks_on_table: number
  } | null
}

export type CreateGameResponse = {
  game_id: string
  view: PublicView
  role_reveal: RoleRevealPlayer[]
}

export type ActionResponse = {
  view: PublicView
  votes?: Record<string, boolean> | null
  enacted?: LawCardDto | null
  hand?: LawCardDto[] | null
}

export type HandResponse = {
  viewer_id: string
  cards: LawCardDto[]
}
