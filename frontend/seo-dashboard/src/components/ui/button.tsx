import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--accent)] text-white font-semibold hover:bg-[var(--accent-hover)] active:scale-[0.98] shadow-sm',
        destructive:
          'bg-[var(--status-error)] text-white font-semibold hover:bg-[#DC2626] active:scale-[0.98]',
        outline:
          'border border-[var(--border)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-strong)] active:scale-[0.98]',
        secondary:
          'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:scale-[0.98]',
        ghost:
          'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] active:scale-[0.98]',
        link:
          'text-[var(--accent)] underline-offset-4 hover:underline bg-transparent',
        // Primary action — Indigo
        indigo:
          'bg-[var(--accent)] text-white font-semibold hover:bg-[var(--accent-hover)] active:scale-[0.98] shadow-sm hover:shadow-md',
        // Ghost on indigo surface
        'indigo-ghost':
          'bg-transparent text-[var(--accent)] hover:bg-[var(--accent-subtle)] active:scale-[0.98]',
        // Teal variant
        teal:
          'bg-[var(--accent-teal)] text-[var(--bg-primary)] font-semibold hover:bg-[var(--accent-teal-hover)] active:scale-[0.98] shadow-sm',
        'teal-ghost':
          'bg-transparent text-[var(--accent-teal)] hover:bg-[var(--accent-teal-subtle)] active:scale-[0.98]',
        // Danger variants
        'destructive-ghost':
          'bg-transparent text-[var(--status-error)] hover:bg-[var(--status-error-bg)] active:scale-[0.98]',
        'destructive-outline':
          'border border-[rgba(239,68,68,0.3)] text-[var(--status-error)] bg-transparent hover:bg-[var(--status-error-bg)] active:scale-[0.98]',
        // Legacy aliases (deprecated — use indigo/teal instead)
        purple:   'bg-[var(--accent)] text-white font-semibold hover:bg-[var(--accent-hover)] active:scale-[0.98] shadow-sm hover:shadow-md',
        'purple-ghost': 'bg-transparent text-[var(--accent)] hover:bg-[var(--accent-subtle)] active:scale-[0.98]',
      },
      size: {
        default:   'h-10 px-4 py-2',
        sm:        'h-8 px-3 py-1.5 text-xs',
        lg:        'h-12 px-6 py-3 text-base',
        icon:      'h-10 w-10 p-0',
        'icon-sm': 'h-8 w-8 p-0',
        'icon-lg': 'h-12 w-12 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
