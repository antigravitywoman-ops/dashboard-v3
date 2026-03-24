'use client'

import { cn } from '@/lib/utils'
import { SectionHeader } from '@/components/ui/section-header'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock } from 'lucide-react'

interface ThisWeekFocusProps {
  focusAreas?: string[]
  priorityFocus?: string
  isLoading?: boolean
}

export function ThisWeekFocus({
  focusAreas,
  priorityFocus,
  isLoading,
}: ThisWeekFocusProps) {
  const items = focusAreas?.slice(0, 5) ?? []

  return (
    <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-5 h-full">
      <SectionHeader
        title="This Week's Focus"
        icon={Clock}
        className="mb-4"
      />

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-4 w-full" shimmer />
          ))}
        </div>
      ) : items.length === 0 && !priorityFocus ? (
        <p className="text-xs text-[#52525B] py-4 text-center">No focus areas set</p>
      ) : (
        <div className="space-y-2">
          {/* Priority focus as highlighted item */}
          {priorityFocus && (
            <div className="mb-3 px-3 py-2.5 rounded-lg bg-[rgba(167,139,250,0.08)] border border-[rgba(167,139,250,0.15)]">
              <p className="text-xs text-[#A78BFA] font-medium mb-1">Priority</p>
              <p className="text-sm text-[#FAFAFA]">{priorityFocus}</p>
            </div>
          )}

          {/* Focus areas */}
          {items.map((area, i) => (
            <div
              key={i}
              className={cn(
                'flex items-start gap-2 text-sm animate-fade-in',
                `stagger-${Math.min(i + 1, 5)}`
              )}
            >
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#A78BFA] shrink-0" />
              <span className="text-[#A1A1AA] leading-snug">{area}</span>
            </div>
          ))}

          {items.length === 0 && !priorityFocus && (
            <p className="text-xs text-[#52525B]">No focus areas set</p>
          )}
        </div>
      )}
    </div>
  )
}
