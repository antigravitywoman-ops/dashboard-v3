'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionHeader } from '@/components/ui/section-header'
import { updatePlanMetrics } from '@/lib/api'
import { useCompany } from '@/context/company-context'
import { useToast } from '@/components/ui/toaster'
import type { PlanMetric } from '@/lib/api'
import { CheckCircle2, Circle } from 'lucide-react'

// Lightweight deep-equality check (keys + values, no JSON overhead)
function isDeepEqual(a: Record<string, PlanMetric>, b: Record<string, PlanMetric>): boolean {
  const aKeys = Object.keys(a)
  if (aKeys.length !== Object.keys(b).length) return false
  return aKeys.every(k => {
    const ak = a[k], bk = b[k]
    return ak && bk && ak.done === bk.done && ak.current === bk.current && ak.target === bk.target
  })
}

interface SuccessMetricsPanelProps {
  metrics: Record<string, PlanMetric>
  isLoading?: boolean
}

export function SuccessMetricsPanel({ metrics, isLoading }: SuccessMetricsPanelProps) {
  const router = useRouter()
  const { currentCompany } = useCompany()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Local state for optimistic updates
  const [localMetrics, setLocalMetrics] = useState<Record<string, PlanMetric>>(metrics)
  // Keep a ref of the latest metrics for use inside mutation closures
  const metricsRef = useRef(metrics)
  metricsRef.current = metrics

  // Sync when external metrics prop changes (e.g., after server refetch)
  useEffect(() => {
    if (!isDeepEqual(localMetrics, metrics)) {
      setLocalMetrics(metrics)
    }
  }, [metrics]) // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation({
    mutationFn: async ({ key, done }: { key: string; done: boolean }) => {
      // Snapshot the latest state at mutation time (avoid stale closure)
      const snapshot = localMetrics
      const updated = {
        ...snapshot,
        [key]: { ...snapshot[key], done },
      }
      return updatePlanMetrics(currentCompany!.slug, updated)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans', currentCompany?.slug] })
      toast({ title: 'Metric updated', variant: 'success' })
    },
    onError: () => {
      toast({ title: 'Failed to update metric', variant: 'error' })
      setLocalMetrics(metricsRef.current)
    },
  })

  const handleToggle = (key: string) => {
    const current = localMetrics[key]
    if (!current) return

    // Optimistic update
    setLocalMetrics(prev => ({
      ...prev,
      [key]: { ...prev[key], done: !prev[key].done },
    }))

    mutation.mutate({ key, done: !current.done })
  }

  const metricEntries = Object.entries(localMetrics ?? {})

  return (
    <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-5">
      <SectionHeader
        title="Success Metrics"
        description="Track progress against weekly goals"
        actions={
          <button
            onClick={() => router.push('/dashboard/settings?tab=plan')}
            className="text-xs text-[#A78BFA] hover:text-[#7C3AED] transition-colors font-medium"
          >
            Edit targets →
          </button>
        }
        className="mb-4"
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded-full shrink-0" shimmer />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-2/3" shimmer />
                <Skeleton className="h-2 w-1/3" shimmer />
              </div>
            </div>
          ))}
        </div>
      ) : metricEntries.length === 0 ? (
        <div className="flex items-center justify-center h-24">
          <p className="text-sm text-[#52525B]">No success metrics configured</p>
        </div>
      ) : (
        <div className="space-y-2">
          {metricEntries.map(([key, metric]) => {
            const isDone = metric.done ?? false
            const progress = metric.current && metric.target && metric.target !== '—'
              ? `${metric.current} / ${metric.target}`
              : null

            return (
              <div
                key={key}
                onClick={() => handleToggle(key)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer',
                  isDone
                    ? 'bg-[rgba(34,197,94,0.08)] hover:bg-[rgba(34,197,94,0.12)]'
                    : 'hover:bg-[#222225]'
                )}
              >
                {/* Checkbox */}
                <div className="shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-[#22C55E]" />
                  ) : (
                    <Circle className="h-5 w-5 text-[#52525B] hover:text-[#71717A]" />
                  )}
                </div>

                {/* Label + progress */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm',
                    isDone ? 'text-[#22C55E] line-through opacity-70' : 'text-[#A1A1AA]'
                  )}>
                    {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </p>
                  {progress && (
                    <p className="text-xs text-[#52525B] mt-0.5">{progress}</p>
                  )}
                </div>

                {/* Status badge */}
                {isDone && (
                  <span className="text-[10px] font-medium text-[#22C55E] bg-[rgba(34,197,94,0.12)] px-2 py-0.5 rounded-full">
                    Done
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
