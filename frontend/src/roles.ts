/** Role/team labels and constants. Assignment lives on the Python engine. */

export type Role = 'communist' | 'fascist' | 'hitler'
export type Team = 'communist' | 'fascist'

/** player_count -> [communist_count, fascist_count_including_hitler] */
export const ROLE_DISTRIBUTION: Record<number, readonly [number, number]> = {
  5: [3, 2],
  6: [4, 2],
  7: [4, 3],
  8: [5, 3],
  9: [5, 4],
  10: [6, 4],
}

export function teamForRole(role: Role): Team {
  return role === 'communist' ? 'communist' : 'fascist'
}

export function roleLabel(role: Role): string {
  if (role === 'hitler') return 'Hitler'
  if (role === 'fascist') return 'Fascist'
  return 'Communist'
}

export function teamLabel(team: Team): string {
  return team === 'communist' ? 'Communist' : 'Fascist'
}

/** Playing-card face used to reveal a role on the win table. */
export function roleToPlayingCard(
  role: Role,
  /** 0-based index among players with the same non-Hitler role. */
  sameRoleIndex: number,
): { color: 'red' | 'black'; number: number } {
  if (role === 'hitler') {
    return { color: 'black', number: 1 } // Ace of spades
  }
  if (role === 'fascist') {
    // Any black except Ace (reserved for Hitler): 2, 3, 4…
    return { color: 'black', number: 2 + sameRoleIndex }
  }
  // Any red
  return { color: 'red', number: 1 + sameRoleIndex }
}
