'use client'

import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface SectionHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  actions?: React.ReactNode
  className?: string
  variant?: 'default' | 'bordered'
}

export function SectionHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
  variant = 'default',
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4',
        variant === 'bordered' && 'pb-4 border-b border-[#27272A]',
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {Icon && (
          <div className="p-1.5 rounded-lg bg-[rgba(167,139,250,0.12)] shrink-0">
            <Icon className="h-4 w-4 text-[#A78BFA]" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[#FAFAFA] leading-snug">{title}</h2>
          {description && (
            <p className="text-sm text-[#71717A] mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  )
}
