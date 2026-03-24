import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean
}

function Skeleton({ className, shimmer = false, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md',
        shimmer
          ? 'animate-shimmer bg-gradient-to-r from-[#18181B] via-[#3F3F46] to-[#18181B] bg-[length:200%_100%]'
          : 'animate-pulse bg-[#222225]',
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
