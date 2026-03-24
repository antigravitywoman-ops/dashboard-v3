'use client'

import { cn } from '@/lib/utils'

interface SystemStatusBannerProps {
  heartbeatData?: Record<string, unknown>
  companySlug?: string
  contentCount?: number
  inProgressCount?: number
}

function getHeartbeatTimestamp(
  heartbeatData?: Record<string, unknown>,
  companySlug?: string
): Date | null {
  if (!heartbeatData || !companySlug) return null
  // The heartbeat endpoint returns { [companySlug]: timestamp } or similar
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

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString()
}

export function SystemStatusBanner({
  heartbeatData,
  companySlug,
  contentCount = 0,
  inProgressCount = 0,
}: SystemStatusBannerProps) {
  const heartbeatDate = getHeartbeatTimestamp(heartbeatData, companySlug)
  const isLive = heartbeatDate && (Date.now() - heartbeatDate.getTime()) < 5 * 60 * 1000

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 bg-[#111113] border border-[#27272A] rounded-xl">
      {/* Heartbeat status */}
      <div className="flex items-center gap-2">
        <div className={cn('h-2 w-2 rounded-full', isLive ? 'bg-[#22C55E] animate-pulse' : 'bg-[#52525B]')} />
        <span className="text-xs text-[#71717A]">Heartbeat</span>
        <span className={cn('text-xs font-mono', isLive ? 'text-[#22C55E]' : 'text-[#52525B]')}>
          {heartbeatDate ? relativeTime(heartbeatDate) : '—'}
        </span>
      </div>

      {/* Divider */}
      <div className="hidden sm:block h-3 w-px bg-[#27272A]" />

      {/* Content pipeline */}
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-[#A78BFA]" />
        <span className="text-xs text-[#71717A]">Content</span>
        <span className="text-xs font-mono text-[#A1A1AA]">{contentCount} items</span>
      </div>

      {/* Divider */}
      <div className="hidden sm:block h-3 w-px bg-[#27272A]" />

      {/* Active tasks */}
      <div className="flex items-center gap-2">
        <div className={cn('h-2 w-2 rounded-full', inProgressCount > 0 ? 'bg-[#A78BFA] animate-pulse' : 'bg-[#52525B]')} />
        <span className="text-xs text-[#71717A]">Active Tasks</span>
        <span className="text-xs font-mono text-[#A1A1AA]">
          {inProgressCount > 0 ? `${inProgressCount} in progress` : 'Idle'}
        </span>
      </div>
    </div>
  )
}
