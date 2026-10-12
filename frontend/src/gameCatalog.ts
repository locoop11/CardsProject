/** Data-driven games hub catalog — add v3 / other games without rewriting the shell. */

export type GameCatalogEntry = {
  id: string
  title: string
  description: string
  available: boolean
}

export const GAME_CATALOG: readonly GameCatalogEntry[] = [
  {
    id: 'secret-cards-v1',
    title: 'Secret Cards v1',
    description: 'Pass and play — local shared device.',
    available: true,
  },
  {
    id: 'secret-cards-v2',
    title: 'Secret Cards v2',
    description: 'Multi-device rooms — host or join with a code.',
    available: true,
  },
]
