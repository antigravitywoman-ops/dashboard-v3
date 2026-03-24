'use client'

import { cn } from '@/lib/utils'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GreetingHeroProps {
  companyName?: string
  currentPhase?: string
  currentWeekLabel?: string
  userName?: string
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function GreetingHero({
  companyName,
  currentPhase,
  currentWeekLabel,
  userName,
  onRefresh,
  isRefreshing,
}: GreetingHeroProps) {
  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  const subtitle = companyName
    ? `${companyName} is in ${currentPhase ?? 'Foundation'} · ${currentWeekLabel ?? 'Week 1'}`
    : 'Select a company to get started'

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {/* Indigo accent line */}
        <div className="h-0.5 w-12 rounded-full bg-[var(--accent)] mb-4 animate-fade-in" />

        {/* Greeting */}
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] leading-tight animate-slide-up">
          {userName ? `Good ${timeOfDay}, ${userName}` : `Good ${timeOfDay}`}
        </h1>

        {/* Subtitle with phase context */}
        <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed animate-slide-up stagger-1">
          {subtitle}
        </p>
      </div>

      {/* Actions */}
      {onRefresh && (
        <div className="flex items-center gap-2 shrink-0 pt-1 animate-fade-in">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            isLoading={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      )}
    </div>
  )
}
