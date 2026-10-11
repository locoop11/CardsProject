import { useState } from 'react'
import { ApiError, logout, updateMe } from '../api/client'
import type { User } from '../api/types'

type Props = {
  user: User
  onUserChange: (user: User) => void
  onLoggedOut: () => void
  onBack: () => void
}

/** Logged-in profile editor (display name + sign out). Auth forms live on LoginScreen. */
export function AccountScreen({
  user,
  onUserChange,
  onLoggedOut,
  onBack,
}: Props) {
  const [displayName, setDisplayName] = useState(user.display_name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

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
          <p className="lede">Update your display name or sign out.</p>

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
