'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function OverviewSkeletons() {
  return (
    <div className="space-y-8">
      {/* Greeting skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-0.5 w-12 rounded-full" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* 4-Metric Grid skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl bg-[#18181B] border border-[#27272A] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            </div>
          </div>
        ))}
      </div>

      {/* Phase + Focus skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl bg-[#18181B] border border-[#27272A] p-5">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-2 flex-1 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>

        <div className="rounded-xl bg-[#18181B] border border-[#27272A] p-5">
          <Skeleton className="h-4 w-32 mb-4" />
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-4 w-full" shimmer />
            ))}
          </div>
        </div>
      </div>

      {/* Content Pipeline skeleton */}
      <div className="rounded-xl bg-[#18181B] border border-[#27272A] p-5">
        <div className="flex items-center justify-between mb-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 flex-1 rounded-xl" shimmer />
          ))}
        </div>
      </div>

      {/* Activity + Metrics skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Activity Feed */}
        <div className="rounded-xl bg-[#18181B] border border-[#27272A] p-5">
          <Skeleton className="h-4 w-32 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-2 w-2 rounded-full shrink-0 mt-1" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-3/4" shimmer />
                  <Skeleton className="h-2 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Success Metrics */}
        <div className="rounded-xl bg-[#18181B] border border-[#27272A] p-5">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded-full shrink-0" shimmer />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-2/3" shimmer />
                  <Skeleton className="h-2 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Status skeleton */}
      <div className="flex items-center gap-6 px-4 py-3 bg-[#111113] border border-[#27272A] rounded-xl">
        <div className="flex items-center gap-2">
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-3 w-px hidden sm:block" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-3 w-px hidden sm:block" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  )
}
