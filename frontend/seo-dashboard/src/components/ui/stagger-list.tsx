'use client'

import { cn } from '@/lib/utils'

interface StaggerListProps {
  children: React.ReactNode[]
  className?: string
  itemClassName?: string
  staggerDelay?: number
  initialDelay?: number
}

export function StaggerList({
  children,
  className,
  itemClassName,
}: StaggerListProps) {
  const childArray = Array.isArray(children) ? children : [children]

  return (
    <div className={cn('space-y-0', className)}>
      {childArray.map((child, index) => (
        <div
          key={index}
          className={cn('animate-slide-up', itemClassName)}
          style={{ animationDelay: `${index * 40}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  )
}

export function AnimatedItem({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <div
      className={cn('animate-fade-in', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

export function PageSection({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <div
      className={cn('animate-fade-in', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
