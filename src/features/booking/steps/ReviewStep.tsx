import { Banknote, CalendarDays, Info, Pencil, Scissors, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocale } from '@/i18n/locale-context'
import { formatLongDate, formatTime } from '@/lib/datetime'
import { formatDuration, formatPrice } from '@/lib/format'
import { ServicePrice, TotalPrice } from '../components/Price'
import type { CatalogService, CatalogStaff } from '../api'
import type { BookingDraft } from '../useBookingDraft'

interface Props {
  services: CatalogService[]
  optionIds: string[]
  priceIsMinimum: boolean
  hasQuote: boolean
  staff: CatalogStaff | null
  slot: string
  customer: BookingDraft['customer']
  totalPrice: number
  totalDuration: number
  onEdit: (step: number) => void
}

export function ReviewStep({ services, optionIds, priceIsMinimum, hasQuote, staff, slot, customer, totalPrice, totalDuration, onEdit }: Props) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const name = (s: CatalogService) => (locale === 'ar' ? s.name_ar : s.name_fr)

  return (
    <section aria-labelledby="step-review-title" className="flex flex-col gap-6">
      <h2 id="step-review-title" className="text-display-sm">
        {t('booking.review.title')}
      </h2>

      <div className="grid gap-5 lg:grid-cols-2">
        <Block icon={<Scissors className="size-4" />} title={t('booking.review.services')} onEdit={() => onEdit(0)} className="lg:row-span-2">
          <ul className="divide-y divide-line" data-testid="review-services">
            {services.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-4 py-3">
                <span className="flex flex-col">
                  <span className="text-cocoa">{name(s)}</span>
                  <span className="text-xs text-cocoa-muted">{formatDuration(s.duration_minutes, locale)}</span>
                  {(s.options ?? [])
                    .filter((o) => optionIds.includes(o.id))
                    .map((o) => (
                      <span key={o.id} className="mt-1 flex justify-between gap-4 text-sm text-cocoa-soft" data-testid="review-option">
                        <span>+ {locale === 'ar' ? o.name_ar : o.name_fr}</span>
                        <span className="tabular-nums">
                          {o.price_is_minimum ? `${t('booking.options.from')} ` : ''}
                          {formatPrice(o.price_dzd, locale)}
                        </span>
                      </span>
                    ))}
                </span>
                <span className="shrink-0 tabular-nums text-cocoa">
                  <ServicePrice amount={s.price_dzd} mode={s.price_mode} />
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-end justify-between border-t border-line-strong pt-4">
            <span className="flex flex-col text-sm text-cocoa-soft">
              <span>{t('booking.summary.total')}</span>
              <span className="text-xs">
                {t('booking.summary.duration')} : <span data-testid="review-duration">{formatDuration(totalDuration, locale)}</span>
              </span>
            </span>
            <span className="font-display text-3xl text-cocoa" data-testid="review-total">
              <TotalPrice amount={totalPrice} isMinimum={priceIsMinimum} hasQuote={hasQuote} prefixClassName="text-base" />
            </span>
          </div>
        </Block>

        <Block icon={<CalendarDays className="size-4" />} title={t('booking.review.appointment')} onEdit={() => onEdit(1)}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-cocoa-muted">{t('booking.review.date')}</dt>
            <dd className="text-cocoa first-letter:uppercase">{formatLongDate(slot, locale)}</dd>
            <dt className="text-cocoa-muted">{t('booking.review.time')}</dt>
            <dd className="text-cocoa tabular-nums">
              <bdi>{formatTime(slot, locale)}</bdi>
            </dd>
            {staff ? (
              <>
                <dt className="text-cocoa-muted">{t('booking.datetime.professional')}</dt>
                <dd className="text-cocoa">{staff.display_name}</dd>
              </>
            ) : null}
          </dl>
        </Block>

        <Block icon={<UserRound className="size-4" />} title={t('booking.review.customer')} onEdit={() => onEdit(2)}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-cocoa-muted">{t('booking.details.fullName')}</dt>
            <dd className="text-cocoa">{customer.fullName}</dd>
            <dt className="text-cocoa-muted">{t('booking.details.phone')}</dt>
            <dd className="text-cocoa">
              <bdi dir="ltr">{customer.phone}</bdi>
            </dd>
            {customer.email ? (
              <>
                <dt className="text-cocoa-muted">{t('booking.details.email')}</dt>
                <dd className="break-all text-cocoa">
                  <bdi dir="ltr">{customer.email}</bdi>
                </dd>
              </>
            ) : null}
            {customer.notes ? (
              <>
                <dt className="text-cocoa-muted">{t('booking.details.notes')}</dt>
                <dd className="whitespace-pre-line text-cocoa">{customer.notes}</dd>
              </>
            ) : null}
          </dl>
        </Block>
      </div>

      <div className="flex items-start gap-3 rounded-card border border-line bg-snow p-4 text-sm">
        <Banknote aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-ink" strokeWidth={1.5} />
        <p>
          <span className="font-medium text-cocoa">{t('booking.review.payment')} : </span>
          <span className="text-cocoa-soft">{t('booking.review.paymentOnSite')}</span>
        </p>
      </div>
      <div className="flex items-start gap-3 rounded-card bg-blush-100/70 p-4 text-sm text-cocoa" role="note">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-ink" strokeWidth={1.5} />
        <p>{t('booking.review.pendingNotice')}</p>
      </div>
    </section>
  )
}

function Block({ icon, title, onEdit, children, className }: { icon: ReactNode; title: string; onEdit: () => void; children: ReactNode; className?: string }) {
  const { t } = useTranslation()
  return (
    <div className={`rounded-card border border-line bg-snow p-5 shadow-soft ${className ?? ''}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-sm font-medium tracking-wide text-cocoa uppercase">
          <span aria-hidden className="text-gold-ink">
            {icon}
          </span>
          {title}
        </h3>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs text-cocoa-soft hover:bg-blush-100 hover:text-cocoa"
        >
          <Pencil aria-hidden className="size-3.5" strokeWidth={1.5} />
          {t('booking.nav.edit')}
          <span className="sr-only"> — {title}</span>
        </button>
      </div>
      {children}
    </div>
  )
}
