'use client'

import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionHeader } from '@/components/ui/section-header'
import { StatusBadge } from '@/components/ui/status-badge'
import type { Task } from '@/lib/api'
import Link from 'next/link'
import { Activity } from 'lucide-react'

interface ActivityFeedProps {
  tasks: Task[]
  isLoading?: boolean
  onTaskClick?: (task: Task) => void
}

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1)   return 'just now'
  if (diffMins < 60)  return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export function ActivityFeed({ tasks, isLoading, onTaskClick }: ActivityFeedProps) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
      <SectionHeader
        title="Recent Activity"
        icon={Activity}
        actions={
          <Link href="/dashboard/tasks">
            <button className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors font-medium">
              View all →
            </button>
          </Link>
        }
        className="mb-4"
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-2 w-2 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-3/4" shimmer />
                <Skeleton className="h-2 w-1/4" shimmer />
              </div>
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex items-center justify-center h-24">
          <p className="text-sm text-[var(--text-disabled)]">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task, i) => (
            <div
              key={task.id}
              onClick={() => onTaskClick?.(task)}
              className={cn(
                'flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors animate-slide-up cursor-pointer',
                'hover:bg-[var(--bg-elevated)]',
                `stagger-${Math.min(i + 1, 6)}`,
              )}
            >
              {/* Status dot */}
              <div className="mt-1 shrink-0">
                <StatusBadge status={task.status as any} showDot showLabel={false} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-secondary)] truncate">
                  {task.hover_label || task.type || task.id}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={task.status as any} showDot={false} showLabel />
                  {task.priority && task.priority !== 'normal' && (
                    <span className={cn(
                      'text-[10px] font-medium uppercase',
                      task.priority === 'critical' ? 'text-[var(--status-error)]' :
                      task.priority === 'high'     ? 'text-[var(--status-warning)]' :
                      'text-[var(--text-disabled)]'
                    )}>
                      {task.priority}
                    </span>
                  )}
                </div>
              </div>

              {/* Time */}
              <span className="text-xs text-[var(--text-disabled)] shrink-0 font-mono mt-1">
                {task.updated_at ? relativeTime(task.updated_at) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
