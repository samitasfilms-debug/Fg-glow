import { useTranslation } from 'react-i18next'
import type { PriceMode } from '@/config/services'
import { useLocale } from '@/i18n/locale-context'
import { cn } from '@/lib/cn'
import { formatPrice } from '@/lib/format'

/** Price of one service: "3 500 DA", "à partir de 1 000 DA" or "Sur devis". */
export function ServicePrice({ amount, mode = 'fixed' }: { amount: number; mode?: PriceMode }) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  if (mode === 'quote') return <>{t('booking.price.quote')}</>
  return (
    <>
      {mode === 'from' ? `${t('booking.options.from')} ` : ''}
      {formatPrice(amount, locale)}
    </>
  )
}

/**
 * A total computed by the database. "à partir de" when a price in it is a
 * minimum; a note when it contains a service priced on quote (not counted).
 */
export function TotalPrice({
  amount,
  isMinimum = false,
  hasQuote = false,
  prefixClassName,
}: {
  amount: number
  isMinimum?: boolean
  hasQuote?: boolean
  prefixClassName?: string
}) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  if (hasQuote && amount === 0) return <>{t('booking.price.quote')}</>
  return (
    <>
      {isMinimum ? <span className={cn('me-1 text-cocoa-soft', prefixClassName)}>{t('booking.options.from')}</span> : null}
      {isMinimum ? ' ' : null}
      {formatPrice(amount, locale)}
      {hasQuote ? ' ' : null}
      {hasQuote ? <span className="block font-sans text-xs text-cocoa-soft">{t('booking.price.plusQuote')}</span> : null}
    </>
  )
}
