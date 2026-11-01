import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'gold' | 'blush' | 'success' | 'warning' | 'danger' | 'muted'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-cocoa/5 text-cocoa border-cocoa/10',
  gold: 'bg-gold/10 text-gold-ink border-gold/30',
  blush: 'bg-blush-100 text-cocoa border-blush',
  success: 'bg-success/10 text-success border-success/25',
  warning: 'bg-warning/10 text-warning border-warning/25',
  danger: 'bg-danger/10 text-danger border-danger/25',
  muted: 'bg-transparent text-cocoa-muted border-line-strong border-dashed',
}

export function Badge({ tone = 'neutral', className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium', tones[tone], className)}
      {...rest}
    />
  )
}
