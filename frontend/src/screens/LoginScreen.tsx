import { useState } from 'react'
import { ApiError, login, register } from '../api/client'
import type { User } from '../api/types'

type Props = {
  onAuthenticated: (user: User) => void
  onPlayAsGuest: () => void
  busyBoot?: boolean
  bootWarning?: string | null
}

type AuthMode = 'login' | 'register'

export function LoginScreen({
  onAuthenticated,
  onPlayAsGuest,
  busyBoot = false,
  bootWarning = null,
}: Props) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setBusy(true)
    setError(null)
    try {
      const body = {
        password,
        ...(username.trim() ? { username: username.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
      }
      if (!body.username && !body.email) {
        setError('Enter a username and/or email')
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
      const next =
        mode === 'register'
          ? await register({
              ...body,
              ...(displayName.trim()
                ? { display_name: displayName.trim() }
                : {}),
            })
          : await login(body)
      onAuthenticated(next)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  const disabled = busy || busyBoot

  return (
    <main className="screen settings-screen settings-hub">
      <div className="settings-hub-backdrop" aria-hidden="true">
        <div className="table-felt settings-hub-felt">
          <div className="table-oval settings-hub-oval" />
        </div>
      </div>

      <header className="settings-hub-header">
        <p className="brand">Secret Cards</p>
        <h1>{busyBoot ? 'Loading…' : 'Sign in'}</h1>
      </header>

      <div className="settings-hub-options">
        <div className="settings-hub-options-inner">
          <p className="lede">
            Sign in for the games hub, or play as guest for local pass-and-play
            only.
          </p>

          <section className="settings-block" aria-label="Sign in">
            <div
              className="account-mode-switch"
              role="tablist"
              aria-label="Account mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                className={
                  mode === 'login'
                    ? 'account-mode-btn selected'
                    : 'account-mode-btn'
                }
                disabled={disabled}
                onClick={() => {
                  setMode('login')
                  setError(null)
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                className={
                  mode === 'register'
                    ? 'account-mode-btn selected'
                    : 'account-mode-btn'
                }
                disabled={disabled}
                onClick={() => {
                  setMode('register')
                  setError(null)
                }}
              >
                Create account
              </button>
            </div>

            <ul className="name-list">
              <li className="name-row">
                <label htmlFor="login-username">Username</label>
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  disabled={disabled}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </li>
              <li className="name-row">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  disabled={disabled}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </li>
              {mode === 'register' && (
                <li className="name-row">
                  <label htmlFor="login-display-name">
                    Display name (optional)
                  </label>
                  <input
                    id="login-display-name"
                    type="text"
                    autoComplete="nickname"
                    value={displayName}
                    disabled={disabled}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </li>
              )}
              <li className="name-row">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete={
                    mode === 'register' ? 'new-password' : 'current-password'
                  }
                  value={password}
                  disabled={disabled}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </li>
            </ul>
            <p className="hint">
              Username and/or email. Password at least 6 characters.
            </p>

            {(error || bootWarning) && (
              <p className="warning" role="alert">
                {error ?? bootWarning}
              </p>
            )}
          </section>
        </div>
      </div>

      <footer className="settings-hub-footer">
        <button
          type="button"
          className="btn primary"
          disabled={disabled}
          onClick={() => void handleSubmit()}
        >
          {busy
            ? 'Working…'
            : mode === 'register'
              ? 'Create account'
              : 'Sign in'}
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={disabled}
          onClick={onPlayAsGuest}
        >
          Play as guest
        </button>
      </footer>
    </main>
  )
}
