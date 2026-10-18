import { useEffect, useState } from 'react'
import { ApiError, equipSkins, getSkinMe, logout, updateMe } from '../api/client'
import type { SkinEquip, SkinProfile, User } from '../api/types'
import {
  asCardSkinId,
  resolveHitler,
  resolveRole,
} from '../cardAssets'

type Props = {
  user: User
  onUserChange: (user: User) => void
  onEquipChange: (equip: SkinEquip) => void
  onLoggedOut: () => void
  onBack: () => void
}

/** Logged-in profile editor (display name + sign out). Auth forms live on LoginScreen. */
export function AccountScreen({
  user,
  onUserChange,
  onEquipChange,
  onLoggedOut,
  onBack,
}: Props) {
  const [displayName, setDisplayName] = useState(user.display_name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [skins, setSkins] = useState<SkinProfile | null>(null)
  const [skinsStatus, setSkinsStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [skinsError, setSkinsError] = useState<string | null>(null)
  const [equipBusy, setEquipBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    void getSkinMe()
      .then((profile) => {
        if (cancelled) return
        setSkins(profile)
        setSkinsStatus('ready')
        onEquipChange(profile.equip)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setSkins(null)
        setSkinsStatus('error')
        setSkinsError(
          err instanceof ApiError ? err.message : 'Could not load skin packs',
        )
      })
    return () => {
      cancelled = true
    }
  }, [user.id, onEquipChange])

  async function handleSaveDisplayName() {
    const nextName = displayName.trim()
    if (!nextName) {
      setError('Display name cannot be empty')
      return
    }
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const next = await updateMe({ display_name: nextName })
      onUserChange(next)
      setInfo('Display name saved.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save')
    } finally {
      setBusy(false)
    }
  }

  async function handleEquip(
    slot: 'hitler' | 'role',
    packId: string,
  ) {
    setEquipBusy(true)
    setSkinsError(null)
    setInfo(null)
    try {
      const next =
        slot === 'hitler'
          ? await equipSkins({ hitler_pack_id: packId })
          : await equipSkins({ role_pack_id: packId })
      setSkins((prev) => (prev ? { ...prev, equip: next } : prev))
      onEquipChange(next)
      setInfo(slot === 'hitler' ? 'Hitler art saved.' : 'Role art saved.')
    } catch (err) {
      setSkinsError(err instanceof ApiError ? err.message : 'Failed to equip')
    } finally {
      setEquipBusy(false)
    }
  }

  async function handleLogout() {
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      await logout()
      onLoggedOut()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to sign out')
      setBusy(false)
    }
  }

  return (
    <main className="screen settings-screen settings-hub">
      <div className="settings-hub-backdrop" aria-hidden="true">
        <div className="table-felt settings-hub-felt">
          <div className="table-oval settings-hub-oval" />
        </div>
      </div>

      <header className="settings-hub-header">
        <p className="brand">Secret Cards</p>
        <h1>Account</h1>
      </header>

      <div className="settings-hub-options">
        <div className="settings-hub-options-inner">
          <p className="lede">
            Update your display name, choose Hitler and role art, or sign out.
          </p>

          <section className="settings-block" aria-label="Account profile">
            <ul className="name-list">
              {user.username && (
                <li className="name-row">
                  <span className="account-meta-label">Username</span>
                  <span className="account-meta-value">{user.username}</span>
                </li>
              )}
              {user.email && (
                <li className="name-row">
                  <span className="account-meta-label">Email</span>
                  <span className="account-meta-value">{user.email}</span>
                </li>
              )}
              <li className="name-row">
                <label htmlFor="account-display-name">Display name</label>
                <input
                  id="account-display-name"
                  type="text"
                  autoComplete="nickname"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </li>
            </ul>

            <div className="screen-actions account-actions">
              <button
                type="button"
                className="btn primary"
                disabled={busy}
                onClick={() => void handleSaveDisplayName()}
              >
                {busy ? 'Saving…' : 'Save display name'}
              </button>
              <button
                type="button"
                className="btn ghost"
                disabled={busy}
                onClick={() => void handleLogout()}
              >
                Sign out
              </button>
            </div>
          </section>

          <section className="settings-block" aria-label="Hitler and role art">
            <h2>Your Hitler and role art</h2>
            <p className="hint">
              Laws and card backs stay on the table preset. On a shared device,
              this art applies only to a seat whose name matches your display
              name. Other seats use the table preset. Online, each player's
              seat uses their own art.
            </p>

            {skinsStatus === 'loading' && (
              <p className="hint" role="status">
                Loading your skin packs…
              </p>
            )}

            {skinsError && (
              <p className="warning" role="alert">
                {skinsError}
              </p>
            )}

            {skinsStatus === 'ready' && skins && skins.owned_packs.length === 0 && (
              <p className="hint">You do not own any skin packs yet.</p>
            )}

            {skinsStatus === 'ready' && skins && skins.owned_packs.length > 0 && (
              <>
                <h2>Hitler</h2>
                <div className="skin-grid" role="radiogroup" aria-label="Hitler art">
                  {skins.owned_packs.map((pack) => {
                    const selected = skins.equip.hitler_pack_id === pack.id
                    const skinId = asCardSkinId(pack.code)
                    return (
                      <button
                        key={`hitler-${pack.id}`}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={
                          selected ? 'skin-option selected' : 'skin-option'
                        }
                        disabled={equipBusy || busy}
                        onClick={() => void handleEquip('hitler', pack.id)}
                      >
                        <span className="skin-option-name">{pack.title}</span>
                        {skinId && (
                          <span className="skin-preview" aria-hidden="true">
                            <img src={resolveHitler(skinId)} alt="" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                {!skins.equip.hitler_pack_id && (
                  <p className="hint">Not equipped — the table preset is used.</p>
                )}

                <h2>Roles</h2>
                <div className="skin-grid" role="radiogroup" aria-label="Role art">
                  {skins.owned_packs.map((pack) => {
                    const selected = skins.equip.role_pack_id === pack.id
                    const skinId = asCardSkinId(pack.code)
                    return (
                      <button
                        key={`role-${pack.id}`}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={
                          selected ? 'skin-option selected' : 'skin-option'
                        }
                        disabled={equipBusy || busy}
                        onClick={() => void handleEquip('role', pack.id)}
                      >
                        <span className="skin-option-name">{pack.title}</span>
                        {skinId && (
                          <span className="skin-preview" aria-hidden="true">
                            <img src={resolveRole(skinId, 'fascist')} alt="" />
                            <img src={resolveRole(skinId, 'communist')} alt="" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                {!skins.equip.role_pack_id && (
                  <p className="hint">Not equipped — the table preset is used.</p>
                )}
              </>
            )}
          </section>

          {error && (
            <p className="warning" role="alert">
              {error}
            </p>
          )}
          {info && !error && (
            <p className="hint" role="status">
              {info}
            </p>
          )}
        </div>
      </div>

      <footer className="settings-hub-footer">
        <button
          type="button"
          className="btn primary"
          disabled={busy}
          onClick={onBack}
        >
          Back
        </button>
      </footer>
    </main>
  )
}
