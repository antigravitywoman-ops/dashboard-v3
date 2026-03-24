'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onOpenChange(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => onOpenChange(false)}
      />
      {/* Content */}
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative bg-[#222225] border border-[#3F3F46] rounded-2xl shadow-xl shadow-black/50 w-full max-h-[90vh] overflow-hidden pointer-events-auto animate-slide-up"
          onClick={e => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-1.5 p-6 pb-4', className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-lg font-semibold text-[#FAFAFA] leading-snug', className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-[#71717A]', className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-end gap-3 p-6 pt-4', className)}
      {...props}
    />
  )
}

function DialogClose({
  onClose,
  className,
}: {
  onClose: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClose}
      className={cn(
        'absolute top-4 right-4 p-1.5 rounded-lg text-[#71717A] hover:text-[#A1A1AA] hover:bg-[#27272A] transition-colors',
        className
      )}
    >
      <X className="h-4 w-4" />
    </button>
  )
}

// Slide-over panel variant (from right side)
interface SlideOverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  width?: 'sm' | 'md' | 'lg' | 'xl'
}

function SlideOver({
  open,
  onOpenChange,
  title,
  description,
  children,
  width = 'lg',
}: SlideOverProps) {
  const widthMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  React.useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onOpenChange(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed inset-y-0 right-0 flex">
        <div
          className={cn(
            'relative bg-[#222225] border-l border-[#3F3F46] shadow-xl shadow-black/50 h-full w-full overflow-hidden pointer-events-auto animate-slide-in-right flex flex-col',
            widthMap[width]
          )}
          onClick={e => e.stopPropagation()}
        >
          {title && (
            <div className="flex items-start justify-between p-6 pb-4 border-b border-[#27272A]">
              <div>
                <h2 className="text-lg font-semibold text-[#FAFAFA]">{title}</h2>
                {description && (
                  <p className="text-sm text-[#71717A] mt-0.5">{description}</p>
                )}
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-1.5 rounded-lg text-[#71717A] hover:text-[#A1A1AA] hover:bg-[#27272A] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </div>
      </div>
    </div>
  )
}

export {
  Dialog,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
  SlideOver,
}
