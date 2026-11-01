import type { Transition, Variants } from 'framer-motion'

/** Shared motion language: slow, soft, editorial. */
export const EASE_LUXE = [0.22, 1, 0.36, 1] as const
export const EASE_SILK = [0.65, 0, 0.35, 1] as const

export const DURATION = { fast: 0.35, base: 0.7, slow: 1.1, cinematic: 1.6 } as const

export const transitionLuxe = (delay = 0, duration: number = DURATION.base): Transition => ({
  duration,
  delay,
  ease: EASE_LUXE,
})

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: transitionLuxe() },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitionLuxe(0, DURATION.slow) },
}

export const stagger = (staggerChildren = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren, delayChildren } },
})

/** Image unveil: a curtain lifts while the picture settles from a slight zoom. */
export const imageReveal: Variants = {
  hidden: { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.12 },
  visible: {
    clipPath: 'inset(0% 0% 0% 0%)',
    scale: 1,
    transition: { duration: DURATION.cinematic, ease: EASE_LUXE },
  },
}

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_LUXE } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.3, ease: EASE_SILK } },
}
