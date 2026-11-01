import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { makeSchemas } from '@/lib/validation'
import type { BookingDraft } from '../useBookingDraft'

export const DETAILS_FORM_ID = 'booking-details'
type Customer = BookingDraft['customer']

interface Props {
  defaultValues: Customer
  /** called on every change so the draft survives refreshes */
  onDraftChange: (values: Customer) => void
  /** called with validated values when the form is submitted */
  onValid: (values: Customer) => void
}

export function DetailsStep({ defaultValues, onDraftChange, onValid }: Props) {
  const { t, i18n } = useTranslation()
  // Rebuilt when the language changes so messages follow the locale.
  const schema = useMemo(() => {
    const s = makeSchemas(t)
    return z.object({
      fullName: s.name,
      phone: s.phone,
      email: s.optionalEmail,
      notes: z.string().trim().max(500, t('validation.tooLong', { count: 500 })),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, i18n.language])

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors, isSubmitted },
  } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onTouched',
  })

  useEffect(() => {
    const sub = watch((v) => onDraftChange({ fullName: v.fullName ?? '', phone: v.phone ?? '', email: v.email ?? '', notes: v.notes ?? '' }))
    return () => sub.unsubscribe()
  }, [watch, onDraftChange])

  // Re-translate visible errors after a language switch.
  useEffect(() => {
    if (isSubmitted) void trigger()
  }, [schema, isSubmitted, trigger])

  return (
    <section aria-labelledby="step-details-title" className="flex flex-col gap-6">
      <h2 id="step-details-title" className="text-display-sm">
        {t('booking.details.title')}
      </h2>
      <form id={DETAILS_FORM_ID} noValidate onSubmit={handleSubmit(onValid)} className="grid max-w-2xl gap-5 sm:grid-cols-2">
        <Field label={t('booking.details.fullName')} required error={errors.fullName?.message} className="sm:col-span-2">
          {({ id, describedBy, invalid }) => (
            <Input id={id} aria-describedby={describedBy} invalid={invalid} autoComplete="name" required {...register('fullName')} />
          )}
        </Field>
        <Field label={t('booking.details.phone')} required hint={t('booking.details.phoneHint')} error={errors.phone?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              className="text-start rtl:text-end"
              placeholder="05 XX XX XX XX"
              required
              {...register('phone')}
            />
          )}
        </Field>
        <Field label={t('booking.details.email')} optionalLabel={t('booking.details.optional')} error={errors.email?.message}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} aria-describedby={describedBy} invalid={invalid} type="email" autoComplete="email" dir="ltr" {...register('email')} />
          )}
        </Field>
        <Field label={t('booking.details.notes')} optionalLabel={t('booking.details.optional')} error={errors.notes?.message} className="sm:col-span-2">
          {({ id, describedBy, invalid }) => (
            <Textarea id={id} aria-describedby={describedBy} invalid={invalid} maxLength={500} placeholder={t('booking.details.notesPlaceholder')} {...register('notes')} />
          )}
        </Field>
      </form>
    </section>
  )
}
