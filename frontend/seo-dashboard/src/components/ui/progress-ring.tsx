'use client'

import { cn } from '@/lib/utils'

interface ProgressRingProps {
  value: number       // 0–100
  size?: number        // px, default 80
  strokeWidth?: number // px, default 6
  label?: string       // small text below center
  sublabel?: string    // e.g. "3 of 7"
  variant?: 'default' | 'compact'
  className?: string
}

export function ProgressRing({
  value,
  size = 80,
  strokeWidth = 6,
  label,
  sublabel,
  variant = 'default',
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const center = size / 2

  // Clamp value 0–100
  const clampedValue = Math.min(100, Math.max(0, value))
  const clampedOffset = circumference - (clampedValue / 100) * circumference

  return (
    <div
      className={cn('flex flex-col items-center gap-1', className)}
      style={variant === 'compact' ? { gap: 0 } : undefined}
    >
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#2DD4BF" />
            </linearGradient>
          </defs>

          {/* Background ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#27272A"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Foreground ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="url(#ring-gradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={clampedOffset}
            style={{
              transition: 'stroke-dashoffset 800ms cubic-bezier(0.16, 1, 0.3, 1)',
              // CSS variable for animation
              ['--ring-target-offset' as string]: clampedOffset,
            }}
          />
        </svg>

        {/* Center content */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ gap: variant === 'compact' ? 0 : 2 }}
        >
          <span
            className="font-bold text-[#FAFAFA] leading-none"
            style={{ fontSize: variant === 'compact' ? size * 0.22 : size * 0.26 }}
          >
            {clampedValue}
            <span style={{ fontSize: '0.5em', color: '#71717A', fontWeight: 400 }}>%</span>
          </span>
          {variant !== 'compact' && sublabel && (
            <span className="text-[10px] text-[#71717A] leading-none">{sublabel}</span>
          )}
        </div>
      </div>

      {variant !== 'compact' && (
        <div className="text-center">
          {label && (
            <p className="text-xs font-medium text-[#A1A1AA]">{label}</p>
          )}
          {sublabel && (
            <p className="text-[10px] text-[#52525B] mt-0.5">{sublabel}</p>
          )}
        </div>
      )}
    </div>
  )
}
