import i18n from 'i18next'
import type { Locale } from '@/i18n/config'
import { formatLongDate, formatTime } from '@/lib/datetime'
import type { NotificationRow } from './api'

/**
 * WhatsApp "click to chat" link (https://wa.me/<number>?text=…).
 * It only OPENS WhatsApp with a prefilled message: the salon still presses
 * "send" itself. Nothing is sent automatically from the browser.
 */
export function whatsappLink(
  phone: string,
  event: NotificationRow['event'],
  locale: Locale,
  data: { name: string; startsAt: string; reference: string },
) {
  const t = i18n.getFixedT(locale)
  const text = t(`whatsappMessages.${event}`, {
    name: data.name,
    date: formatLongDate(data.startsAt, locale),
    time: formatTime(data.startsAt, locale),
    reference: data.reference,
    interpolation: { escapeValue: false },
  })
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
}
