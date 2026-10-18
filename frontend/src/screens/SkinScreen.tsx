import {
  CARD_SKIN_IDS,
  CARD_SKIN_LABELS,
  resolveHitler,
  resolveLaw,
  resolveRole,
  type CardSkinId,
} from '../cardAssets'

type Props = {
  cardSkin: CardSkinId
  onCardSkinChange: (skin: CardSkinId) => void
  onBack: () => void
  error?: string | null
  /** Signed-in pass-and-play: personal Hitler/role art is not this preset. */
  signedIn?: boolean
}

export function SkinScreen({
  cardSkin,
  onCardSkinChange,
  onBack,
  error = null,
  signedIn = false,
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
        <h1>Card set skin</h1>
      </header>

      <div className="settings-hub-options">
        <div className="settings-hub-options-inner">
          <p className="lede">
            {signedIn
              ? 'Table preset for laws, card backs, and any seat that is not using your Hitler or role art.'
              : 'One whole preset for the table — Hitler, roles, and laws.'}
          </p>
          {signedIn && (
            <p className="hint">
              On a shared device, your Hitler and role art apply only to a seat
              whose name matches your display name. Other seats use this
              preset. Online, each player's seat uses their own art.
            </p>
          )}

          <section className="settings-block" aria-label="Card set presets">
            <div className="skin-grid" role="radiogroup" aria-label="Card skin">
              {CARD_SKIN_IDS.map((id) => {
                const selected = id === cardSkin
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={
                      selected ? 'skin-option selected' : 'skin-option'
                    }
                    onClick={() => onCardSkinChange(id)}
                  >
                    <span className="skin-option-name">
                      {CARD_SKIN_LABELS[id]}
                    </span>
                    <span className="skin-preview" aria-hidden="true">
                      <img src={resolveHitler(id)} alt="" />
                      <img src={resolveRole(id, 'fascist')} alt="" />
                      <img src={resolveRole(id, 'communist')} alt="" />
                      <img src={resolveLaw(id, 'red', 1)} alt="" />
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {error && (
            <p className="warning" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      <footer className="settings-hub-footer">
        <button type="button" className="btn primary" onClick={onBack}>
          Back
        </button>
      </footer>
    </main>
  )
}
