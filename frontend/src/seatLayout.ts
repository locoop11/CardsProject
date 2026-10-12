/**
 * Rotate seat display order so `viewerPlayerId` is at index 0 (bottom-center
 * after TableBoard's mid-bottom seatPosition anchor). Relative clockwise
 * order is preserved. Display-only — never send this order to the API.
 */
export function rotatePlayersForViewer<T extends { id: string }>(
  players: readonly T[],
  viewerPlayerId: string,
): T[] {
  const i = players.findIndex((p) => p.id === viewerPlayerId)
  if (i < 0) {
    return [...players]
  }
  return players.slice(i).concat(players.slice(0, i))
}
