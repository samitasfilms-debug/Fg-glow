import type { Locale } from '@/i18n/config'

/** Format an amount in Algerian Dinar for the active locale (Latin digits). */
export function formatPrice(amount: number, locale: Locale) {
  const n = new Intl.NumberFormat(locale === 'ar' ? 'ar-DZ-u-nu-latn' : 'fr-DZ', { maximumFractionDigits: 0 }).format(amount)
  return locale === 'ar' ? `${n} د.ج` : `${n} DA`
}

/** Format a duration in minutes, e.g. "1 h 30". */
export function formatDuration(minutes: number, locale: Locale) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (locale === 'ar') {
    if (h === 0) return `${m} د`
    return m === 0 ? `${h} سا` : `${h} سا ${m} د`
  }
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}
