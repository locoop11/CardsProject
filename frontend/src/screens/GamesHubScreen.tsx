import { GAME_CATALOG, type GameCatalogEntry } from '../gameCatalog'

type Props = {
  displayName: string
  games?: readonly GameCatalogEntry[]
  onSelectGame: (gameId: string) => void
  onOpenAccount: () => void
}

export function GamesHubScreen({
  displayName,
  games = GAME_CATALOG,
  onSelectGame,
  onOpenAccount,
}: Props) {
  return (
    <main className="screen settings-screen settings-hub">
      <div className="settings-hub-backdrop" aria-hidden="true">
        <div className="table-felt settings-hub-felt">
          <div className="table-oval settings-hub-oval" />
        </div>
      </div>

      <header className="settings-hub-header">
        <p className="brand">Secret Cards</p>
        <h1>Games</h1>
      </header>

      <div className="settings-hub-options">
        <div className="settings-hub-options-inner">
          <p className="lede">Welcome, {displayName}. Choose a game.</p>

          <nav className="games-catalog" aria-label="Available games">
            {games.map((game) => (
              <button
                key={game.id}
                type="button"
                className={
                  game.available
                    ? 'game-catalog-card'
                    : 'game-catalog-card is-disabled'
                }
                disabled={!game.available}
                onClick={() => onSelectGame(game.id)}
              >
                <span className="game-catalog-title">{game.title}</span>
                <span className="game-catalog-desc">{game.description}</span>
                {!game.available && (
                  <span className="game-catalog-badge">Coming soon</span>
                )}
              </button>
            ))}
          </nav>

          <button type="button" className="hub-row" onClick={onOpenAccount}>
            <span className="hub-row-label">Account</span>
            <span className="hub-row-summary">{displayName}</span>
          </button>
        </div>
      </div>
    </main>
  )
}
