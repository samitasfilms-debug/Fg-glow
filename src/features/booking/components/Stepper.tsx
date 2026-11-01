import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { EASE_LUXE } from '@/lib/motion'

import { STEP_KEYS } from '../step-keys'

/** Progress indicator. Completed steps are clickable to go back. */
export function Stepper({ current, onGoTo }: { current: number; onGoTo: (step: number) => void }) {
  const { t } = useTranslation()
  return (
    <nav aria-label={t('booking.stepOf', { current: current + 1, total: STEP_KEYS.length })}>
      <p className="mb-4 text-sm text-cocoa-muted md:hidden">
        {t('booking.stepOf', { current: current + 1, total: STEP_KEYS.length })} · <span className="text-cocoa">{t(`booking.steps.${STEP_KEYS[current]}`)}</span>
      </p>
      <ol className="flex items-center gap-2 md:gap-3">
        {STEP_KEYS.map((key, i) => {
          const done = i < current
          const active = i === current
          return (
            <li key={key} className="flex flex-1 items-center gap-2 md:gap-3">
              <button
                type="button"
                disabled={!done}
                onClick={() => onGoTo(i)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'group flex min-h-11 items-center gap-3 rounded-full text-start transition-colors',
                  done && 'cursor-pointer',
                  !done && 'cursor-default',
                )}
              >
                <span
                  className={cn(
                    'relative inline-flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors duration-500',
                    active && 'border-cocoa bg-cocoa text-ivory',
                    done && 'border-gold bg-gold text-snow group-hover:bg-gold-ink',
                    !active && !done && 'border-line-strong text-cocoa-muted',
                  )}
                >
                  {done ? <Check className="size-4" strokeWidth={2} aria-hidden /> : i + 1}
                  {active ? (
                    <motion.span
                      layoutId="step-ring"
                      className="absolute -inset-1 rounded-full border border-gold/50"
                      transition={{ duration: 0.6, ease: EASE_LUXE }}
                    />
                  ) : null}
                </span>
                <span className={cn('hidden text-sm md:inline', active ? 'font-medium text-cocoa' : 'text-cocoa-soft')}>
                  {t(`booking.steps.${key}`)}
                </span>
              </button>
              {i < STEP_KEYS.length - 1 ? (
                <span aria-hidden className="relative h-px flex-1 overflow-hidden bg-line-strong">
                  <motion.span
                    className="absolute inset-0 origin-left bg-gold rtl:origin-right"
                    initial={false}
                    animate={{ scaleX: done ? 1 : 0 }}
                    transition={{ duration: 0.7, ease: EASE_LUXE }}
                  />
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
