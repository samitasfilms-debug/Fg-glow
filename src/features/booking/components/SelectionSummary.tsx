import { Clock3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocale } from '@/i18n/locale-context'
import { formatDuration } from '@/lib/format'
import { TotalPrice } from './Price'
import { cn } from '@/lib/cn'

/** Running total (price + duration), computed from database values. */
export function SelectionSummary({
  count,
  totalPrice,
  totalDuration,
  priceIsMinimum = false,
  hasQuote = false,
  className,
}: {
  count: number
  totalPrice: number
  totalDuration: number
  priceIsMinimum?: boolean
  hasQuote?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-x-6 gap-y-1', className)} aria-live="polite">
      <span className="text-sm text-cocoa-soft">{t('booking.summary.selection', { count })}</span>
      <span className="flex items-center gap-4">
        <span className="inline-flex items-center gap-1.5 text-sm text-cocoa-soft">
          <Clock3 aria-hidden className="size-4" strokeWidth={1.5} />
          <span className="sr-only">{t('booking.summary.duration')}</span>
          <span data-testid="total-duration">{formatDuration(totalDuration, locale)}</span>
        </span>
        <span className="font-display text-2xl text-cocoa" data-testid="total-price">
          <span className="sr-only">{t('booking.summary.total')} </span>
          <TotalPrice amount={totalPrice} isMinimum={priceIsMinimum} hasQuote={hasQuote} prefixClassName="text-sm" />
        </span>
      </span>
    </div>
  )
}
