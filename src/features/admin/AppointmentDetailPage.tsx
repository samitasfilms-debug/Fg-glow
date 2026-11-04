import { AlertCircle, ArrowLeft, MessageCircle, Phone } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Spinner'
import { BookingError } from '@/features/booking/api'
import { useLocale } from '@/i18n/locale-context'
import { formatLongDate, formatShortDateTime, formatTime } from '@/lib/datetime'
import { formatDuration, formatPrice } from '@/lib/format'
import { ACTIONS_BY_STATUS, adminApi, type AdminAction, type AppointmentDetail } from './api'
import { ActionDialog } from './ActionDialog'
import { StatusBadge } from './StatusBadge'
import { canManage, useAdminSession } from './session-context'
import { whatsappLink } from './whatsapp'

type State = { status: 'loading' } | { status: 'error'; code: string } | { status: 'ready'; data: AppointmentDetail; at: number }

export function AppointmentDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const { locale } = useLocale()
  const { session } = useAdminSession()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [action, setAction] = useState<AdminAction | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const load = useCallback(() => {
    return adminApi
      .get(id)
      .then((data) => setState({ status: 'ready', data, at: Date.now() }))
      .catch((e: unknown) => setState({ status: 'error', code: e instanceof BookingError ? e.code : 'generic' }))
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const back = (
    <Link to="/admin/rendez-vous" className="inline-flex min-h-11 items-center gap-2 text-sm text-cocoa-soft hover:text-cocoa">
      <ArrowLeft aria-hidden className="flip-rtl size-4" strokeWidth={1.5} />
      {t('admin.detail.back')}
    </Link>
  )

  if (state.status === 'loading')
    return (
      <div className="flex flex-col gap-4" aria-busy>
        {back}
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    )
  if (state.status === 'error')
    return (
      <div className="flex flex-col gap-4">
        {back}
        <EmptyState
          icon={<AlertCircle className="size-7" strokeWidth={1.25} />}
          title={t(`errors.${state.code}`, { defaultValue: t('errors.generic') })}
          action={<Button onClick={() => void load()}>{t('states.retry')}</Button>}
        />
      </div>
    )

  const a = state.data
  const manage = session.status === 'ready' && canManage(session.profile)
  const actions = manage ? ACTIONS_BY_STATUS[a.status] : []
  const svcName = (s: { name_fr: string; name_ar: string }) => (locale === 'ar' ? s.name_ar : s.name_fr)
  const customerNotifs = a.notifications.filter((n) => n.audience === 'customer')
  const manualMode = customerNotifs.some((n) => n.status === 'awaiting_provider' || n.status === 'manual_opened')

  const apply = async (opts: { note: string; newStartsAt?: string }) => {
    if (!action) return
    setBusy(true)
    setActionError(null)
    try {
      await adminApi.update(a.id, action, opts)
      setAction(null)
      setFlash(t('admin.actions.done'))
      await load()
    } catch (e) {
      setActionError(e instanceof BookingError ? e.code : 'generic')
    } finally {
      setBusy(false)
    }
  }

  const openWhatsApp = (n: AppointmentDetail['notifications'][number]) => {
    const phone = n.recipient ?? a.customer.phone
    window.open(whatsappLink(phone, n.event, n.locale, { name: a.customer.full_name, startsAt: a.starts_at, reference: a.reference }), '_blank', 'noopener')
    void adminApi.markNotificationOpened(n.id).then(load).catch(() => {})
  }

  return (
    <div className="flex flex-col gap-6" data-testid="appointment-detail" data-status={a.status}>
      {back}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-cocoa-muted" dir="ltr">{a.reference}</p>
          <h1 className="font-display text-4xl text-cocoa first-letter:uppercase">
            {formatLongDate(a.starts_at, locale)} · <bdi>{formatTime(a.starts_at, locale)}</bdi>
          </h1>
          <p className="text-sm text-cocoa-soft">
            {formatDuration(a.total_duration_minutes, locale)} · {formatPrice(a.total_price_dzd, locale)}
            {a.previous_starts_at ? <> · {t('admin.detail.previousTime', { date: formatShortDateTime(a.previous_starts_at, locale) })}</> : null}
          </p>
          {a.hold_expires_at ? (
            <p className="text-xs text-gold-ink">
              {Date.parse(a.hold_expires_at) > state.at
                ? t('admin.appointments.holdExpires', { date: formatShortDateTime(a.hold_expires_at, locale) })
                : t('admin.appointments.holdExpired')}
            </p>
          ) : null}
        </div>
        <StatusBadge status={a.status} />
      </header>

      {flash ? (
        <p role="status" className="rounded-card bg-success/10 p-3 text-sm text-success">
          {flash}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-6">
          <Panel title={t('admin.detail.actions')}>
            {actions.length ? (
              <div className="flex flex-wrap gap-2">
                {actions.map((ac) => (
                  <Button
                    key={ac}
                    size="sm"
                    variant={ac === 'confirm' ? 'primary' : ac === 'propose' || ac === 'complete' ? 'gold' : 'outline'}
                    onClick={() => {
                      setFlash(null)
                      setActionError(null)
                      setAction(ac)
                    }}
                    data-action={ac}
                  >
                    {t(`admin.actions.${ac}`)}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-cocoa-muted">{t('admin.detail.noActions')}</p>
            )}
          </Panel>

          <Panel title={t('admin.detail.services')}>
            <ul className="divide-y divide-line">
              {a.services.map((s, i) => (
                <li key={i} className="flex flex-col gap-1 py-2 text-sm">
                  <span className="flex justify-between gap-4">
                    <span className="text-cocoa">
                      {svcName(s)} <span className="text-xs text-cocoa-muted">· {formatDuration(s.duration_minutes, locale)}</span>
                    </span>
                    <span className="tabular-nums">{formatPrice(s.price_dzd, locale)}</span>
                  </span>
                  {(s.options ?? []).map((o, j) => (
                    <span key={j} className="flex justify-between gap-4 ps-3 text-cocoa-soft" data-testid="detail-option">
                      <span>+ {svcName(o)}</span>
                      <span className="tabular-nums">
                        {o.price_is_minimum ? `${t('booking.options.from')} ` : ''}
                        {formatPrice(o.price_dzd, locale)}
                      </span>
                    </span>
                  ))}
                </li>
              ))}
            </ul>
            <p className="mt-2 flex justify-between border-t border-line-strong pt-2 text-sm font-medium">
              <span>{t('booking.summary.total')}</span>
              <span className="tabular-nums">{formatPrice(a.total_price_dzd, locale)}</span>
            </p>
            {a.staff ? (
              <p className="mt-3 text-sm text-cocoa-soft">
                {t('admin.detail.professional')} : {a.staff.display_name}
              </p>
            ) : null}
          </Panel>

          <Panel title={t('admin.detail.history')}>
            <ol className="flex flex-col gap-3 border-s border-line ps-4">
              {a.events.map((e, i) => (
                <li key={i} className="flex flex-col gap-0.5 text-sm">
                  <span className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={e.to_status} />
                    <span className="text-xs text-cocoa-muted">
                      {formatShortDateTime(e.created_at, locale)} · {e.actor ?? t('admin.detail.byCustomer')}
                    </span>
                  </span>
                  {typeof e.details?.new_starts_at === 'string' ? (
                    <span className="text-xs text-cocoa-soft">→ {formatShortDateTime(e.details.new_starts_at, locale)}</span>
                  ) : null}
                  {e.note ? <span className="whitespace-pre-line text-cocoa-soft">{e.note}</span> : null}
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title={t('admin.detail.customer')}>
            <p className="font-display text-2xl text-cocoa">{a.customer.full_name}</p>
            <p className="text-sm">
              <bdi dir="ltr">{a.customer.phone}</bdi>
            </p>
            {a.customer.email ? <p className="text-sm break-all text-cocoa-soft" dir="ltr">{a.customer.email}</p> : null}
            <p className="mt-2 text-xs text-cocoa-muted">
              {t('admin.detail.visits', { completed: a.customer.completed_count, total: a.customer.total_count })}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`tel:${a.customer.phone}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 text-sm hover:border-cocoa">
                <Phone aria-hidden className="size-4" strokeWidth={1.5} />
                {t('admin.detail.call')}
              </a>
            </div>
            <div className="mt-4 border-t border-line pt-3">
              <p className="text-xs font-medium text-cocoa-muted uppercase">{t('admin.detail.notes')}</p>
              <p className="mt-1 text-sm whitespace-pre-line text-cocoa-soft">{a.customer_notes || t('admin.detail.noNotes')}</p>
            </div>
            <p className="mt-3 text-xs text-cocoa-muted">{t('admin.detail.createdAt', { date: formatShortDateTime(a.created_at, locale) })}</p>
          </Panel>

          <Panel title={t('admin.detail.notifications')}>
            {manualMode ? <p className="mb-3 rounded-soft bg-blush-100/70 p-3 text-xs text-cocoa">{t('admin.whatsapp.apiOff')}</p> : null}
            {customerNotifs.length === 0 ? (
              <p className="text-sm text-cocoa-muted">{t('states.empty')}</p>
            ) : (
              <ul className="flex flex-col gap-3" data-testid="notifications">
                {customerNotifs
                  .slice()
                  .reverse()
                  .map((n, i) => (
                    <li key={n.id} className="flex flex-col gap-2 rounded-soft border border-line p-3 text-sm">
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{t(`admin.whatsapp.events.${n.event}`)}</span>
                        <Badge tone={n.status === 'sent' ? 'success' : n.status === 'failed' ? 'danger' : 'muted'} data-notification-status={n.status}>
                          {t(`admin.whatsapp.statuses.${n.status}`)}
                        </Badge>
                      </span>
                      <span className="text-xs text-cocoa-muted">{formatShortDateTime(n.created_at, locale)}</span>
                      {/* Only the latest message is offered: older ones may describe a superseded state. */}
                      {i === 0 && (n.status === 'awaiting_provider' || n.status === 'manual_opened' || n.status === 'failed') ? (
                        <Button size="sm" variant="outline" onClick={() => openWhatsApp(n)} icon={<MessageCircle aria-hidden className="size-4" strokeWidth={1.5} />} data-testid="whatsapp-open">
                          {t('admin.whatsapp.open')}
                        </Button>
                      ) : null}
                      {n.status === 'manual_opened' ? <span className="text-xs text-cocoa-muted">{t('admin.whatsapp.opened')}</span> : null}
                    </li>
                  ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <ActionDialog action={action} busy={busy} error={actionError} onClose={() => !busy && setAction(null)} onSubmit={apply} />
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-snow p-5 shadow-soft">
      <h2 className="mb-3 text-xs font-medium tracking-[0.18em] text-cocoa-muted uppercase">{title}</h2>
      {children}
    </section>
  )
}
