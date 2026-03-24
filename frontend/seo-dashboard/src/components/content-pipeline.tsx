'use client'

import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionHeader } from '@/components/ui/section-header'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface ContentPipelineProps {
  draft: number
  review: number
  approved: number
  published: number
  isLoading?: boolean
}

const stages = [
  { key: 'draft',     label: 'Draft',     activeColor: 'var(--accent)' },
  { key: 'review',    label: 'In Review', activeColor: 'var(--accent)' },
  { key: 'approved',  label: 'Approved',  activeColor: 'var(--accent-teal)' },
  { key: 'published', label: 'Published', activeColor: 'var(--status-success)' },
]

export function ContentPipeline({
  draft,
  review,
  approved,
  published,
  isLoading,
}: ContentPipelineProps) {
  const counts = { draft, review, approved, published }
  const total = draft + review + approved + published

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
      <SectionHeader
        title="Content Pipeline"
        description={`${total} total items`}
        actions={
          <Link href="/dashboard/content">
            <button className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors font-medium">
              View all
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </Link>
        }
      />

      <div className="mt-5">
        {isLoading ? (
          <div className="flex gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24 flex-1 rounded-xl" shimmer />
            ))}
          </div>
        ) : total === 0 ? (
          <div className="flex items-center justify-center h-24 rounded-xl border border-dashed border-[var(--border)]">
            <p className="text-sm text-[var(--text-disabled)]">No content yet — AI is generating drafts</p>
          </div>
        ) : (
          <>
            {/* Desktop: horizontal stages with connectors */}
            <div className="hidden lg:flex gap-3">
              {stages.map((stage, i) => {
                const count = counts[stage.key as keyof typeof counts]
                const isActive = count > 0 && (stage.key === 'review' || stage.key === 'approved')

                return (
                  <div key={stage.key} className="flex-1 min-w-0 relative">
                    <Link href={`/dashboard/content?status=${stage.key}`}>
                      <div
                        className={cn(
                          'rounded-xl p-4 text-center transition-all duration-150 cursor-pointer',
                          'border bg-[var(--bg-surface)] border-[var(--border)]',
                          'hover:border-[var(--border-strong)] hover:shadow-md hover:-translate-y-px',
                          isActive && 'border-[var(--accent-border)] shadow-[0_0_16px_var(--accent-subtle)]'
                        )}
                      >
                        {/* Stage label */}
                        <p className="text-xs text-[var(--text-muted)] mb-2">{stage.label}</p>

                        {/* Count */}
                        <p className="text-3xl font-bold text-[var(--text-primary)] leading-none">
                          {count}
                        </p>

                        {/* Connector line */}
                        {i < stages.length - 1 && (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3">
                            <svg className="h-4 w-4 text-[var(--border)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Subtle status indicator */}
                    {count > 0 && (
                      <div className="flex justify-center mt-2">
                        <div
                          className={cn('h-1 w-8 rounded-full', isActive ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Mobile: vertical dots */}
            <div className="flex lg:hidden items-center justify-center gap-1">
              {[draft, review, approved, published].map((count, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      count > 0 ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                    )}
                  />
                  {i < 3 && <div className="h-4 w-px bg-[var(--border-subtle)]" />}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
