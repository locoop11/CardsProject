/** Mirrors secret_cards.roles.SUPPORTED_PLAYER_COUNTS */
export const SUPPORTED_PLAYER_COUNTS = [5, 6, 7, 8, 9, 10] as const

export type SupportedPlayerCount = (typeof SUPPORTED_PLAYER_COUNTS)[number]
