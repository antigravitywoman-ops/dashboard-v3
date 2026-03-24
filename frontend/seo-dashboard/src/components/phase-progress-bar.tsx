'use client'

import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionHeader } from '@/components/ui/section-header'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface PhaseProgressBarProps {
  phase: string
  currentWeek: number
  totalWeeks: number
  weekLabel?: string
  isLoading?: boolean
}

const phases = ['Foundation', 'Growth', 'Authority', 'Scale']

export function PhaseProgressBar({
  phase,
  currentWeek,
  totalWeeks,
  weekLabel,
  isLoading,
}: PhaseProgressBarProps) {
  // Determine which phase we're in based on progress
  const currentPhaseIndex = phases.indexOf(phase) >= 0 ? phases.indexOf(phase) : 0

  // Bound progress between 0 and 100%
  const progress = Math.min(Math.max(currentWeek / totalWeeks, 0), 1)
  const progressPct = Math.round(progress * 100)

  if (isLoading) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-32" shimmer />
          <Skeleton className="h-4 w-20" shimmer />
        </div>
        <Skeleton className="h-3 w-full rounded-full mb-3" shimmer />
        <div className="flex gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-2 flex-1 rounded-full" shimmer />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Phase Progress</h3>
          <Badge variant="indigo" size="sm">{phase}</Badge>
        </div>
        {weekLabel && (
          <span className="text-xs text-[var(--text-muted)] font-mono">{weekLabel}</span>
        )}
      </div>

      {/* Phase segments */}
      <div className="flex gap-1 mb-4">
        {phases.map((p, i) => {
          const isCurrentPhase = i === currentPhaseIndex
          const isPastPhase = i < currentPhaseIndex

          return (
            <div
              key={p}
              className={cn(
                'flex-1 h-2 rounded-full transition-all duration-300',
                isPastPhase && 'bg-gradient-to-r from-[var(--status-success)] to-[var(--accent-teal)]',
                isCurrentPhase && 'bg-[var(--accent)]',
                !isPastPhase && !isCurrentPhase && 'bg-[var(--border)]'
              )}
            />
          )
        })}
      </div>

      {/* Phase labels */}
      <div className="flex gap-1">
        {phases.map((p, i) => {
          const isCurrentPhase = i === currentPhaseIndex
          return (
            <div key={p} className="flex-1 text-center">
              <span
                className={cn(
                  'text-[10px] font-medium',
                  isCurrentPhase ? 'text-[var(--accent)]' : 'text-[var(--text-disabled)]'
                )}
              >
                {p}
              </span>
            </div>
          )
        })}
      </div>

      {/* Week progress bar */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[var(--text-muted)]">Week {Math.min(currentWeek, totalWeeks)} of {totalWeeks}</span>
          <span className="text-xs font-medium text-[var(--accent)]">
            {progressPct}% through current phase
          </span>
        </div>
        <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-teal)] rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
