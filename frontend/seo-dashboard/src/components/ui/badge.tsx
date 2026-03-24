import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors select-none',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--accent-subtle)] text-[var(--accent)]',
        secondary:
          'bg-[var(--bg-elevated)] text-[var(--text-secondary)]',
        destructive:
          'bg-[var(--status-error-bg)] text-[var(--status-error)]',
        outline:
          'border border-[var(--border)] text-[var(--text-secondary)] bg-transparent',
        success:
          'bg-[var(--status-success-bg)] text-[var(--status-success)]',
        warning:
          'bg-[var(--status-warning-bg)] text-[var(--status-warning)]',
        error:
          'bg-[var(--status-error-bg)] text-[var(--status-error)]',
        info:
          'bg-[var(--status-info-bg)] text-[var(--status-info)]',
        // Indigo variants
        indigo:
          'bg-[var(--accent-subtle)] text-[var(--accent)]',
        teal:
          'bg-[var(--accent-teal-subtle)] text-[var(--accent-teal)]',
        // Legacy aliases
        purple: 'bg-[var(--accent-subtle)] text-[var(--accent)]',
        ghost:
          'bg-transparent text-[var(--text-muted)]',
      },
      size: {
        sm:  'px-2 py-0 text-[10px]',
        md:  'px-2.5 py-0.5 text-xs',
        lg:  'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
