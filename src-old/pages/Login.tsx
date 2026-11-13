import { useState } from 'react'
import { Loader2, Lock, Mail } from 'lucide-react'
import { api } from '../data/api'
import type { User } from '../data/types'

/** Three demo accounts, one per access level. Any password is accepted. */
const DEMO = [
  { email: 'owner@gmail.com', label: 'Owner', hint: 'Whole business: revenue, ad return, every branch' },
  { email: 'manager@gmail.com', label: 'Manager', hint: 'Their team: enquiries, follow-ups, rep performance' },
  { email: 'sales@gmail.com', label: 'Sales', hint: 'Their own enquiries and today’s calls' },
]

export default function Login({ onSignIn }: { onSignIn: (u: User) => void }) {
  const [email, setEmail] = useState('owner@gmail.com')
  const [password, setPassword] = useState('demo')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(undefined)
    try {
      onSignIn(await api.signIn(email, password))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in')
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-page-bg)] p-6">
      <div className="panel w-full max-w-sm p-8">
        <div className="mb-6">
          <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-[var(--color-text-primary)] text-lg text-white">✳</div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Sign in</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Your dashboard depends on your role.</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Email</span>
            <span className="relative block">
              <Mail size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)}
                className="input w-full py-2 pl-9 text-sm" placeholder="you@company.com" />
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Password</span>
            <span className="relative block">
              <Lock size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
                className="input w-full py-2 pl-9 text-sm" placeholder="Any password" />
            </span>
          </label>

          {error && <p role="alert" className="rounded-[var(--radius-input)] bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p>}

          <button type="submit" disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-text-primary)] py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60">
            {busy && <Loader2 size={15} className="animate-spin" />}
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 border-t border-[var(--color-border-subtle)] pt-4">
          <p className="mb-2 text-[11px] font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">Demo accounts</p>
          <ul className="space-y-1">
            {DEMO.map(d => (
              <li key={d.email}>
                <button type="button" onClick={() => setEmail(d.email)}
                  className="w-full rounded-[var(--radius-input)] px-2.5 py-2 text-left transition hover:bg-white/40">
                  <span className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">{d.label}</span>
                    <span className="truncate text-xs text-[var(--color-text-muted)]">{d.email}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">{d.hint}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
