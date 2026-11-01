import { motion, useReducedMotion } from 'framer-motion'
import { createElement } from 'react'
import { cn } from '@/lib/cn'
import { EASE_LUXE } from '@/lib/motion'

interface RevealTextProps {
  text: string
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
  className?: string
  delay?: number
  /** Animate on mount (hero) instead of when scrolled into view. */
  immediate?: boolean
}

/**
 * Word-by-word masked rise. Splits on spaces only, which keeps Arabic
 * ligatures intact. Screen readers receive the full sentence once.
 */
export function RevealText({ text, as = 'h2', className, delay = 0, immediate = false }: RevealTextProps) {
  const reduce = useReducedMotion()
  const words = text.split(' ')

  if (reduce) return createElement(as, { className }, text)

  const trigger = immediate ? { animate: 'visible' } : { whileInView: 'visible', viewport: { once: true, amount: 0.6 } }

  return createElement(
    as,
    { className: cn(className), 'aria-label': text },
    <motion.span
      aria-hidden
      className="inline"
      initial="hidden"
      {...trigger}
      transition={{ staggerChildren: 0.06, delayChildren: delay }}
    >
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className="inline-block"
            variants={{
              hidden: { y: '110%', opacity: 0 },
              visible: { y: '0%', opacity: 1, transition: { duration: 1, ease: EASE_LUXE } },
            }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </motion.span>,
  )
}
