import { site } from '@/config/site'
import { cn } from '@/lib/cn'

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
 * Temporary typographic logo. When an official logo is provided, set
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
      <span className="font-semibold tracking-[0.06em]">FG</span>
      <span aria-hidden className="relative -top-[0.32em] size-[0.16em] shrink-0 rotate-45 bg-gold" />
      <span className="font-light tracking-[var(--tracking-wordmark)]">GLOW</span>
    </span>
  )
}
