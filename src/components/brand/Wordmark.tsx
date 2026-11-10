import { site } from '@/config/site'
import { cn } from '@/lib/cn'
import { ScriptMonogram } from './ScriptMonogram'

interface WordmarkProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'hero'
  tone?: 'dark' | 'light'
}

const sizes = {
  sm: 'text-xl',
  md: 'text-2xl md:text-[1.7rem]',
  lg: 'text-5xl md:text-6xl',
  hero: 'text-display-xl',
}

/**
 * Typographic logo: calligraphic "FJ" monogram + "GLOW" in the display serif. When an official logo is provided, set
 * `site.logoUrl` (or replace this component) — every usage updates at once.
 * The wordmark is Latin, so it keeps Cormorant Garamond even in Arabic pages.
 */
export function Wordmark({ className, size = 'md', tone = 'dark' }: WordmarkProps) {
  if (site.logoUrl) {
    return <img src={site.logoUrl} alt={site.name} className={cn('h-8 w-auto', className)} />
  }
  return (
    <span
      dir="ltr"
      translate="no"
      className={cn(
        'inline-flex items-baseline gap-[0.28em] leading-none whitespace-nowrap',
        tone === 'light' ? 'text-ivory' : 'text-cocoa',
        sizes[size],
        className,
      )}
      style={{ fontFamily: 'var(--font-display)' }}
    >
      <span className="sr-only">FJ</span>
      {/* 1.5 × the script's 1em; shifted down by its descent so FJ and GLOW share a baseline */}
      <ScriptMonogram className="relative top-[0.35em] h-[1.25em] w-auto shrink-0" />
      <span aria-hidden className="relative -top-[0.32em] size-[0.16em] shrink-0 rotate-45 bg-gold" />
      <span className="font-light tracking-[var(--tracking-wordmark)]">GLOW</span>
    </span>
  )
}
