'use client'

import { cn } from '@/lib/utils'
import { ProgressRing } from './progress-ring'
import { Skeleton } from './skeleton'
import type { LucideIcon } from 'lucide-react'

type AccentColor = 'purple' | 'teal' | 'success' | 'warning' | 'error' | 'info'
type MetricVariant = 'default' | 'ring' | 'simple' | 'glow'

interface MetricCardProps {
  title: string
  value: number | string
  total?: number        // for ring: e.g. value=3, total=7 → 43%
  icon?: LucideIcon
  variant?: MetricVariant
  accentColor?: AccentColor
  description?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  className?: string
  isLoading?: boolean
  onClick?: () => void
}

const accentColors: Record<AccentColor, string> = {
  purple:  'text-[#A78BFA]',
  teal:    'text-[#2DD4BF]',
  success: 'text-[#22C55E]',
  warning: 'text-[#F59E0B]',
  error:   'text-[#EF4444]',
  info:    'text-[#3B82F6]',
}

const accentBgs: Record<AccentColor, string> = {
  purple:  'bg-[rgba(167,139,250,0.12)]',
  teal:    'bg-[rgba(45,212,191,0.12)]',
  success: 'bg-[rgba(34,197,94,0.12)]',
  warning: 'bg-[rgba(245,158,11,0.12)]',
  error:   'bg-[rgba(239,68,68,0.12)]',
  info:    'bg-[rgba(59,130,246,0.12)]',
}

export function MetricCard({
  title,
  value,
  total,
  icon: Icon,
  variant = 'default',
  accentColor = 'purple',
  description,
  trend,
  trendValue,
  className,
  isLoading,
  onClick,
}: MetricCardProps) {
  if (isLoading) {
    return (
      <div className={cn('rounded-xl bg-[#18181B] border border-[#27272A] p-5', className)}>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </div>
    )
  }

  const ringValue = total !== undefined && total > 0 ? Math.round((Number(value) / total) * 100) : 0

  return (
    <div
      className={cn(
        'rounded-xl bg-[#18181B] border border-[#27272A] p-5',
        'transition-all duration-150',
        variant === 'glow' && 'shadow-[0_0_20px_rgba(167,139,250,0.15)] border-[rgba(167,139,250,0.3)]',
        onClick && 'cursor-pointer hover:border-[#3F3F46] hover:shadow-md hover:-translate-y-px',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#71717A] uppercase tracking-wide truncate">{title}</p>

          {/* Value display */}
          <div className="mt-1">
            {variant === 'ring' ? (
              <ProgressRing
                value={ringValue}
                size={64}
                strokeWidth={5}
                sublabel={total !== undefined ? `${value} / ${total}` : undefined}
                variant="compact"
              />
            ) : (
              <p className={cn('text-3xl font-bold text-[#FAFAFA] leading-none', onClick && 'cursor-pointer')}>
                {value}
              </p>
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="text-xs text-[#71717A] mt-1.5 truncate">{description}</p>
          )}

          {/* Trend */}
          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-1.5">
              {trend === 'up'   && <span className="text-[#22C55E] text-xs">↑ {trendValue}</span>}
              {trend === 'down' && <span className="text-[#EF4444] text-xs">↓ {trendValue}</span>}
              {trend === 'neutral' && <span className="text-[#71717A] text-xs">→ {trendValue}</span>}
            </div>
          )}
        </div>

        {/* Icon */}
        {Icon && (
          <div className={cn('p-2.5 rounded-xl shrink-0', accentBgs[accentColor])}>
            <Icon className={cn('h-5 w-5', accentColors[accentColor])} />
          </div>
        )}
      </div>
    </div>
  )
}
