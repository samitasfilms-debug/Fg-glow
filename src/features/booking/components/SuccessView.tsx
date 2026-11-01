import { motion, useReducedMotion } from 'framer-motion'
import { Clock3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, ButtonLink } from '@/components/ui/Button'
import { useLocalePath } from '@/hooks/useLocalePath'
import { useLocale } from '@/i18n/locale-context'
import { formatLongDate, formatTime } from '@/lib/datetime'
import { formatDuration, formatPrice } from '@/lib/format'
import { EASE_LUXE } from '@/lib/motion'
import type { BookingResult } from '../api'

interface Props {
  result: BookingResult
  name: string
  phone: string
  onRestart: () => void
}

/** Shown after the request is stored. Makes it explicit that it is NOT confirmed yet. */
export function SuccessView({ result, name, phone, onRestart }: Props) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const to = useLocalePath()
  const reduce = useReducedMotion()

  return (
    <motion.section
      aria-labelledby="booking-success-title"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE_LUXE }}
      className="mx-auto flex max-w-xl flex-col items-center gap-6 text-center"
      data-testid="booking-success"
    >
      <svg viewBox="0 0 64 64" className="size-20 text-gold" aria-hidden>
        <motion.circle
          cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="1.5"
          initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: EASE_LUXE }}
        />
        <motion.path
          d="M20 33 l8 8 l16 -18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.7, ease: EASE_LUXE }}
        />
      </svg>

      <div className="flex flex-col gap-3">
        <h2 id="booking-success-title" className="text-display-md" tabIndex={-1}>
          {t('booking.success.title')}
        </h2>
        <p className="text-cocoa-soft">{t('booking.success.body', { name })}</p>
      </div>

      <div className="w-full rounded-card border border-line bg-snow p-5 shadow-soft">
        <p className="eyebrow">{t('booking.success.reference')}</p>
        <p className="mt-1 font-display text-3xl tracking-wider text-cocoa" dir="ltr" data-testid="booking-reference">
          {result.reference}
        </p>
        <p className="mt-1 text-xs text-cocoa-muted">{t('booking.success.keepReference')}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
          <div className="col-span-2">
            <dt className="sr-only">{t('booking.review.date')}</dt>
            <dd className="text-cocoa first-letter:uppercase">
              {formatLongDate(result.starts_at, locale)} · <bdi>{formatTime(result.starts_at, locale)}</bdi>
            </dd>
          </div>
          <div>
            <dt className="text-cocoa-muted">{t('booking.summary.duration')}</dt>
            <dd className="text-cocoa">{formatDuration(result.total_duration_minutes, locale)}</dd>
          </div>
          <div>
            <dt className="text-cocoa-muted">{t('booking.summary.total')}</dt>
            <dd className="text-cocoa">{formatPrice(result.total_price_dzd, locale)}</dd>
          </div>
        </dl>
      </div>

      <div className="flex w-full items-start gap-3 rounded-card bg-blush-100/70 p-5 text-start" role="status">
        <Clock3 aria-hidden className="mt-0.5 size-5 shrink-0 text-gold-ink" strokeWidth={1.5} />
        <div className="flex flex-col gap-1">
          <p className="font-medium text-cocoa">{t('booking.success.pendingTitle')}</p>
          <p className="text-sm text-cocoa-soft">{t('booking.success.pendingBody', { phone })}</p>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink to={to('home')} variant="primary">
          {t('actions.backHome')}
        </ButtonLink>
        <Button variant="outline" onClick={onRestart}>
          {t('booking.nav.restart')}
        </Button>
      </div>
    </motion.section>
  )
}
