import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Ornament } from './Ornament'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
  tone?: 'dark' | 'light'
}

export function EmptyState({ icon, title, description, action, className, tone = 'dark' }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-4 rounded-frame border border-dashed px-6 py-14 text-center md:py-20',
        tone === 'dark' ? 'border-line-strong bg-snow/60' : 'border-ivory/20 bg-ivory/5 text-ivory',
        className,
      )}
    >
      {icon ? <div className={cn('text-gold', tone === 'light' && 'text-gold-soft')}>{icon}</div> : <Ornament />}
      <p className={cn('font-display text-2xl md:text-3xl', tone === 'light' ? 'text-ivory' : 'text-cocoa')}>{title}</p>
      {description ? <p className={cn('max-w-md text-sm', tone === 'light' ? 'text-ivory/70' : 'text-cocoa-soft')}>{description}</p> : null}
      {action}
    </div>
  )
}
