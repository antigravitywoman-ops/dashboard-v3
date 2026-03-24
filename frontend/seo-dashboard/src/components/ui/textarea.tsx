import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border bg-[#111113] text-[#FAFAFA] text-sm',
          'placeholder:text-[#71717A]',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent focus:ring-offset-2 focus:ring-offset-[#0A0A0B]',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#18181B]',
          'resize-y',
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
Textarea.displayName = 'Textarea'

export { Textarea }
