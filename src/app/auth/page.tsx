'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogIn, UserPlus, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react'

type Mode = 'login' | 'signup'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabaseConfigured) {
      setError('Supabase is not configured. Add your credentials to .env.local')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setSuccess('Signed in successfully! Redirecting...')
        setTimeout(() => (window.location.href = '/'), 1500)
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Account created! Check your email to confirm your address.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="card space-y-6">
        <div>
          <h1 className="text-xl font-bold text-tarkov-yellow font-mono">
            {mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </h1>
          <p className="text-tarkov-muted text-xs mt-1">
            Sync your progress across devices with Supabase
          </p>
        </div>

        {!supabaseConfigured && (
          <div className="flex items-start gap-2 bg-tarkov-yellow/10 border border-tarkov-yellow/30 rounded p-3">
            <AlertCircle size={14} className="text-tarkov-yellow flex-shrink-0 mt-0.5" />
            <div className="text-xs text-tarkov-yellow">
              <p className="font-semibold">Supabase not configured</p>
              <p className="mt-0.5 text-tarkov-yellow/80">
                Copy <code className="font-mono">.env.local.example</code> to{' '}
                <code className="font-mono">.env.local</code> and add your Supabase credentials.
                Progress is still saved locally without signing in.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-tarkov-red-dark/30 border border-tarkov-red/40 rounded p-3 text-sm text-red-300">
            <AlertCircle size={14} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 bg-tarkov-green-dark/30 border border-tarkov-green/40 rounded p-3 text-sm text-green-300">
            <CheckCircle size={14} className="flex-shrink-0" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-tarkov-muted mb-1.5 block font-mono uppercase tracking-wider">
              Email
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tarkov-muted" />
              <input
                type="email"
                className="input pl-9"
                placeholder="operator@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-tarkov-muted mb-1.5 block font-mono uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tarkov-muted" />
              <input
                type="password"
                className="input pl-9"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-pulse">Processing...</span>
            ) : mode === 'login' ? (
              <>
                <LogIn size={14} />
                Sign In
              </>
            ) : (
              <>
                <UserPlus size={14} />
                Create Account
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => {
              setMode(m => (m === 'login' ? 'signup' : 'login'))
              setError(null)
              setSuccess(null)
            }}
            className="text-xs text-tarkov-muted hover:text-tarkov-yellow transition-colors"
          >
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>

        <div className="pt-2 border-t border-tarkov-border">
          <p className="text-xs text-tarkov-muted text-center">
            Progress is saved locally without an account.
            <br />
            Sign in to sync across devices.
          </p>
        </div>
      </div>
    </div>
  )
}
