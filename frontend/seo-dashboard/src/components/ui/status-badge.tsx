'use client'

import { cn } from '@/lib/utils'

type Status =
  | 'completed'
  | 'in-progress'
  | 'pending'
  | 'pending-verification'
  | 'blocked'
  | 'cancelled'
  | 'approved'
  | 'rejected'
  | 'draft'
  | 'published'
  | 'in-review'
  | 'pending-publish'
  | 'active'
  | 'paused'

interface StatusConfig {
  label: string
  dotColor: string
  dotBg: string
  textColor: string
  badgeBg: string
  pulse: boolean
}

const statusConfigs: Record<Status, StatusConfig> = {
  completed: {
    label:    'Done',
    dotColor: 'bg-[var(--status-success)]',
    dotBg:    '',
    textColor:'text-[var(--status-success)]',
    badgeBg:  'bg-[var(--status-success-bg)]',
    pulse:    false,
  },
  'in-progress': {
    label:    'In Progress',
    dotColor: 'bg-[var(--accent)]',
    dotBg:    '',
    textColor:'text-[var(--accent)]',
    badgeBg:  'bg-[var(--accent-subtle)]',
    pulse:    true,
  },
  pending: {
    label:    'Pending',
    dotColor: 'bg-[var(--accent)]',
    dotBg:    '',
    textColor:'text-[var(--accent)]',
    badgeBg:  'bg-[var(--accent-subtle)]',
    pulse:    false,
  },
  'pending-verification': {
    label:    'Pending Review',
    dotColor: 'bg-[var(--status-warning)]',
    dotBg:    '',
    textColor:'text-[var(--status-warning)]',
    badgeBg:  'bg-[var(--status-warning-bg)]',
    pulse:    false,
  },
  blocked: {
    label:    'Blocked',
    dotColor: 'bg-[var(--status-error)]',
    dotBg:    '',
    textColor:'text-[var(--status-error)]',
    badgeBg:  'bg-[var(--status-error-bg)]',
    pulse:    false,
  },
  cancelled: {
    label:    'Cancelled',
    dotColor: 'bg-[var(--text-disabled)]',
    dotBg:    '',
    textColor:'text-[var(--text-disabled)]',
    badgeBg:  'bg-transparent',
    pulse:    false,
  },
  approved: {
    label:    'Approved',
    dotColor: 'bg-[var(--accent-teal)]',
    dotBg:    '',
    textColor:'text-[var(--accent-teal)]',
    badgeBg:  'bg-[var(--accent-teal-subtle)]',
    pulse:    false,
  },
  rejected: {
    label:    'Rejected',
    dotColor: 'bg-[var(--status-error)]',
    dotBg:    '',
    textColor:'text-[var(--status-error)]',
    badgeBg:  'bg-[var(--status-error-bg)]',
    pulse:    false,
  },
  draft: {
    label:    'Draft',
    dotColor: 'bg-[var(--accent)]',
    dotBg:    '',
    textColor:'text-[var(--accent)]',
    badgeBg:  'bg-[var(--accent-subtle)]',
    pulse:    false,
  },
  published: {
    label:    'Published',
    dotColor: 'bg-[var(--accent-teal)]',
    dotBg:    '',
    textColor:'text-[var(--accent-teal)]',
    badgeBg:  'bg-[var(--accent-teal-subtle)]',
    pulse:    false,
  },
  'in-review': {
    label:    'In Review',
    dotColor: 'bg-[var(--accent)]',
    dotBg:    '',
    textColor:'text-[var(--accent)]',
    badgeBg:  'bg-[var(--accent-subtle)]',
    pulse:    false,
  },
  'pending-publish': {
    label:    'Pending Publish',
    dotColor: 'bg-[var(--status-warning)]',
    dotBg:    '',
    textColor:'text-[var(--status-warning)]',
    badgeBg:  'bg-[var(--status-warning-bg)]',
    pulse:    false,
  },
  active: {
    label:    'Active',
    dotColor: 'bg-[var(--status-success)]',
    dotBg:    '',
    textColor:'text-[var(--status-success)]',
    badgeBg:  'bg-[var(--status-success-bg)]',
    pulse:    false,
  },
  paused: {
    label:    'Paused',
    dotColor: 'bg-[var(--text-muted)]',
    dotBg:    '',
    textColor:'text-[var(--text-muted)]',
    badgeBg:  'bg-transparent',
    pulse:    false,
  },
}

interface StatusBadgeProps {
  status: Status
  showDot?: boolean
  showLabel?: boolean
  showBadge?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function StatusBadge({
  status,
  showDot = true,
  showLabel = true,
  showBadge = false,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const config = statusConfigs[status] ?? statusConfigs.pending

  const dot = (
    <span
      className={cn(
        'rounded-full shrink-0 inline-block',
        config.dotColor,
        size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2',
        config.pulse && 'animate-pulse',
      )}
    />
  )

  const label = (
    <span className={cn('font-medium', size === 'sm' ? 'text-[10px]' : 'text-xs', config.textColor)}>
      {config.label}
    </span>
  )

  if (showBadge) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5',
          config.badgeBg,
          config.textColor,
          size === 'sm' && 'px-2 py-0 text-[10px]',
          className,
        )}
      >
        {showDot && dot}
        {showLabel && label}
      </span>
    )
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {showDot && dot}
      {showLabel && label}
    </span>
  )
}
