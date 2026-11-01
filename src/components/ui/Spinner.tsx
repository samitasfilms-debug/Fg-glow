import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

/** Elegant loader: three gold beads breathing in sequence. */
export function Spinner({ className, label }: { className?: string; label?: string }) {
  const { t } = useTranslation()
  return (
    <span role="status" className={cn('inline-flex items-center gap-1.5', className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden
          className="size-1.5 animate-pulse rounded-full bg-gold motion-reduce:animate-none"
          style={{ animationDelay: `${i * 180}ms` }}
        />
      ))}
      <span className="sr-only">{label ?? t('states.loading')}</span>
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-soft bg-blush-100/70 motion-reduce:animate-none', className)} />
}
