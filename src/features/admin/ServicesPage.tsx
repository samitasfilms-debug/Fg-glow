import { AlertCircle, Pencil, Plus, Scissors, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Spinner'
import { BookingError } from '@/features/booking/api'
import { useLocale } from '@/i18n/locale-context'
import type { PriceMode } from '@/config/services'
import { ServicePrice } from '@/features/booking/components/Price'
import { formatDuration, formatPrice } from '@/lib/format'
import { canManage, useAdminSession } from './session-context'
import { SERVICE_CATEGORIES, setupApi, type AdminService, type AdminServiceOption, type ServiceInput } from './setup-api'

type State =
  | { status: 'loading' }
  | { status: 'error'; code: string }
  | { status: 'ready'; items: AdminService[]; options: Record<string, AdminServiceOption[]> }

const errCode = (e: unknown) => (e instanceof BookingError ? e.code : 'generic')

export function ServicesPage() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const { session } = useAdminSession()
  const manage = session.status === 'ready' && canManage(session.profile)
  const [state, setState] = useState<State>({ status: 'loading' })
  const [editing, setEditing] = useState<AdminService | 'new' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(() => {
    Promise.all([setupApi.services(), setupApi.options()])
      .then(([items, options]) => setState({ status: 'ready', items, options }))
      .catch((e: unknown) => setState({ status: 'error', code: errCode(e) }))
  }, [])
  useEffect(load, [load])

  const archive = async (s: AdminService) => {
    const name = locale === 'ar' ? s.name_ar : s.name_fr
    if (!window.confirm(t('admin.services.archiveConfirm', { name }))) return
    try {
      await setupApi.archiveService(s.id)
      load()
    } catch (e) {
      setNotice(t(`errors.${errCode(e)}`, { defaultValue: t('errors.generic') }))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-1">
          <h1 className="font-display text-4xl text-cocoa">{t('admin.services.title')}</h1>
          <p className="text-sm text-cocoa-soft">{t('admin.services.subtitle')}</p>
        </div>
        {manage ? (
          <Button onClick={() => setEditing('new')} icon={<Plus aria-hidden className="size-4" strokeWidth={1.5} />} data-testid="service-add">
            {t('admin.services.add')}
          </Button>
        ) : null}
      </header>

      {notice ? (
        <p role="status" className="rounded-soft border border-line bg-snow px-4 py-3 text-sm text-cocoa">
          {notice}
        </p>
      ) : null}

      {state.status === 'loading' ? (
        <div className="flex flex-col gap-3" aria-busy>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : state.status === 'error' ? (
        <EmptyState
          icon={<AlertCircle className="size-7" strokeWidth={1.25} />}
          title={t(`errors.${state.code}`, { defaultValue: t('errors.generic') })}
          action={<Button onClick={load}>{t('states.retry')}</Button>}
        />
      ) : state.items.length === 0 ? (
        <EmptyState
          icon={<Scissors className="size-7" strokeWidth={1.25} />}
          title={t('admin.services.empty')}
          description={t('admin.services.emptyBody')}
          action={manage ? <Button onClick={() => setEditing('new')}>{t('admin.services.add')}</Button> : undefined}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-card border border-line bg-snow shadow-soft" data-testid="service-list">
          {state.items.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-xs tracking-[0.15em] text-gold-ink uppercase">{t(`services.categories.${s.category}`)}</p>
                <p className="font-display text-xl text-cocoa">
                  {s.name_fr} <span className="text-cocoa-muted">·</span>{' '}
                  <span lang="ar" dir="rtl" className="font-arabic">
                    {s.name_ar}
                  </span>
                </p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-cocoa-soft">
                  <span className="font-medium text-cocoa">
                    <ServicePrice amount={s.price_dzd} mode={s.price_mode} />
                  </span>
                  <span aria-hidden>·</span>
                  <span>{formatDuration(s.duration_minutes, locale)}</span>
                  <Badge tone={s.is_active ? 'success' : 'muted'}>{s.is_active ? t('admin.services.active') : t('admin.services.inactive')}</Badge>
                  <Badge tone={s.is_bookable_online ? 'gold' : 'muted'}>{s.is_bookable_online ? t('admin.services.online') : t('admin.services.offline')}</Badge>
                </div>
                {(state.options[s.id] ?? []).length > 0 ? (
                  <p className="text-xs text-cocoa-muted" data-testid="service-options-summary">
                    {t('admin.services.options.title')} :{' '}
                    {(state.options[s.id] ?? [])
                      .map((o) => `${locale === 'ar' ? o.name_ar : o.name_fr} ${o.price_is_minimum ? t('booking.options.from') + ' ' : '+'}${formatPrice(o.price_dzd, locale)}${o.is_active ? '' : ` (${t('admin.services.inactive')})`}`)
                      .join(' · ')}
                  </p>
                ) : null}
              </div>
              {manage ? (
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(s)} icon={<Pencil aria-hidden className="size-4" strokeWidth={1.5} />}>
                    {t('admin.services.edit')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void archive(s)} icon={<Trash2 aria-hidden className="size-4" strokeWidth={1.5} />}>
                    {t('admin.services.archive')}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <ServiceDialog
        service={editing}
        options={editing && editing !== 'new' && state.status === 'ready' ? (state.options[editing.id] ?? []) : []}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          setNotice(t('admin.services.saved'))
          load()
        }}
      />
    </div>
  )
}

const emptyForm = {
  category: 'manicure' as ServiceInput['category'],
  name_fr: '',
  name_ar: '',
  description_fr: '',
  description_ar: '',
  price: '',
  price_mode: 'fixed' as PriceMode,
  duration: '',
  sort_order: '0',
  is_active: true,
  is_bookable_online: true,
}

interface OptionRow {
  id?: string
  name_fr: string
  name_ar: string
  price: string
  price_is_minimum: boolean
  is_active: boolean
}

function ServiceDialog({
  service,
  options,
  onClose,
  onSaved,
}: {
  service: AdminService | 'new' | null
  options: AdminServiceOption[]
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)
  const [form, setForm] = useState(emptyForm)
  const [rows, setRows] = useState<OptionRow[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (service && !d.open) {
      setError(null)
      setForm(
        service === 'new'
          ? emptyForm
          : {
              category: service.category,
              name_fr: service.name_fr,
              name_ar: service.name_ar,
              description_fr: service.description_fr ?? '',
              description_ar: service.description_ar ?? '',
              price: String(service.price_dzd),
              price_mode: service.price_mode ?? 'fixed',
              duration: String(service.duration_minutes),
              sort_order: String(service.sort_order),
              is_active: service.is_active,
              is_bookable_online: service.is_bookable_online,
            },
      )
      setRows(options.map((o) => ({ id: o.id, name_fr: o.name_fr, name_ar: o.name_ar, price: String(o.price_dzd), price_is_minimum: o.price_is_minimum, is_active: o.is_active })))
      d.showModal()
    }
    if (!service && d.open) d.close()
  }, [service, options])

  const setRow = (i: number, patch: Partial<OptionRow>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const set = <K extends keyof typeof emptyForm>(k: K, v: (typeof emptyForm)[K]) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const input: ServiceInput = {
      category: form.category,
      name_fr: form.name_fr.trim(),
      name_ar: form.name_ar.trim(),
      description_fr: form.description_fr.trim() || null,
      description_ar: form.description_ar.trim() || null,
      price_dzd: form.price_mode === 'quote' ? 0 : Number(form.price),
      price_mode: form.price_mode,
      duration_minutes: Number(form.duration),
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
      is_bookable_online: form.is_bookable_online,
    }
    setBusy(true)
    setError(null)
    try {
      const id = service === 'new' ? await setupApi.createService(input) : service ? (await setupApi.updateService(service.id, input), service.id) : null
      if (id) {
        await setupApi.saveOptions(
          id,
          options,
          rows
            .filter((r) => r.name_fr.trim() && r.name_ar.trim())
            .map((r, i) => ({
              id: r.id,
              name_fr: r.name_fr.trim(),
              name_ar: r.name_ar.trim(),
              price_dzd: Number(r.price) || 0,
              price_is_minimum: r.price_is_minimum,
              is_active: r.is_active,
              sort_order: i,
            })),
        )
      }
      onSaved()
    } catch (err) {
      setError(errCode(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="service-dialog-title"
      className="m-auto max-h-[calc(100svh-2rem)] w-[min(40rem,calc(100vw-2rem))] overflow-y-auto rounded-frame border border-line bg-snow p-0 text-cocoa shadow-lift backdrop:bg-cocoa/40 backdrop:backdrop-blur-sm"
    >
      {service ? (
        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-5 p-6" data-testid="service-form">
          <h2 id="service-dialog-title" className="font-display text-3xl">
            {service === 'new' ? t('admin.services.formTitleNew') : t('admin.services.formTitleEdit')}
          </h2>
          <Field label={t('admin.services.fields.category')} required>
            {({ id }) => (
              <Select id={id} name="category" value={form.category} onChange={(e) => set('category', e.target.value as ServiceInput['category'])}>
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`services.categories.${c}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('admin.services.fields.nameFr')} required>
              {({ id }) => <Input id={id} name="name_fr" lang="fr" dir="ltr" required maxLength={120} value={form.name_fr} onChange={(e) => set('name_fr', e.target.value)} />}
            </Field>
            <Field label={t('admin.services.fields.nameAr')} required>
              {({ id }) => <Input id={id} name="name_ar" lang="ar" dir="rtl" required maxLength={120} value={form.name_ar} onChange={(e) => set('name_ar', e.target.value)} />}
            </Field>
            <Field label={t('admin.services.priceMode.label')} required>
              {({ id }) => (
                <Select id={id} name="price_mode" value={form.price_mode} onChange={(e) => set('price_mode', e.target.value as PriceMode)}>
                  {(['fixed', 'from', 'quote'] as const).map((m) => (
                    <option key={m} value={m}>
                      {t(`admin.services.priceMode.${m}`)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {form.price_mode !== 'quote' ? (
              <Field label={t('admin.services.fields.price')} required>
                {({ id }) => (
                  <Input id={id} name="price" type="number" inputMode="numeric" min={0} step={1} required dir="ltr" value={form.price} onChange={(e) => set('price', e.target.value)} />
                )}
              </Field>
            ) : null}
            <Field label={t('admin.services.fields.duration')} required>
              {({ id }) => (
                <Input id={id} name="duration" type="number" inputMode="numeric" min={5} max={600} step={5} required dir="ltr" value={form.duration} onChange={(e) => set('duration', e.target.value)} />
              )}
            </Field>
            <Field label={t('admin.services.fields.descriptionFr')}>
              {({ id }) => <Textarea id={id} lang="fr" dir="ltr" maxLength={600} className="min-h-24" value={form.description_fr} onChange={(e) => set('description_fr', e.target.value)} />}
            </Field>
            <Field label={t('admin.services.fields.descriptionAr')}>
              {({ id }) => <Textarea id={id} lang="ar" dir="rtl" maxLength={600} className="min-h-24" value={form.description_ar} onChange={(e) => set('description_ar', e.target.value)} />}
            </Field>
            <Field label={t('admin.services.fields.sortOrder')}>
              {({ id }) => <Input id={id} type="number" step={1} dir="ltr" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} />}
            </Field>
          </div>
          <fieldset className="flex flex-col gap-3 rounded-soft border border-line p-4" data-testid="options-editor">
            <legend className="px-1 text-sm font-medium text-cocoa">{t('admin.services.options.title')}</legend>
            <p className="text-xs text-cocoa-muted">{t('admin.services.options.hint')}</p>
            {rows.map((r, i) => (
              <div key={r.id ?? `new-${i}`} className="grid gap-2 rounded-soft bg-ivory/60 p-3 sm:grid-cols-[1fr_1fr_8rem_auto]" data-testid="option-row">
                <Input aria-label={t('admin.services.fields.nameFr')} placeholder={t('admin.services.fields.nameFr')} lang="fr" dir="ltr" required maxLength={120} value={r.name_fr} onChange={(e) => setRow(i, { name_fr: e.target.value })} name="option_name_fr" />
                <Input aria-label={t('admin.services.fields.nameAr')} placeholder={t('admin.services.fields.nameAr')} lang="ar" dir="rtl" required maxLength={120} value={r.name_ar} onChange={(e) => setRow(i, { name_ar: e.target.value })} name="option_name_ar" />
                <Input aria-label={t('admin.services.fields.price')} placeholder={t('admin.services.fields.price')} type="number" min={0} step={1} required dir="ltr" value={r.price} onChange={(e) => setRow(i, { price: e.target.value })} name="option_price" />
                <Button variant="ghost" size="sm" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label={t('admin.services.options.remove')}>
                  <X aria-hidden className="size-4" strokeWidth={1.5} />
                </Button>
                <div className="flex flex-wrap gap-x-6 sm:col-span-4">
                  <Check label={t('admin.services.options.minimum')} checked={r.price_is_minimum} onChange={(v) => setRow(i, { price_is_minimum: v })} />
                  <Check label={t('admin.services.fields.isActive')} checked={r.is_active} onChange={(v) => setRow(i, { is_active: v })} />
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => setRows((rs) => [...rs, { name_fr: '', name_ar: '', price: '', price_is_minimum: false, is_active: true }])}
              icon={<Plus aria-hidden className="size-4" strokeWidth={1.5} />}
              data-testid="option-add"
            >
              {t('admin.services.options.add')}
            </Button>
          </fieldset>
          <div className="flex flex-col gap-3">
            <Check label={t('admin.services.fields.isActive')} checked={form.is_active} onChange={(v) => set('is_active', v)} />
            <Check label={t('admin.services.fields.isOnline')} checked={form.is_bookable_online} onChange={(v) => set('is_bookable_online', v)} />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {t(`errors.${error}`, { defaultValue: t('errors.generic') })}
            </p>
          ) : null}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              {t('admin.actions.close')}
            </Button>
            <Button type="submit" loading={busy} data-testid="service-save">
              {t('admin.services.save')}
            </Button>
          </div>
        </form>
      ) : null}
    </dialog>
  )
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm text-cocoa">
      <input type="checkbox" className="size-5 accent-[var(--color-cocoa)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}
