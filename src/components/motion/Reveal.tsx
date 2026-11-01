import { motion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'
import { fadeUp } from '@/lib/motion'

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  variants?: Variants
  as?: 'div' | 'section' | 'li' | 'article' | 'header' | 'span'
  /** Fraction of the element that must be visible before it animates. */
  amount?: number
}

/**
 * Scroll-triggered reveal. Plays once. Reduced-motion users get the final
 * state immediately thanks to the global <MotionConfig reducedMotion="user">.
 */
export function Reveal({ children, className, delay = 0, variants = fadeUp, as = 'div', amount = 0.25 }: RevealProps) {
  const Component = motion[as]
  const visible = variants.visible
  const resolved: Variants =
    delay && visible && typeof visible === 'object'
      ? { ...variants, visible: { ...visible, transition: { ...(visible.transition ?? {}), delay } } }
      : variants
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={resolved}
    >
      {children}
    </Component>
  )
}
