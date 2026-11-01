import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocale } from '@/i18n/locale-context'
import { cn } from '@/lib/cn'
import { formatDayKey, monthGrid, weekdayLabels } from '@/lib/datetime'

interface CalendarProps {
  year: number
  month: number // 0-11
  today: string
  lastDay: string
  selected: string | null
  /** slot counts per day; undefined = still loading */
  availability: Record<string, number> | undefined
  onSelect: (day: string) => void
  onMonthChange: (delta: number) => void
  canGoPrev: boolean
  canGoNext: boolean
}

/** Month calendar. Only days with at least one open slot are selectable. */
export function Calendar({ year, month, today, lastDay, selected, availability, onSelect, onMonthChange, canGoPrev, canGoNext }: CalendarProps) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const weekStartsOn = locale === 'ar' ? 6 : 1 // Saturday in Algeria (ar), Monday (fr)
  const cells = monthGrid(year, month, weekStartsOn)
  const labels = weekdayLabels(locale, weekStartsOn)
  const title = formatDayKey(`${year}-${String(month + 1).padStart(2, '0')}-15`, locale, { month: 'long', year: 'numeric' })

  return (
    <div className="rounded-card border border-line bg-snow p-4 shadow-soft sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(-1)}
          disabled={!canGoPrev}
          aria-label={t('booking.datetime.previousMonth')}
          className="inline-flex size-11 items-center justify-center rounded-full text-cocoa transition-colors hover:bg-blush-100 disabled:opacity-30"
        >
          <ChevronLeft className="flip-rtl size-5" strokeWidth={1.5} />
        </button>
        <p className="font-display text-2xl capitalize" aria-live="polite" data-testid="calendar-month">
          {title}
        </p>
        <button
          type="button"
          onClick={() => onMonthChange(1)}
          disabled={!canGoNext}
          aria-label={t('booking.datetime.nextMonth')}
          className="inline-flex size-11 items-center justify-center rounded-full text-cocoa transition-colors hover:bg-blush-100 disabled:opacity-30"
        >
          <ChevronRight className="flip-rtl size-5" strokeWidth={1.5} />
        </button>
      </div>

      <div role="grid" aria-label={title} className="grid grid-cols-7 gap-1 text-center">
        <div role="row" className="contents">
          {labels.map((l) => (
            <span key={l} role="columnheader" className="pb-2 text-xs font-medium tracking-wide text-cocoa-muted uppercase">
              {l}
            </span>
          ))}
        </div>
        {cells.map((day, i) => {
          if (!day) return <span key={`pad-${i}`} aria-hidden />
          const inRange = day >= today && day <= lastDay
          const count = availability?.[day]
          const available = inRange && (count ?? 0) > 0
          const isSelected = day === selected
          const label = `${formatDayKey(day, locale)} — ${
            available ? t('booking.datetime.dayAvailable', { count }) : t('booking.datetime.dayUnavailable')
          }`
          return (
            <button
              key={day}
              type="button"
              role="gridcell"
              disabled={!available}
              aria-selected={isSelected}
              aria-label={label}
              data-day={day}
              onClick={() => onSelect(day)}
              className={cn(
                'relative mx-auto inline-flex aspect-square w-full max-w-12 flex-col items-center justify-center rounded-full text-sm transition-colors duration-300',
                isSelected && 'bg-cocoa text-ivory',
                !isSelected && available && 'text-cocoa hover:bg-blush-100',
                !available && 'text-cocoa-muted/50',
                availability === undefined && inRange && 'animate-pulse motion-reduce:animate-none',
                day === today && !isSelected && 'font-semibold',
              )}
            >
              {Number(day.slice(8))}
              {available && !isSelected ? <span aria-hidden className="absolute bottom-1.5 size-1 rounded-full bg-gold" /> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
