import { cn } from '@/lib/utils'

interface IRadiantPulse {
  className?: string
}

export const RadiantPulse = ({ className }: IRadiantPulse) => {
  return (
    <div
      aria-hidden='true'
      className={cn(
        'glow-pulse absolute left-1/2 top-1/2 -z-10 size-48 sm:size-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-red blur-3xl',
        className
      )}
    />
  )
}
