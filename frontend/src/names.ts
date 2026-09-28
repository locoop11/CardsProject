/** Empty / whitespace names become "Player N" (1-based), matching start_game. */
export function resolvePlayerNames(rawNames: string[]): string[] {
  return rawNames.map((name, i) => {
    const trimmed = name.trim()
    return trimmed ? trimmed : `Player ${i + 1}`
  })
}

/** True when two or more resolved names collide (case-sensitive, post-trim). */
export function hasDuplicateNames(resolvedNames: string[]): boolean {
  return new Set(resolvedNames).size !== resolvedNames.length
}
