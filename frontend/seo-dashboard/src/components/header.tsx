'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Menu } from 'lucide-react'
import { useCompany } from '@/context/company-context'
import { ThemeToggle } from '@/components/theme-toggle'
import { getHeartbeat } from '@/lib/api'

interface HeaderProps {
  onMobileMenuToggle?: () => void
}

function getHeartbeatTime(
  heartbeatData: Record<string, unknown> | undefined,
  companySlug: string | undefined
): Date | null {
  if (!heartbeatData || !companySlug) return null
  const value = heartbeatData[companySlug]
  if (!value) return null
  try {
    return new Date(value as string)
  } catch {
    return null
  }
}

function relativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  if (diffMins < 1)   return 'just now'
  if (diffMins < 60)  return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString()
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const [companyOpen, setCompanyOpen] = useState(false)
  const { currentCompany, setCurrentCompany, companiesData } = useCompany()

  const { data: heartbeatData } = useQuery({
    queryKey: ['heartbeat'],
    queryFn: getHeartbeat,
    refetchInterval: 60 * 1000,
  })

  const heartbeatDate = getHeartbeatTime(heartbeatData, currentCompany?.slug)
  const isLive = heartbeatDate && (Date.now() - heartbeatDate.getTime()) < 5 * 60 * 1000

  const handleCompanySelect = (company: typeof currentCompany) => {
    if (company) {
      setCurrentCompany(company)
      setCompanyOpen(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 h-14 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center justify-between px-6">
      {/* Mobile menu button */}
      {onMobileMenuToggle && (
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 -ml-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors mr-2"
          title="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Company Selector */}
      <div className="relative">
        <button
          onClick={() => setCompanyOpen(!companyOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[var(--bg-elevated)] transition-colors border border-transparent hover:border-[var(--border-strong)]"
        >
          <span className="text-sm font-medium text-[var(--text-primary)] max-w-[200px] truncate">
            {currentCompany?.name || 'Select Company'}
          </span>
          <ChevronDown className={`h-4 w-4 text-[var(--text-muted)] transition-transform duration-150 ${companyOpen ? 'rotate-180' : ''}`} />
        </button>

        {companyOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setCompanyOpen(false)} />

            <div className="absolute top-full left-0 mt-2 w-80 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl shadow-xl shadow-black/30 z-50 overflow-hidden">
              {(companiesData?.active?.length ?? 0) > 0 && (
                <div className="p-2">
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Active
                  </p>
                  {companiesData?.active.map((company: any) => (
                    <button
                      key={company.slug}
                      onClick={() => handleCompanySelect(company)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-colors ${
                        currentCompany?.slug === company.slug
                          ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="font-medium">{company.name || company.slug}</span>
                        {company.industry && (
                          <span className="text-xs text-[var(--text-muted)]">{company.industry}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-success)] animate-pulse" />
                        <span className="text-[10px] text-[var(--text-muted)]">Live</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {(companiesData?.paused?.length ?? 0) > 0 && (
                <div className="p-2 border-t border-[var(--border)]">
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Paused
                  </p>
                  {companiesData?.paused.map((company: any) => (
                    <button
                      key={company.slug}
                      onClick={() => handleCompanySelect(company)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-colors ${
                        currentCompany?.slug === company.slug
                          ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="font-medium">{company.name || company.slug}</span>
                        {company.industry && (
                          <span className="text-xs text-[var(--text-muted)]">{company.industry}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--text-disabled)]">Paused</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* System status indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border)]">
          <span className={`h-2 w-2 rounded-full ${isLive ? 'bg-[var(--status-success)] animate-pulse' : 'bg-[var(--text-disabled)]'}`} />
          <span className="text-xs text-[var(--text-muted)]">
            {isLive ? (
              <>Active · {heartbeatDate ? relativeTime(heartbeatDate) : 'just now'}</>
            ) : (
              'Idle'
            )}
          </span>
        </div>

        <ThemeToggle />
      </div>
    </header>
  )
}
