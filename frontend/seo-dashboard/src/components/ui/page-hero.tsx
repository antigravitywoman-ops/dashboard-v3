'use client'

import { cn, getGreeting } from '@/lib/utils'

interface PageHeroProps {
  name?: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHero({ name, subtitle, actions, className }: PageHeroProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div>
        {/* Gradient accent line */}
        <div className="h-0.5 w-12 rounded-full bg-gradient-to-r from-[#A78BFA] to-[#2DD4BF] mb-4" />

        {/* Greeting */}
        <h1 className="text-2xl font-bold text-[#FAFAFA] leading-tight">
          {getGreeting(name)}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-sm text-[#71717A] mt-1.5 leading-relaxed">{subtitle}</p>
        )}
      </div>

      {/* Actions */}
      {actions && (
        <div className="flex items-center gap-3 shrink-0 pt-1">{actions}</div>
      )}
    </div>
  )
}
