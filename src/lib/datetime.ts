/**
 * Date helpers that work in the SALON's time zone (Africa/Algiers), whatever
 * the visitor's device time zone is. Calendar days are plain "YYYY-MM-DD"
 * strings; instants are ISO strings / Date objects from the database.
 */
import type { Locale } from '@/i18n/config'

export const SALON_TZ = 'Africa/Algiers'

const intlLocale = (l: Locale) => (l === 'ar' ? 'ar-DZ-u-nu-latn' : 'fr-DZ')

/** Today's date in the salon time zone, "YYYY-MM-DD". */
export function salonToday(tz = SALON_TZ): string {
  return toDayKey(new Date(), tz)
}

/** Calendar day of an instant in the salon time zone. */
export function toDayKey(instant: Date | string, tz = SALON_TZ): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(
    typeof instant === 'string' ? new Date(instant) : instant,
  )
  const get = (t: string) => parts.find((p) => p.type === t)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** Minutes past midnight of an instant in the salon time zone. */
export function salonMinutes(instant: Date | string, tz = SALON_TZ): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(
    typeof instant === 'string' ? new Date(instant) : instant,
  )
  return Number(parts.find((p) => p.type === 'hour')?.value) * 60 + Number(parts.find((p) => p.type === 'minute')?.value)
}

/** Offset (minutes) of the time zone at a given instant. */
function tzOffsetMinutes(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instant)
  const v = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'), v('second'))
  return Math.round((asUtc - instant.getTime()) / 60000)
}

/** Salon-local "YYYY-MM-DD" + "HH:mm" → absolute instant (ISO string). */
export function salonLocalToIso(day: string, time: string, tz = SALON_TZ): string {
  const [y, m, d] = day.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm))
  const offset = tzOffsetMinutes(guess, tz)
  return new Date(guess.getTime() - offset * 60000).toISOString()
}

export function formatTime(instant: Date | string, locale: Locale, tz = SALON_TZ) {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    typeof instant === 'string' ? new Date(instant) : instant,
  )
}

export function formatLongDate(instant: Date | string, locale: Locale, tz = SALON_TZ) {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
    typeof instant === 'string' ? new Date(instant) : instant,
  )
}

export function formatShortDateTime(instant: Date | string, locale: Locale, tz = SALON_TZ) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(typeof instant === 'string' ? new Date(instant) : instant)
}

/** Day key ("YYYY-MM-DD") → long label, formatted at noon UTC to avoid any day shift. */
export function formatDayKey(day: string, locale: Locale, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }) {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: 'UTC', ...opts }).format(new Date(`${day}T12:00:00Z`))
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Monday-first (fr) / Saturday-first (ar, Algeria) month grid of day keys, null = padding. */
export function monthGrid(year: number, month: number, weekStartsOn: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1))
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const lead = (first.getUTCDay() - weekStartsOn + 7) % 7
  const cells: (string | null)[] = Array.from({ length: lead }, () => null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(Date.UTC(year, month, d)).toISOString().slice(0, 10))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function weekdayLabels(locale: Locale, weekStartsOn: number) {
  // 2023-01-01 was a Sunday
  return Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(intlLocale(locale), { timeZone: 'UTC', weekday: 'short' }).format(
      new Date(Date.UTC(2023, 0, 1 + ((weekStartsOn + i) % 7), 12)),
    ),
  )
}
