'use client'

import { cn } from '@/lib/utils'
import { Button } from './button'

// SVG Icons matching the design system aesthetic
const icons = {
  content: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="8" width="40" height="48" rx="6" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1.5"/>
      <rect x="20" y="18" width="24" height="2.5" rx="1.25" fill="var(--border)"/>
      <rect x="20" y="24" width="18" height="2" rx="1" fill="var(--border)"/>
      <rect x="20" y="29" width="22" height="2" rx="1" fill="var(--border)"/>
      <rect x="20" y="34" width="14" height="2" rx="1" fill="var(--border)"/>
      <circle cx="44" cy="46" r="12" fill="var(--accent-hover)" opacity="0.15"/>
      <circle cx="44" cy="46" r="8" fill="var(--accent)" opacity="0.3"/>
      <path d="M40 46h8M44 42v8" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  reports: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="12" width="48" height="40" rx="6" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1.5"/>
      <rect x="16" y="22" width="8" height="18" rx="2" fill="var(--accent)" opacity="0.4"/>
      <rect x="28" y="26" width="8" height="14" rx="2" fill="var(--accent-teal)" opacity="0.4"/>
      <rect x="40" y="18" width="8" height="22" rx="2" fill="var(--accent)" opacity="0.25"/>
      <circle cx="44" cy="44" r="10" fill="var(--accent-hover)" opacity="0.1"/>
      <circle cx="44" cy="44" r="6" fill="var(--accent-teal)" opacity="0.2"/>
    </svg>
  ),
  team: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="24" r="10" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1.5"/>
      <path d="M16 48c0-8.837 7.163-16 16-16s16 7.163 16 16" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="48" cy="26" r="7" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1.5"/>
      <path d="M56 46c0-4.418-2.462-8.27-6.12-10.23" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="16" cy="26" r="7" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1.5"/>
      <path d="M8 46c0-4.418 2.462-8.27 6.12-10.23" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="52" cy="16" r="8" fill="var(--accent-hover)" opacity="0.2"/>
      <circle cx="52" cy="16" r="5" fill="var(--accent)" opacity="0.4"/>
      <path d="M50 16h4M52 14v4" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  tasks: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="10" width="40" height="44" rx="6" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1.5"/>
      <rect x="20" y="18" width="4" height="4" rx="1" stroke="var(--border)" strokeWidth="1.5"/>
      <rect x="20" y="26" width="4" height="4" rx="1" stroke="var(--border)" strokeWidth="1.5"/>
      <rect x="20" y="34" width="4" height="4" rx="1" stroke="var(--border)" strokeWidth="1.5"/>
      <rect x="28" y="19" width="18" height="2" rx="1" fill="var(--border)"/>
      <rect x="28" y="27" width="14" height="2" rx="1" fill="var(--border)"/>
      <rect x="28" y="35" width="16" height="2" rx="1" fill="var(--border)"/>
      <circle cx="50" cy="50" r="10" fill="var(--accent-hover)" opacity="0.15"/>
      <circle cx="50" cy="50" r="6" fill="var(--accent)" opacity="0.3"/>
      <path d="M47 50l2 2 4-4" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  settings: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="20" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1.5"/>
      <circle cx="32" cy="32" r="6" fill="var(--border)"/>
      <path d="M32 12v6M32 46v6M12 32h6M46 32h6M18.1 18.1l4.2 4.2M41.7 41.7l4.2 4.2M18.1 45.9l4.2-4.2M41.7 22.3l4.2-4.2" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="50" cy="46" r="8" fill="var(--accent-hover)" opacity="0.15"/>
      <circle cx="50" cy="46" r="5" fill="var(--accent-teal)" opacity="0.3"/>
    </svg>
  ),
  generic: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="12" width="40" height="40" rx="8" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1.5"/>
      <circle cx="32" cy="32" r="12" fill="var(--border)" opacity="0.5"/>
      <path d="M26 32h12M32 26v12" stroke="var(--text-disabled)" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="48" cy="48" r="10" fill="var(--accent-hover)" opacity="0.1"/>
      <circle cx="48" cy="48" r="6" fill="var(--accent)" opacity="0.2"/>
    </svg>
  ),
}

type EmptyStateVariant = keyof typeof icons

interface EmptyStateProps {
  variant?: EmptyStateVariant
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  variant = 'generic',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {/* Themed illustration */}
      <div className="mb-5 relative">
        {icons[variant]}
        {/* Subtle glow */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-[var(--accent-subtle)] blur-xl" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-[var(--text-secondary)] mb-1.5">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-[var(--text-disabled)] max-w-xs leading-relaxed">{description}</p>
      )}

      {/* Action */}
      {action && (
        <Button
          variant="indigo"
          size="sm"
          className="mt-5 gap-1.5"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
