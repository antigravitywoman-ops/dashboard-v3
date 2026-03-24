'use client'

import * as React from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Zap } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'purple'

interface Toast {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  toast: (props: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | null>(null)

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToasterProvider')
  return ctx
}

const variantStyles: Record<ToastVariant, { bar: string; icon: string; text: string }> = {
  success: {
    bar:  'bg-[#22C55E]',
    icon: 'text-[#22C55E]',
    text: 'text-[#FAFAFA]',
  },
  error: {
    bar:  'bg-[#EF4444]',
    icon: 'text-[#EF4444]',
    text: 'text-[#FAFAFA]',
  },
  warning: {
    bar:  'bg-[#F59E0B]',
    icon: 'text-[#F59E0B]',
    text: 'text-[#FAFAFA]',
  },
  info: {
    bar:  'bg-[#3B82F6]',
    icon: 'text-[#3B82F6]',
    text: 'text-[#FAFAFA]',
  },
  purple: {
    bar:  'bg-[#A78BFA]',
    icon: 'text-[#A78BFA]',
    text: 'text-[#FAFAFA]',
  },
}

const iconMap: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
  purple:  Zap,
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const toast = React.useCallback((props: Omit<Toast, 'id'>) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { ...props, id }])

    const duration = props.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  )
}

function ToastContainer({
  toasts,
  dismiss,
}: {
  toasts: Toast[]
  dismiss: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const Icon = iconMap[toast.variant]
        const styles = variantStyles[toast.variant]
        const duration = toast.duration ?? 5000

        return (
          <div
            key={toast.id}
            className="relative flex items-start gap-3 rounded-xl border border-[#3F3F46] bg-[#222225] shadow-xl shadow-black/30 overflow-hidden pointer-events-auto animate-slide-in-right"
            style={{ minWidth: 320 }}
          >
            {/* Left accent bar */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-[3px] ${styles.bar}`}
            />

            {/* Progress bar */}
            {duration > 0 && (
              <div
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10"
                style={{ transformOrigin: 'left center' }}
              >
                <div
                  className={`h-full ${styles.bar.replace('bg-', 'bg-')}`}
                  style={{
                    animation: `toast-progress ${duration}ms linear forwards`,
                  }}
                />
              </div>
            )}

            {/* Content */}
            <div className="pl-4 pr-4 pt-4 pb-4 flex items-start gap-3 w-full">
              <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${styles.icon}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${styles.text}`}>{toast.title}</p>
                {toast.description && (
                  <p className="text-xs text-[#71717A] mt-0.5 leading-relaxed">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="shrink-0 text-[#71717A] hover:text-[#A1A1AA] transition-colors mt-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
