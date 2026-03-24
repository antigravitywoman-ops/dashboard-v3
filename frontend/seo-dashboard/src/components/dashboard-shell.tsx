'use client'

import { Header } from '@/components/header'
import { Sidebar } from '@/components/sidebar'
import { useState, useEffect } from 'react'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCollapsed(localStorage.getItem('sidebar-collapsed') === 'true')
    }

    const handler = (e: Event) => {
      setCollapsed((e as CustomEvent).detail.collapsed)
    }

    window.addEventListener('sidebar-toggle', handler)
    return () => window.removeEventListener('sidebar-toggle', handler)
  }, [])

  // Close mobile sidebar when user navigates via a nav link
  useEffect(() => {
    const closeHandler = () => setMobileOpen(false)
    window.addEventListener('sidebar-nav-click', closeHandler)
    return () => window.removeEventListener('sidebar-nav-click', closeHandler)
  }, [])

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && mobileOpen) {
        setMobileOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [mobileOpen])

  return (
    <div className="min-h-screen">
      {/* Mobile sidebar backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-[var(--bg-primary)]/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop sidebar — only rendered at lg+ */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-30">
        <Sidebar />
      </div>

      {/* Mobile sidebar — shown when menu is open on mobile */}
      {mobileOpen && (
        <div className="fixed inset-y-0 left-0 z-30 lg:hidden">
          <Sidebar />
        </div>
      )}

      <Header onMobileMenuToggle={() => setMobileOpen(v => !v)} />
      <main
        className={`transition-all duration-200 ease-out p-6 ${
          collapsed ? 'lg:pl-16' : 'lg:pl-60'
        }${mobileOpen ? ' pl-16' : ''}`}
      >
        {children}
      </main>
    </div>
  )
}
