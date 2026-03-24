'use client'

import { signIn, useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      router.push('/dashboard')
    }
  }, [session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="relative max-w-md w-full p-8 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          {/* Indigo accent line */}
          <div className="h-0.5 w-12 rounded-full bg-[var(--accent)] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            OpenClaw SEO
          </h1>
          <p className="text-[var(--text-muted)] mt-2 text-sm">Sign in to manage your campaigns</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-[var(--status-error-bg)] border border-[var(--status-error-border)] rounded-lg text-[var(--status-error)] text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-lg text-sm placeholder-[var(--text-disabled)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 pr-10 border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-lg text-sm placeholder-[var(--text-disabled)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 transition-colors"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--border)] bg-[var(--bg-surface)] accent-[var(--accent)]"
              />
              <span className="text-sm text-[var(--text-secondary)]">Remember me</span>
            </label>
          </div>

          <Button
            type="submit"
            variant="indigo"
            className="w-full mt-2"
            isLoading={loading}
          >
            Sign in
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-disabled)] mt-6">
          OpenClaw SEO Dashboard
        </p>
      </div>
    </div>
  )
}
