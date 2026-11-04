import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CalendarClock } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seo } from '@/components/layout/Seo'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Skeleton } from '@/components/ui/Spinner'
import { useLocalePath } from '@/hooks/useLocalePath'
import { useLocale } from '@/i18n/locale-context'
import { salonToday } from '@/lib/datetime'
import { EASE_LUXE } from '@/lib/motion'
import { supabase } from '@/lib/supabase'
import { BookingError, bookingApi, type BookingResult, type BookingStatus, type CatalogService, type CatalogStaff } from './api'
import { SelectionSummary } from './components/SelectionSummary'
import { Stepper } from './components/Stepper'
import { STEP_KEYS } from './step-keys'
import { SuccessView } from './components/SuccessView'
import { DateTimeStep } from './steps/DateTimeStep'
import { DETAILS_FORM_ID, DetailsStep } from './steps/DetailsStep'
import { ReviewStep } from './steps/ReviewStep'
import { ServicesStep } from './steps/ServicesStep'
import { useBookingDraft, type BookingDraft } from './useBookingDraft'

type Setup =
  | { status: 'loading' }
  | { status: 'error'; code: string }
  | { status: 'ready'; booking: BookingStatus; services: CatalogService[]; staff: CatalogStaff[] }

export function BookingPage() {
  const { t } = useTranslation()
  const to = useLocalePath()
  const [setup, setSetup] = useState<Setup>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!supabase) return
    let alive = true
    Promise.all([bookingApi.status(), bookingApi.catalog()])
      .then(([booking, catalog]) => alive && setSetup({ status: 'ready', booking, services: catalog.services, staff: catalog.staff }))
      .catch((e: unknown) => alive && setSetup({ status: 'error', code: e instanceof BookingError ? e.code : 'generic' }))
    return () => {
      alive = false
    }
  }, [attempt])

  const retry = () => {
    setSetup({ status: 'loading' })
    setAttempt((n) => n + 1)
  }

  let body
  if (!supabase) {
    body = <EmptyState icon={<CalendarClock className="size-7" strokeWidth={1.25} />} title={t('booking.unavailable.notConfigured')} />
  } else if (setup.status === 'loading') {
    body = (
      <div className="flex flex-col gap-6" aria-busy>
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    )
  } else if (setup.status === 'error') {
    body = (
      <EmptyState
        icon={<AlertCircle className="size-7" strokeWidth={1.25} />}
        title={t(`errors.${setup.code}`, { defaultValue: t('errors.generic') })}
        action={<Button onClick={retry}>{t('states.retry')}</Button>}
      />
    )
  } else if (!setup.booking.enabled || !setup.booking.has_hours || setup.services.length === 0) {
    body = (
      <EmptyState
        icon={<CalendarClock className="size-7" strokeWidth={1.25} />}
        title={t('booking.unavailable.closed')}
        description={t('booking.unavailable.closedBody')}
        action={
          <ButtonLink to={to('contact')} variant="outline" className="mt-2">
            {t('nav.contact')}
          </ButtonLink>
        }
      />
    )
  } else {
    body = <BookingFlow booking={setup.booking} services={setup.services} staff={setup.staff} onCatalogStale={retry} />
  }

  return (
    <>
      <Seo title={t('booking.title')} description={t('booking.intro')} />
      <Section tone="ivory" className="pt-header">
        <Container className="flex flex-col gap-10 pt-10 md:gap-14 md:pt-16">
          <SectionHeading as="h1" eyebrow={t('booking.eyebrow')} title={t('booking.title')} lead={t('booking.intro')} />
          {body}
        </Container>
      </Section>
    </>
  )
}

interface FlowProps {
  booking: BookingStatus
  services: CatalogService[]
  staff: CatalogStaff[]
  onCatalogStale: () => void
}

function BookingFlow({ booking, services, staff, onCatalogStale }: FlowProps) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const { draft, update, reset } = useBookingDraft()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ result: BookingResult; name: string; phone: string } | null>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const today = salonToday(booking.timezone)

  // Selection is always re-read from the database catalogue: a service removed
  // since the draft was saved silently disappears, prices are never cached.
  const selected = useMemo(() => services.filter((s) => draft.serviceIds.includes(s.id)), [services, draft.serviceIds])
  const selectedOptions = useMemo(
    () => selected.flatMap((s) => (s.options ?? []).filter((o) => draft.optionIds.includes(o.id))),
    [selected, draft.optionIds],
  )
  const totalPrice = selected.reduce((n, s) => n + s.price_dzd, 0) + selectedOptions.reduce((n, o) => n + o.price_dzd, 0)
  const priceIsMinimum = selectedOptions.some((o) => o.price_is_minimum)
  const totalDuration = selected.reduce((n, s) => n + s.duration_minutes, 0)
  const maxSelectable = booking.allow_multiple_services ? Math.max(1, booking.max_services_per_booking) : 1
  const eligibleStaff = useMemo(
    () => staff.filter((p) => selected.length > 0 && selected.every((s) => p.service_ids.includes(s.id))),
    [staff, selected],
  )

  // Keep the draft coherent with the catalogue and with the steps already completed.
  useEffect(() => {
    const ids = selected.map((s) => s.id)
    const patch: Partial<BookingDraft> = {}
    if (ids.length !== draft.serviceIds.length) patch.serviceIds = ids
    // Supplements only survive while their service is selected (and still offered).
    const optionIds = selectedOptions.map((o) => o.id)
    if (optionIds.length !== draft.optionIds.length) patch.optionIds = optionIds
    if (draft.staffId && !eligibleStaff.some((p) => p.id === draft.staffId)) Object.assign(patch, { staffId: null, day: null, slot: null })
    if (draft.day && draft.day < today) Object.assign(patch, { day: null, slot: null })
    let step = draft.step
    if (step > 0 && ids.length === 0) step = 0
    if (step > 1 && !draft.slot) step = Math.min(step, 1)
    if (step > 2 && (!draft.customer.fullName || !draft.customer.phone)) step = 2
    if (step !== draft.step) patch.step = step
    if (Object.keys(patch).length) update(patch)
  }, [selected, selectedOptions, eligibleStaff, draft, today, update])

  const goTo = (step: number) => {
    setError(null)
    update({ step })
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const canNext = draft.step === 0 ? selected.length > 0 : draft.step === 1 ? Boolean(draft.slot) : true
  const hint = draft.step === 0 ? t('booking.services.required') : t('booking.datetime.required')

  const onCustomerDraft = useCallback((customer: BookingDraft['customer']) => update({ customer }), [update])

  const submit = async () => {
    if (!draft.slot || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await bookingApi.create({
        full_name: draft.customer.fullName.trim(),
        phone: draft.customer.phone.replace(/[\s.-]/g, ''),
        email: draft.customer.email.trim() || undefined,
        notes: draft.customer.notes.trim() || undefined,
        locale,
        service_ids: selected.map((s) => s.id),
        option_ids: selectedOptions.map((o) => o.id),
        staff_id: draft.staffId,
        starts_at: draft.slot,
      })
      setDone({ result, name: draft.customer.fullName.trim(), phone: draft.customer.phone.trim() })
      reset()
      requestAnimationFrame(() => {
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        document.getElementById('booking-success-title')?.focus({ preventScroll: true })
      })
    } catch (e) {
      const code = e instanceof BookingError ? e.code : 'generic'
      setError(code)
      if (code === 'FGG_SLOT_UNAVAILABLE' || code === 'FGG_STAFF_UNAVAILABLE') update({ step: 1, slot: null })
      if (code === 'FGG_SERVICE_UNAVAILABLE' || code === 'FGG_INVALID_SERVICES' || code === 'FGG_INVALID_OPTIONS') {
        update({ step: 0, slot: null })
        onCatalogStale()
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div ref={topRef} className="scroll-mt-32">
        <SuccessView result={done.result} name={done.name} phone={done.phone} onRestart={() => setDone(null)} />
      </div>
    )
  }

  const step = STEP_KEYS[draft.step]
  return (
    <div ref={topRef} className="flex scroll-mt-32 flex-col gap-8 pb-28 md:pb-0" data-testid="booking-flow" data-step={step}>
      <Stepper current={draft.step} onGoTo={goTo} />

      {error ? (
        <div role="alert" className="flex items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-4 text-sm text-danger" data-testid="booking-error">
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p>{t(`errors.${error}`, { defaultValue: t('errors.generic') })}</p>
        </div>
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: EASE_LUXE }}
        >
          {draft.step === 0 ? (
            <ServicesStep
              services={services}
              selectedIds={draft.serviceIds}
              optionIds={draft.optionIds}
              maxSelectable={maxSelectable}
              onChange={(serviceIds) => update({ serviceIds, day: null, slot: null })}
              onOptionsChange={(optionIds) => update({ optionIds })}
            />
          ) : draft.step === 1 ? (
            <DateTimeStep
              serviceIds={draft.serviceIds}
              staffMode={booking.staff_mode}
              staff={eligibleStaff}
              staffId={draft.staffId}
              day={draft.day}
              slot={draft.slot}
              today={today}
              maxAdvanceDays={booking.max_advance_days}
              onChange={update}
            />
          ) : draft.step === 2 ? (
            <DetailsStep defaultValues={draft.customer} onDraftChange={onCustomerDraft} onValid={(customer) => {
              update({ customer })
              goTo(3)
            }} />
          ) : draft.slot ? (
            <ReviewStep
              services={selected}
              optionIds={draft.optionIds}
              priceIsMinimum={priceIsMinimum}
              staff={staff.find((p) => p.id === draft.staffId) ?? null}
              slot={draft.slot}
              customer={draft.customer}
              totalPrice={totalPrice}
              totalDuration={totalDuration}
              onEdit={goTo}
            />
          ) : null}
        </motion.div>
      </AnimatePresence>

      {/* Navigation + running total. Sticky at the bottom on mobile. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ivory/95 px-4 py-3 shadow-[0_-8px_24px_rgb(68_52_58/0.06)] backdrop-blur md:static md:z-auto md:rounded-card md:border md:bg-snow md:px-6 md:py-5 md:shadow-soft">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-8">
          <SelectionSummary count={selected.length} totalPrice={totalPrice} totalDuration={totalDuration} priceIsMinimum={priceIsMinimum} className="md:flex-1" />
          <div className="flex items-center gap-3">
            {draft.step > 0 ? (
              <Button variant="ghost" onClick={() => goTo(draft.step - 1)} disabled={submitting} className="flex-1 md:flex-none">
                {t('booking.nav.back')}
              </Button>
            ) : null}
            {draft.step < 2 ? (
              <Button
                withArrow
                onClick={() => canNext && goTo(draft.step + 1)}
                aria-disabled={!canNext}
                title={canNext ? undefined : hint}
                className={canNext ? 'flex-1 md:flex-none' : 'flex-1 opacity-50 md:flex-none'}
                data-testid="booking-next"
              >
                {t('booking.nav.next')}
              </Button>
            ) : draft.step === 2 ? (
              <Button type="submit" form={DETAILS_FORM_ID} withArrow className="flex-1 md:flex-none" data-testid="booking-next">
                {t('booking.nav.next')}
              </Button>
            ) : (
              <Button variant="gold" onClick={submit} loading={submitting} className="flex-1 md:flex-none" data-testid="booking-submit">
                {submitting ? t('booking.nav.submitting') : t('booking.nav.submit')}
              </Button>
            )}
          </div>
        </div>
        {!canNext ? <p className="mt-2 text-center text-xs text-cocoa-muted md:text-end">{hint}</p> : null}
      </div>
    </div>
  )
}
