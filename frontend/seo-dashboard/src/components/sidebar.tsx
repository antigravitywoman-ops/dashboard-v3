'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  CheckSquare,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Overview',   href: '/dashboard',          icon: LayoutDashboard },
  { name: 'Tasks',      href: '/dashboard/tasks',    icon: CheckSquare },
  { name: 'Content',    href: '/dashboard/content',  icon: FileText },
  { name: 'Reports',    href: '/dashboard/reports',  icon: BarChart3 },
  { name: 'Analytics',  href: '/dashboard/analytics', icon: TrendingUp },
  { name: 'Team',        href: '/dashboard/team',     icon: Users },
  { name: 'Settings',    href: '/dashboard/settings', icon: Settings },
]

const STORAGE_KEY = 'sidebar-collapsed'

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)

  // Sync collapsed state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      setCollapsed(stored === 'true')
    }
  }, [])

  // Persist to localStorage and dispatch event
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(collapsed))
      document.documentElement.style.setProperty('--sidebar-width', collapsed ? '64px' : '240px')
      window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed } }))
    }
  }, [collapsed])

  const userInitial = session?.user?.name?.charAt(0)?.toUpperCase() ?? 'U'

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col',
        'bg-[var(--bg-card)] border-r border-[var(--border)]',
        'transition-all duration-200 ease-out',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center border-b border-[var(--border)] shrink-0',
        collapsed ? 'justify-center px-2 py-4' : 'px-5 py-4 gap-2.5'
      )}>
        {/* Lightning bolt SVG logo — clean indigo, no glow */}
        <div className="h-8 w-8 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0">
          <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div>
            <span className="text-sm font-bold text-[var(--text-primary)] tracking-tight">OpenClaw</span>
            <span className="block text-[10px] text-[var(--text-muted)] font-mono -mt-0.5">SEO</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 py-4 overflow-y-auto overflow-x-hidden', collapsed ? 'px-1.5' : 'px-3')}>
        <div className={cn('flex flex-col gap-0.5', !collapsed && 'space-y-0.5')}>
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                title={collapsed ? item.name : undefined}
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    window.dispatchEvent(new CustomEvent('sidebar-nav-click'))
                  }
                }}
                className={cn(
                  'flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150',
                  collapsed
                    ? 'justify-center px-2 py-2.5 w-full'
                    : 'px-3 py-2.5',
                  isActive
                    ? 'bg-[var(--accent-subtle)] text-[var(--accent)] border-l-[3px] border-[var(--accent)] pl-[calc(0.75rem-3px)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
                )}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 shrink-0',
                    isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                  )}
                />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className={cn('border-t border-[var(--border)] p-3 shrink-0', collapsed ? 'px-1.5' : 'px-3')}>
        {!collapsed ? (
          <div className="flex flex-col gap-3">
            {/* User info */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[var(--accent)] flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-white">{userInitial}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {session?.user?.name || 'User'}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {session?.user?.email || ''}
                </p>
              </div>
            </div>

            {/* Actions row */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-bg)] rounded-lg transition-colors"
              >
                Sign out
              </button>
              <button
                onClick={() => setCollapsed(true)}
                className="p-2 text-[var(--text-disabled)] hover:text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {/* User avatar — clean indigo */}
            <div className="h-9 w-9 rounded-full bg-[var(--accent)] flex items-center justify-center">
              <span className="text-xs font-bold text-white">{userInitial}</span>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="p-2 text-[var(--text-disabled)] hover:text-[var(--status-error)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
              title="Sign out"
            >
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>

            <button
              onClick={() => setCollapsed(false)}
              className="p-2 text-[var(--text-disabled)] hover:text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
