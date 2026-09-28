/** Mirrors secret_cards.roles / model Team & Role (client stub until Phase 4). */

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

export type RevealedPlayer = {
  name: string
  role: Role
  team: Team
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

function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Assign shuffled roles matching the Python engine distribution. */
export function assignRoles(playerNames: string[]): RevealedPlayer[] {
  const dist = ROLE_DISTRIBUTION[playerNames.length]
  if (!dist) {
    throw new Error(`Unsupported player count: ${playerNames.length}`)
  }
  const [communistCount, fascistIncludingHitler] = dist
  const fascistMembers = fascistIncludingHitler - 1
  const roles: Role[] = [
    ...Array.from({ length: communistCount }, () => 'communist' as const),
    ...Array.from({ length: fascistMembers }, () => 'fascist' as const),
    'hitler',
  ]
  const shuffled = shuffle(roles)
  return playerNames.map((name, i) => {
    const role = shuffled[i]!
    return { name, role, team: teamForRole(role) }
  })
}
