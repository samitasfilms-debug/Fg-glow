import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'ivory' | 'white' | 'blush' | 'sand' | 'cocoa'

const tones: Record<Tone, string> = {
  ivory: 'bg-ivory',
  white: 'bg-snow',
  blush: 'bg-blush-50',
  sand: 'bg-ivory-200',
  cocoa: 'bg-cocoa text-ivory',
}

interface SectionProps extends HTMLAttributes<HTMLElement> {
  tone?: Tone
  spacing?: 'md' | 'lg' | 'none'
}

/** Vertical rhythm + background tone for every page section. */
export function Section({ tone = 'ivory', spacing = 'lg', className, ...rest }: SectionProps) {
  return (
    <section
      className={cn(
        tones[tone],
        spacing === 'lg' && 'py-24 md:py-32 lg:py-40',
        spacing === 'md' && 'py-16 md:py-24',
        'relative',
        className,
      )}
      {...rest}
    />
  )
}
