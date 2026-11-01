import { AlertCircle, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Spinner'
import { BookingError } from '@/features/booking/api'
import { useLocale } from '@/i18n/locale-context'
import { cn } from '@/lib/cn'
import { formatShortDateTime } from '@/lib/datetime'
import { formatPrice } from '@/lib/format'
import { adminApi, STATUSES, type AppointmentList, type AppointmentStatus } from './api'
import { StatusBadge } from './StatusBadge'

type State = { status: 'loading' } | { status: 'error'; code: string } | { status: 'ready'; data: AppointmentList }

export function AppointmentsPage() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const [params, setParams] = useSearchParams()
  const status = (params.get('statut') as AppointmentStatus | null) ?? null
  const from = params.get('du') ?? ''
  const to = params.get('au') ?? ''
  const q = params.get('q') ?? ''
  const [search, setSearch] = useState(q)
  const [state, setState] = useState<State>({ status: 'loading' })
  const [reload, setReload] = useState(0)

  const setParam = (key: string, value: string | null) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        if (value) n.set(key, value)
        else n.delete(key)
        return n
      },
      { replace: true },
    )

  // Debounced search box → URL
  useEffect(() => {
    const id = setTimeout(() => {
      if (search !== q) setParam('q', search.trim() || null)
    }, 350)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  useEffect(() => {
    let alive = true
    setState((s) => (s.status === 'ready' ? s : { status: 'loading' }))
    adminApi
      .list({ status: status ? [status] : null, from, to, search: q })
      .then((data) => alive && setState({ status: 'ready', data }))
      .catch((e: unknown) => alive && setState({ status: 'error', code: e instanceof BookingError ? e.code : 'generic' }))
    return () => {
      alive = false
    }
  }, [status, from, to, q, reload])

  const counts = state.status === 'ready' ? state.data.counts : {}
  const totalAll = Object.values(counts).reduce((n, c) => n + (c ?? 0), 0)
  const filtered = Boolean(status || from || to || q)
  const svcName = (s: { name_fr: string; name_ar: string }) => (locale === 'ar' ? s.name_ar : s.name_fr)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-4xl text-cocoa">{t('admin.appointments.title')}</h1>
        <p className="text-sm text-cocoa-soft">{t('admin.appointments.subtitle')}</p>
      </header>

      <div className="flex flex-col gap-4 rounded-card border border-line bg-snow p-4 shadow-soft">
        <div role="radiogroup" aria-label={t('admin.appointments.columns.status')} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {[null, ...STATUSES].map((s) => (
            <button
              key={s ?? 'all'}
              type="button"
              role="radio"
              aria-checked={status === s}
              onClick={() => setParam('statut', s)}
              className={cn(
                'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm',
                status === s ? 'border-cocoa bg-cocoa text-ivory' : 'border-line-strong text-cocoa-soft hover:border-cocoa',
              )}
            >
              {s ? t(`booking.status.${s}`) : t('admin.appointments.allStatuses')}
              <span className="text-xs tabular-nums opacity-70">{s ? (counts[s] ?? 0) : totalAll}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
          <label className="relative block">
            <span className="sr-only">{t('admin.appointments.search')}</span>
            <Search aria-hidden className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-cocoa-muted" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('admin.appointments.search')} className="ps-11" type="search" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-cocoa-muted">
            {t('admin.appointments.from')}
            <Input type="date" value={from} max={to || undefined} onChange={(e) => setParam('du', e.target.value || null)} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-cocoa-muted">
            {t('admin.appointments.to')}
            <Input type="date" value={to} min={from || undefined} onChange={(e) => setParam('au', e.target.value || null)} />
          </label>
          <Button
            variant="ghost"
            size="sm"
            disabled={!filtered}
            onClick={() => {
              setSearch('')
              setParams({}, { replace: true })
            }}
          >
            {t('admin.appointments.clearFilters')}
          </Button>
        </div>
      </div>

      {state.status === 'loading' ? (
        <div className="flex flex-col gap-2" aria-busy>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : state.status === 'error' ? (
        <EmptyState
          icon={<AlertCircle className="size-7" strokeWidth={1.25} />}
          title={t(`errors.${state.code}`, { defaultValue: t('errors.generic') })}
          action={<Button onClick={() => setReload((n) => n + 1)}>{t('states.retry')}</Button>}
        />
      ) : state.data.items.length === 0 ? (
        <EmptyState title={filtered ? t('admin.appointments.empty') : t('admin.appointments.emptyAll')} />
      ) : (
        <>
          <p className="text-sm text-cocoa-muted" aria-live="polite">
            {t('admin.appointments.count', { count: state.data.total })}
          </p>
          <ul className="flex flex-col gap-2" data-testid="appointments-list">
            {state.data.items.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/admin/rendez-vous/${a.id}`}
                  data-reference={a.reference}
                  className="grid gap-2 rounded-card border border-line bg-snow p-4 transition-shadow hover:shadow-soft md:grid-cols-[10rem_1fr_1.4fr_7rem_auto] md:items-center md:gap-4"
                >
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-cocoa first-letter:uppercase">{formatShortDateTime(a.starts_at, locale)}</span>
                    <span className="text-xs text-cocoa-muted" dir="ltr">{a.reference}</span>
                  </span>
                  <span className="flex flex-col">
                    <span className="text-cocoa">{a.customer_name}</span>
                    <bdi className="text-xs text-cocoa-muted" dir="ltr">{a.customer_phone}</bdi>
                  </span>
                  <span className="text-sm text-cocoa-soft">{(a.services ?? []).map(svcName).join(' · ')}</span>
                  <span className="text-sm tabular-nums text-cocoa">{formatPrice(a.total_price_dzd, locale)}</span>
                  <span className="justify-self-start md:justify-self-end">
                    <StatusBadge status={a.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
