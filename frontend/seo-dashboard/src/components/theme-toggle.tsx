'use client'

import { useState, useEffect } from 'react'
import { Sun, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type Theme = 'dark' | 'dark-bright'

const STORAGE_KEY = 'oc-theme'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
      setTheme(stored ?? 'dark')
      document.documentElement.classList.toggle('dark-bright', stored === 'dark-bright')
    }
  }, [])

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'dark-bright' : 'dark'
    setTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.classList.toggle('dark-bright', next === 'dark-bright')
  }

  if (!mounted) {
    return (
      <div className="w-9 h-9" />
    )
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        'relative p-2 rounded-xl transition-all duration-150',
        'text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-elevated)]',
        theme === 'dark-bright' && 'text-[var(--accent)] bg-[var(--accent-subtle)] shadow-[0_0_12px_rgba(99,102,241,0.2)]'
      )}
      title={theme === 'dark' ? 'Enable mission mode' : 'Back to subtle mode'}
    >
      {theme === 'dark-bright' ? (
        <Sparkles className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </button>
  )
}
