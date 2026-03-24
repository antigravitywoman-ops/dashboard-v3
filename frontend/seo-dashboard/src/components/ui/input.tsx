import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg border bg-[#111113] text-[#FAFAFA] text-sm',
          'placeholder:text-[#71717A]',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent focus:ring-offset-2 focus:ring-offset-[#0A0A0B]',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#18181B]',
          error
            ? 'border-[#EF4444] focus:ring-[#EF4444]'
            : 'border-[#3F3F46] hover:border-[#52525B]',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
