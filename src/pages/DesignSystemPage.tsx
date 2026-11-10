import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Wordmark } from '@/components/brand/Wordmark'
import { Seo } from '@/components/layout/Seo'
import { Badge, Button, Card, Container, EmptyState, Field, ImageFrame, Input, Ornament, PlaceholderValue, Section, Select, Skeleton, Spinner, Textarea } from '@/components/ui'
import { SERVICE_CATEGORIES } from '@/config/services'
import { makeSchemas } from '@/lib/validation'

const SWATCHES = [
  ['Beige', '#E8D6C1', 'bg-blush'],
  ['Ivoire', '#FBF7F1', 'bg-ivory'],
  ['Vieux rose', '#C99A9C', 'bg-rose'],
  ['Bordeaux', '#8E2F42', 'bg-gold'],
  ['Bordeaux profond', '#3F1220', 'bg-cocoa'],
  ['Blanc', '#FFFFFF', 'bg-snow'],
  ['Bordeaux (texte)', '#6E1F30', 'bg-gold-ink'],
] as const

const STATUSES = ['pending', 'confirmed', 'rejected', 'reschedule_requested', 'cancelled', 'completed', 'no_show'] as const
const STATUS_TONE = { pending: 'warning', confirmed: 'success', rejected: 'danger', reschedule_requested: 'gold', cancelled: 'muted', completed: 'neutral', no_show: 'danger' } as const

/** DEV ONLY (/fr/design-system): living reference of tokens and components. */
export function DesignSystemPage() {
  const { t } = useTranslation()
  const [valid, setValid] = useState(false)
  const schema = useMemo(() => {
    const s = makeSchemas(t)
    return z.object({ name: s.name, phone: s.phone, email: s.optionalEmail, category: z.string().min(1, t('validation.required')), message: s.message })
  }, [t]) // t changes with the language, so messages follow it
  type Values = z.input<typeof schema>
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '', phone: '', email: '', category: '', message: '' } })

  return (
    <>
      <Seo title="Design system" noindex />
      <Section tone="ivory" className="pt-header">
        <Container className="flex flex-col gap-16 pt-12">
          <header className="flex flex-col gap-4">
            <span className="eyebrow">Design system</span>
            <Wordmark size="lg" />
          </header>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {SWATCHES.map(([name, hex, cls]) => (
              <div key={name} className="flex flex-col gap-2">
                <div className={`${cls} h-24 rounded-card border border-line`} />
                <p className="text-sm font-medium">{name}</p>
                <p className="text-xs text-cocoa-muted" dir="ltr">{hex}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-display-lg font-display">Display large</p>
            <p className="text-display-md font-display">Display medium</p>
            <p className="text-display-sm font-display">Display small</p>
            <p className="text-lead text-cocoa-soft">Lead — DM Sans / Cairo body copy.</p>
            <p className="font-arabic text-xl" dir="rtl" lang="ar">جمالكِ، لحظتكِ — خط Cairo للعربية</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="gold" withArrow>Bordeaux</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link" withArrow>Link</Button>
            <Button loading>Loading</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {STATUSES.map((s) => (
              <Badge key={s} tone={STATUS_TONE[s]}>{t(`booking.status.${s}`)}</Badge>
            ))}
            <PlaceholderValue />
            <Spinner />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card interactive><p className="font-display text-2xl">Card</p><p className="text-sm text-cocoa-soft">Interactive card</p></Card>
            <Card><Skeleton className="mb-3 h-6 w-2/3" /><Skeleton className="h-4 w-full" /></Card>
            <ImageFrame shape="wide" variant={3} />
          </div>

          <EmptyState title={t('states.empty')} description={t('pages.inProgress')} />

          <Card className="max-w-2xl">
            <form
              noValidate
              className="grid gap-5 sm:grid-cols-2"
              onSubmit={handleSubmit(() => setValid(true), () => setValid(false))}
            >
              <Field label="Nom complet / الاسم الكامل" required error={errors.name?.message}>
                {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} autoComplete="name" {...register('name')} />}
              </Field>
              <Field label="Téléphone / الهاتف" required hint="05 / 06 / 07…" error={errors.phone?.message}>
                {({ id, describedBy, invalid }) => <Input id={id} dir="ltr" type="tel" inputMode="tel" aria-describedby={describedBy} invalid={invalid} autoComplete="tel" {...register('phone')} />}
              </Field>
              <Field label="E-mail" optionalLabel="optionnel" error={errors.email?.message}>
                {({ id, describedBy, invalid }) => <Input id={id} dir="ltr" type="email" aria-describedby={describedBy} invalid={invalid} {...register('email')} />}
              </Field>
              <Field label="Catégorie" required error={errors.category?.message}>
                {({ id, describedBy, invalid }) => (
                  <Select id={id} aria-describedby={describedBy} invalid={invalid} {...register('category')}>
                    <option value="">—</option>
                    {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{t(`services.categories.${c}`)}</option>)}
                  </Select>
                )}
              </Field>
              <Field label="Message" required error={errors.message?.message} className="sm:col-span-2">
                {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} invalid={invalid} {...register('message')} />}
              </Field>
              <div className="flex items-center gap-4 sm:col-span-2">
                <Button type="submit" loading={isSubmitting}>{t('actions.send')}</Button>
                {valid ? <span className="inline-flex items-center gap-2 text-sm text-success" data-testid="form-valid"><CheckCircle2 className="size-4" /> Validation OK (client)</span> : null}
              </div>
            </form>
          </Card>
          <Ornament />
        </Container>
      </Section>
    </>
  )
}
