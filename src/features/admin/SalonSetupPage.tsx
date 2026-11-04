import { AlertCircle, CheckCircle2, Circle, Plus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input, Select } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Spinner'
import { BookingError } from '@/features/booking/api'
import { useLocale } from '@/i18n/locale-context'
import { addDays, formatDayKey, salonLocalToIso, salonToday, toDayKey } from '@/lib/datetime'
import { Check } from './ServicesPage'
import { canManage, useAdminSession } from './session-context'
import { setupApi, type Closure, type EditableSettings, type HoursRange, type SalonSettings } from './setup-api'

interface Data {
  settings: SalonSettings
  hours: HoursRange[]
  closures: Closure[]
  activeServices: number
}

type State = { status: 'loading' } | { status: 'error'; code: string } | { status: 'ready'; data: Data }

const errCode = (e: unknown) => (e instanceof BookingError ? e.code : 'generic')
// Algerian week: Saturday first.
const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5]

export function SalonSetupPage() {
  const { t } = useTranslation()
  const { session } = useAdminSession()
  const manage = session.status === 'ready' && canManage(session.profile)
  const [state, setState] = useState<State>({ status: 'loading' })

  const load = useCallback(() => {
    Promise.all([setupApi.settings(), setupApi.hours(), setupApi.closures(), setupApi.services()])
      .then(([settings, hours, closures, services]) =>
        setState({
          status: 'ready',
          data: { settings, hours, closures, activeServices: services.filter((s) => s.is_active && s.is_bookable_online).length },
        }),
      )
      .catch((e: unknown) => setState({ status: 'error', code: errCode(e) }))
  }, [])
  useEffect(load, [load])

  return (
    <div className="flex flex-col gap-6">
      <header className="flex max-w-2xl flex-col gap-1">
        <h1 className="font-display text-4xl text-cocoa">{t('admin.setup.title')}</h1>
        <p className="text-sm text-cocoa-soft">{t('admin.setup.subtitle')}</p>
      </header>
      {state.status === 'loading' ? (
        <div className="flex flex-col gap-4" aria-busy>
          <Skeleton className="h-32" />
          <Skeleton className="h-80" />
        </div>
      ) : state.status === 'error' ? (
        <EmptyState
          icon={<AlertCircle className="size-7" strokeWidth={1.25} />}
          title={t(`errors.${state.code}`, { defaultValue: t('errors.generic') })}
          action={<Button onClick={load}>{t('states.retry')}</Button>}
        />
      ) : (
        <>
          <BookingStatusCard data={state.data} manage={manage} onChange={load} />
          <HoursCard initial={state.data.hours} manage={manage} onSaved={load} />
          <ClosuresCard closures={state.data.closures} manage={manage} onChange={load} />
          <RulesCard settings={state.data.settings} manage={manage} onSaved={load} />
        </>
      )}
    </div>
  )
}

function Panel({ title, hint, children, testId }: { title: string; hint?: string; children: ReactNode; testId?: string }) {
  return (
    <section className="flex flex-col gap-5 rounded-card border border-line bg-snow p-5 shadow-soft md:p-7" data-testid={testId}>
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl text-cocoa">{title}</h2>
        {hint ? <p className="text-sm text-cocoa-soft">{hint}</p> : null}
      </div>
      {children}
    </section>
  )
}

function Feedback({ ok, error }: { ok: string | null; error: string | null }) {
  const { t } = useTranslation()
  if (error)
    return (
      <p role="alert" className="text-sm text-danger">
        {t(`errors.${error}`, { defaultValue: t('errors.generic') })}
      </p>
    )
  if (ok)
    return (
      <p role="status" className="text-sm text-success">
        {ok}
      </p>
    )
  return null
}

function BookingStatusCard({ data, manage, onChange }: { data: Data; manage: boolean; onChange: () => void }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const enabled = data.settings.booking_enabled
  const hasServices = data.activeServices > 0
  const hasHours = data.hours.length > 0
  const ready = hasServices && hasHours

  const toggle = async () => {
    setBusy(true)
    setError(null)
    try {
      await setupApi.setBookingEnabled(!enabled)
      onChange()
    } catch (e) {
      setError(errCode(e))
    } finally {
      setBusy(false)
    }
  }

  const item = (done: boolean, label: string, to?: string) => (
    <li className="flex items-center gap-2 text-sm">
      {done ? <CheckCircle2 aria-hidden className="size-4 text-success" strokeWidth={1.5} /> : <Circle aria-hidden className="size-4 text-cocoa-muted" strokeWidth={1.5} />}
      {to && !done ? (
        <Link to={to} className="text-cocoa underline decoration-gold/60 underline-offset-4">
          {label}
        </Link>
      ) : (
        <span className={done ? 'text-cocoa' : 'text-cocoa-soft'}>{label}</span>
      )}
    </li>
  )

  return (
    <Panel title={t('admin.setup.status.title')} testId="booking-status">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge tone={enabled ? 'success' : 'warning'}>{enabled ? '●' : '○'}</Badge>
          <p className="text-cocoa">{enabled ? t('admin.setup.status.open') : t('admin.setup.status.closed')}</p>
        </div>
        {manage ? (
          <Button variant={enabled ? 'outline' : 'gold'} loading={busy} disabled={!enabled && !ready} onClick={() => void toggle()} data-testid="booking-toggle">
            {enabled ? t('admin.setup.status.closeAction') : t('admin.setup.status.openAction')}
          </Button>
        ) : null}
      </div>
      {!enabled ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs tracking-[0.15em] text-cocoa-muted uppercase">{t('admin.setup.status.checklist')}</p>
          <ul className="flex flex-col gap-1.5">
            {item(hasServices, t('admin.setup.status.needServices'), '/admin/prestations')}
            {item(hasHours, t('admin.setup.status.needHours'))}
          </ul>
        </div>
      ) : null}
      <Feedback ok={null} error={error} />
    </Panel>
  )
}

function HoursCard({ initial, manage, onSaved }: { initial: HoursRange[]; manage: boolean; onSaved: () => void }) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const [ranges, setRanges] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const longLabel = (d: number) => formatDayKey(addDays('2023-01-01', d), locale, { weekday: 'long' })

  const update = (idx: number, patch: Partial<HoursRange>) => setRanges((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  const add = (weekday: number) => setRanges((rs) => [...rs, { weekday, opens_at: '', closes_at: '' }])
  const remove = (idx: number) => setRanges((rs) => rs.filter((_, i) => i !== idx))

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setOk(null)
    setError(null)
    try {
      await setupApi.saveHours(ranges.filter((r) => r.opens_at && r.closes_at))
      setOk(t('admin.setup.hours.saved'))
      onSaved()
    } catch (err) {
      setError(errCode(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title={t('admin.setup.hours.title')} hint={t('admin.setup.hours.hint')} testId="hours">
      <form onSubmit={(e) => void save(e)} className="flex flex-col gap-4">
        <ul className="flex flex-col divide-y divide-line">
          {WEEK_ORDER.map((d) => {
            const dayRanges = ranges.map((r, i) => [r, i] as const).filter(([r]) => r.weekday === d)
            return (
              <li key={d} className="flex flex-col gap-3 py-3 md:flex-row md:items-start" data-testid={`hours-day-${d}`}>
                <p className="w-36 shrink-0 pt-3 font-medium text-cocoa capitalize">
                  {longLabel(d)}
                </p>
                <div className="flex flex-1 flex-col gap-2">
                  {dayRanges.length === 0 ? <p className="pt-3 text-sm text-cocoa-muted">{t('admin.setup.hours.closedDay')}</p> : null}
                  {dayRanges.map(([r, i]) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <Input
                        type="time"
                        required
                        step={300}
                        dir="ltr"
                        aria-label={`${longLabel(d)} — ${t('admin.setup.hours.opens')}`}
                        className="w-32"
                        disabled={!manage}
                        value={r.opens_at}
                        onChange={(e) => update(i, { opens_at: e.target.value })}
                      />
                      <span aria-hidden className="text-cocoa-muted">
                        –
                      </span>
                      <Input
                        type="time"
                        required
                        step={300}
                        dir="ltr"
                        aria-label={`${longLabel(d)} — ${t('admin.setup.hours.closes')}`}
                        className="w-32"
                        disabled={!manage}
                        value={r.closes_at}
                        onChange={(e) => update(i, { closes_at: e.target.value })}
                      />
                      {manage ? (
                        <Button variant="ghost" size="sm" onClick={() => remove(i)} aria-label={t('admin.setup.hours.removeRange')}>
                          <X aria-hidden className="size-4" strokeWidth={1.5} />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
                {manage ? (
                  <Button variant="ghost" size="sm" className="self-start" onClick={() => add(d)} icon={<Plus aria-hidden className="size-4" strokeWidth={1.5} />}>
                    {t('admin.setup.hours.addRange')}
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>
        <Feedback ok={ok} error={error} />
        {manage ? (
          <Button type="submit" loading={busy} className="self-start" data-testid="hours-save">
            {t('admin.setup.hours.save')}
          </Button>
        ) : null}
      </form>
    </Panel>
  )
}

function ClosuresCard({ closures, manage, onChange }: { closures: Closure[]; manage: boolean; onChange: () => void }) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const today = salonToday()
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (to < from) return setError('FGG_INVALID_RANGE')
    setBusy(true)
    setError(null)
    try {
      // Whole days in the salon time zone: [from 00:00, day after "to" 00:00).
      await setupApi.addClosure({ starts_at: salonLocalToIso(from, '00:00'), ends_at: salonLocalToIso(addDays(to, 1), '00:00'), reason: reason.trim() || null })
      setReason('')
      onChange()
    } catch (err) {
      setError(errCode(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await setupApi.removeClosure(id)
      onChange()
    } catch (err) {
      setError(errCode(err))
    }
  }

  const label = (c: Closure) => {
    const start = toDayKey(c.starts_at)
    const lastDay = addDays(toDayKey(c.ends_at), -1)
    const fmt = (d: string) => formatDayKey(d, locale, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
    return lastDay <= start ? fmt(start) : `${fmt(start)} → ${fmt(lastDay)}`
  }

  return (
    <Panel title={t('admin.setup.closures.title')} hint={t('admin.setup.closures.hint')} testId="closures">
      {closures.length === 0 ? (
        <p className="text-sm text-cocoa-muted">{t('admin.setup.closures.empty')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {closures.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2">
              <div className="flex flex-col">
                <span className="text-cocoa">{label(c)}</span>
                {c.reason ? <span className="text-sm text-cocoa-soft">{c.reason}</span> : null}
              </div>
              {manage ? (
                <Button variant="ghost" size="sm" onClick={() => void remove(c.id)} icon={<Trash2 aria-hidden className="size-4" strokeWidth={1.5} />}>
                  {t('admin.setup.closures.remove')}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {manage ? (
        <form onSubmit={(e) => void add(e)} className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
          <Field label={t('admin.setup.closures.from')} required>
            {({ id }) => <Input id={id} type="date" required min={today} dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} />}
          </Field>
          <Field label={t('admin.setup.closures.to')} required>
            {({ id }) => <Input id={id} type="date" required min={from} dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} />}
          </Field>
          <Field label={t('admin.setup.closures.reason')}>
            {({ id }) => <Input id={id} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />}
          </Field>
          <Button type="submit" variant="outline" loading={busy}>
            {t('admin.setup.closures.add')}
          </Button>
        </form>
      ) : null}
      <Feedback ok={null} error={error} />
    </Panel>
  )
}

const SLOT_INTERVALS = [5, 10, 15, 20, 30, 45, 60]

function RulesCard({ settings, manage, onSaved }: { settings: SalonSettings; manage: boolean; onSaved: () => void }) {
  const { t } = useTranslation()
  const toForm = (s: SalonSettings) => ({
    slot_interval_minutes: String(s.slot_interval_minutes),
    buffer_minutes: String(s.buffer_minutes),
    salon_capacity: String(s.salon_capacity),
    min_notice_minutes: String(s.min_notice_minutes),
    max_advance_days: String(s.max_advance_days),
    pending_hold_hours: String(s.pending_hold_hours),
    max_services_per_booking: String(s.max_services_per_booking),
    allow_multiple_services: s.allow_multiple_services,
    whatsapp_number: s.whatsapp_number ?? '',
  })
  const [form, setForm] = useState(() => toForm(settings))
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const payload: EditableSettings = {
      slot_interval_minutes: Number(form.slot_interval_minutes),
      buffer_minutes: Number(form.buffer_minutes),
      salon_capacity: Number(form.salon_capacity),
      min_notice_minutes: Number(form.min_notice_minutes),
      max_advance_days: Number(form.max_advance_days),
      pending_hold_hours: Number(form.pending_hold_hours),
      max_services_per_booking: Number(form.max_services_per_booking),
      allow_multiple_services: form.allow_multiple_services,
      whatsapp_number: form.whatsapp_number.replace(/\s/g, '') || null,
    }
    setBusy(true)
    setOk(null)
    setError(null)
    try {
      await setupApi.saveSettings(payload)
      setOk(t('admin.setup.rules.saved'))
      onSaved()
    } catch (err) {
      setError(errCode(err))
    } finally {
      setBusy(false)
    }
  }

  const num = (k: keyof typeof form, label: string, min: number, max: number) => (
    <Field label={label} required>
      {({ id }) => (
        <Input id={id} type="number" inputMode="numeric" required min={min} max={max} step={1} dir="ltr" disabled={!manage} value={String(form[k])} onChange={(e) => set(k, e.target.value as never)} />
      )}
    </Field>
  )

  return (
    <Panel title={t('admin.setup.rules.title')} testId="rules">
      <form onSubmit={(e) => void save(e)} className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t('admin.setup.rules.slotInterval')} required>
            {({ id }) => (
              <Select id={id} disabled={!manage} value={form.slot_interval_minutes} onChange={(e) => set('slot_interval_minutes', e.target.value)}>
                {SLOT_INTERVALS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {num('buffer_minutes', t('admin.setup.rules.buffer'), 0, 120)}
          {num('salon_capacity', t('admin.setup.rules.capacity'), 1, 50)}
          {num('min_notice_minutes', t('admin.setup.rules.minNotice'), 0, 10080)}
          {num('max_advance_days', t('admin.setup.rules.maxAdvance'), 1, 365)}
          {num('pending_hold_hours', t('admin.setup.rules.hold'), 1, 168)}
          {num('max_services_per_booking', t('admin.setup.rules.maxServices'), 1, 10)}
          <Field label={t('admin.setup.rules.whatsapp')} hint={t('admin.setup.rules.whatsappHint')}>
            {({ id, describedBy }) => (
              <Input
                id={id}
                type="tel"
                dir="ltr"
                inputMode="tel"
                pattern="\+[1-9][0-9 ]{7,18}"
                aria-describedby={describedBy}
                disabled={!manage}
                value={form.whatsapp_number}
                onChange={(e) => set('whatsapp_number', e.target.value)}
              />
            )}
          </Field>
        </div>
        <Check label={t('admin.setup.rules.multiple')} checked={form.allow_multiple_services} onChange={(v) => manage && set('allow_multiple_services', v)} />
        <Feedback ok={ok} error={error} />
        {manage ? (
          <Button type="submit" loading={busy} className="self-start">
            {t('admin.setup.rules.save')}
          </Button>
        ) : null}
      </form>
    </Panel>
  )
}
