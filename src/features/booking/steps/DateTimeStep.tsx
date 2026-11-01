import { AnimatePresence, motion } from 'framer-motion'
import { Globe2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Skeleton, Spinner } from '@/components/ui/Spinner'
import { useLocale } from '@/i18n/locale-context'
import { cn } from '@/lib/cn'
import { addDays, formatDayKey, formatTime, salonMinutes } from '@/lib/datetime'
import { EASE_LUXE } from '@/lib/motion'
import { BookingError, bookingApi, type CatalogStaff } from '../api'
import { Calendar } from '../components/Calendar'

interface Props {
  serviceIds: string[]
  staffMode: boolean
  /** staff able to perform every selected service */
  staff: CatalogStaff[]
  staffId: string | null
  day: string | null
  slot: string | null
  today: string
  maxAdvanceDays: number
  onChange: (patch: { staffId?: string | null; day?: string | null; slot?: string | null }) => void
}

type Load<T> = { status: 'loading' } | { status: 'error'; code: string } | { status: 'ready'; data: T }

const monthStart = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}-01`
const monthEnd = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10)

export function DateTimeStep({ serviceIds, staffMode, staff, staffId, day, slot, today, maxAdvanceDays, onChange }: Props) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const lastDay = addDays(today, maxAdvanceDays)
  const initial = day ?? today
  const [view, setView] = useState({ y: Number(initial.slice(0, 4)), m: Number(initial.slice(5, 7)) - 1 })
  const [reload, setReload] = useState(0)
  const idsKey = serviceIds.join(',')

  // ---- month availability ---------------------------------------------------
  const [calendar, setCalendar] = useState<{ key: string; state: Load<Record<string, number>> }>({ key: '', state: { status: 'loading' } })
  const calKey = `${view.y}-${view.m}|${idsKey}|${staffId ?? ''}|${reload}`
  useEffect(() => {
    const from = [monthStart(view.y, view.m), today].sort()[1]
    const to = [monthEnd(view.y, view.m), lastDay].sort()[0]
    let alive = true
    if (from > to) {
      setCalendar({ key: calKey, state: { status: 'ready', data: {} } })
      return
    }
    bookingApi
      .calendar(from, to, serviceIds, staffId)
      .then((rows) => {
        if (alive) setCalendar({ key: calKey, state: { status: 'ready', data: Object.fromEntries(rows.map((r) => [r.day, r.slot_count])) } })
      })
      .catch((e: unknown) => {
        if (alive) setCalendar({ key: calKey, state: { status: 'error', code: e instanceof BookingError ? e.code : 'generic' } })
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- calKey captures every input
  }, [calKey])
  const cal = useMemo<Load<Record<string, number>>>(() => (calendar.key === calKey ? calendar.state : { status: 'loading' }), [calendar, calKey])

  // ---- slots of the selected day -------------------------------------------
  const [slots, setSlots] = useState<{ key: string; state: Load<string[]> }>({ key: '', state: { status: 'loading' } })
  const slotKey = `${day}|${idsKey}|${staffId ?? ''}|${reload}`
  useEffect(() => {
    if (!day) return
    let alive = true
    bookingApi
      .slots(day, serviceIds, staffId)
      .then((data) => alive && setSlots({ key: slotKey, state: { status: 'ready', data } }))
      .catch((e: unknown) => alive && setSlots({ key: slotKey, state: { status: 'error', code: e instanceof BookingError ? e.code : 'generic' } }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slotKey captures every input
  }, [slotKey])
  const daySlots = useMemo<Load<string[]>>(() => (slots.key === slotKey ? slots.state : { status: 'loading' }), [slots, slotKey])

  // A previously chosen slot that is no longer offered is dropped.
  useEffect(() => {
    if (slot && daySlots.status === 'ready' && !daySlots.data.includes(slot)) onChange({ slot: null })
  }, [daySlots, slot, onChange])

  const groups = useMemo(() => {
    if (daySlots.status !== 'ready') return []
    const buckets: Record<'morning' | 'afternoon' | 'evening', string[]> = { morning: [], afternoon: [], evening: [] }
    for (const s of daySlots.data) {
      const min = salonMinutes(s)
      buckets[min < 12 * 60 ? 'morning' : min < 17 * 60 ? 'afternoon' : 'evening'].push(s)
    }
    return (Object.keys(buckets) as (keyof typeof buckets)[]).filter((k) => buckets[k].length).map((k) => ({ key: k, slots: buckets[k] }))
  }, [daySlots])

  const firstMonth = { y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }
  const lastMonth = { y: Number(lastDay.slice(0, 4)), m: Number(lastDay.slice(5, 7)) - 1 }
  const idx = (v: { y: number; m: number }) => v.y * 12 + v.m
  const moveMonth = (delta: number) =>
    setView((v) => {
      const n = idx(v) + delta
      return { y: Math.floor(n / 12), m: n % 12 }
    })
  const monthEmpty = cal.status === 'ready' && !Object.values(cal.data).some((n) => n > 0)

  return (
    <section aria-labelledby="step-datetime-title" className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 id="step-datetime-title" className="text-display-sm">
          {t('booking.datetime.title')}
        </h2>
        <p className="inline-flex items-center gap-2 text-xs text-cocoa-muted">
          <Globe2 aria-hidden className="size-3.5" strokeWidth={1.5} />
          {t('booking.datetime.timezoneNote')}
        </p>
      </header>

      {staffMode && staff.length > 0 ? (
        <div role="radiogroup" aria-label={t('booking.datetime.professional')} className="flex flex-wrap gap-2">
          <span className="w-full text-sm font-medium text-cocoa">{t('booking.datetime.professional')}</span>
          {[{ id: null as string | null, display_name: t('booking.datetime.noPreference') }, ...staff].map((p) => (
            <button
              key={p.id ?? 'any'}
              type="button"
              role="radio"
              aria-checked={staffId === p.id}
              onClick={() => onChange({ staffId: p.id, day: null, slot: null })}
              className={cn(
                'inline-flex min-h-10 items-center rounded-full border px-4 text-sm transition-colors duration-300',
                staffId === p.id ? 'border-cocoa bg-cocoa text-ivory' : 'border-line-strong bg-snow text-cocoa-soft hover:border-cocoa',
              )}
            >
              {p.display_name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-10">
        <div className="flex flex-col gap-3">
          <Calendar
            year={view.y}
            month={view.m}
            today={today}
            lastDay={lastDay}
            selected={day}
            availability={cal.status === 'ready' ? cal.data : undefined}
            onSelect={(d) => onChange({ day: d, slot: null })}
            onMonthChange={moveMonth}
            canGoPrev={idx(view) > idx(firstMonth)}
            canGoNext={idx(view) < idx(lastMonth)}
          />
          {cal.status === 'error' ? (
            <ErrorLine code={cal.code} onRetry={() => setReload((n) => n + 1)} />
          ) : monthEmpty ? (
            <p className="text-sm text-cocoa-soft" role="status">
              {t('booking.datetime.noSlotsMonth')}
            </p>
          ) : null}
        </div>

        <div aria-live="polite" className="min-h-48">
          {!day ? (
            <p className="rounded-card border border-dashed border-line-strong p-6 text-sm text-cocoa-soft">{t('booking.datetime.chooseDay')}</p>
          ) : (
            <div className="flex flex-col gap-5">
              <p className="font-display text-2xl text-cocoa first-letter:uppercase">
                {t('booking.datetime.slotsFor', { date: formatDayKey(day, locale) })}
              </p>
              {daySlots.status === 'loading' ? (
                <div className="flex flex-col gap-3">
                  <Spinner label={t('booking.datetime.loading')} />
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {Array.from({ length: 8 }, (_, i) => (
                      <Skeleton key={i} className="h-11" />
                    ))}
                  </div>
                </div>
              ) : daySlots.status === 'error' ? (
                <ErrorLine code={daySlots.code} onRetry={() => setReload((n) => n + 1)} />
              ) : groups.length === 0 ? (
                <p className="text-sm text-cocoa-soft">{t('booking.datetime.noSlotsDay')}</p>
              ) : (
                <AnimatePresence mode="popLayout">
                  {groups.map((g, gi) => (
                    <motion.div
                      key={`${day}-${g.key}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: gi * 0.06, ease: EASE_LUXE }}
                      className="flex flex-col gap-2"
                    >
                      <p className="eyebrow">{t(`booking.datetime.${g.key}`)}</p>
                      <div role="radiogroup" aria-label={t(`booking.datetime.${g.key}`)} className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {g.slots.map((s) => (
                          <button
                            key={s}
                            type="button"
                            role="radio"
                            aria-checked={slot === s}
                            data-slot={s}
                            onClick={() => onChange({ slot: s })}
                            className={cn(
                              'min-h-11 rounded-soft border text-sm tabular-nums transition-colors duration-300',
                              slot === s ? 'border-cocoa bg-cocoa text-ivory' : 'border-line-strong bg-snow text-cocoa hover:border-gold',
                            )}
                          >
                            <bdi>{formatTime(s, locale)}</bdi>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ErrorLine({ code, onRetry }: { code: string; onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-danger">
      <span>{t(`errors.${code}`, { defaultValue: t('errors.generic') })}</span>
      <Button size="sm" variant="outline" onClick={onRetry}>
        {t('states.retry')}
      </Button>
    </div>
  )
}
