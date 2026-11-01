import type { ReactNode } from 'react'
import { Reveal } from '@/components/motion/Reveal'
import { RevealText } from '@/components/motion/RevealText'
import { cn } from '@/lib/cn'

interface SectionHeadingProps {
  eyebrow?: string
  title: string
  lead?: ReactNode
  align?: 'start' | 'center'
  as?: 'h1' | 'h2'
  tone?: 'dark' | 'light'
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'start',
  as = 'h2',
  tone = 'dark',
  className,
}: SectionHeadingProps) {
  const center = align === 'center'
  return (
    <header className={cn('flex flex-col gap-5', center && 'items-center text-center', className)}>
      {eyebrow ? (
        <Reveal as="span" className={cn('eyebrow flex items-center gap-3', tone === 'light' && 'text-gold-soft')}>
          <span aria-hidden className="h-px w-8 bg-current opacity-60" />
          {eyebrow}
        </Reveal>
      ) : null}
      <RevealText
        as={as}
        text={title}
        className={cn(
          as === 'h1' ? 'text-display-lg' : 'text-display-md',
          'max-w-[18ch]',
          tone === 'light' && 'text-ivory',
        )}
      />
      {lead ? (
        <Reveal delay={0.15}>
          <p className={cn('text-lead max-w-xl text-cocoa-soft', tone === 'light' && 'text-ivory/75', center && 'mx-auto')}>
            {lead}
          </p>
        </Reveal>
      ) : null}
    </header>
  )
}
