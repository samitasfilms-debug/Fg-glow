import { motion } from 'framer-motion'
import { Check, Clock3, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ArtPlaceholder } from '@/components/ui/ImageFrame'
import { useLocale } from '@/i18n/locale-context'
import { cn } from '@/lib/cn'
import { formatDuration, formatPrice } from '@/lib/format'
import type { CatalogService } from '../api'

interface ServiceCardProps {
  service: CatalogService
  selected: boolean
  disabled: boolean
  onToggle: () => void
  index: number
}

export function ServiceCard({ service, selected, disabled, onToggle, index }: ServiceCardProps) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const name = locale === 'ar' ? service.name_ar : service.name_fr
  const description = locale === 'ar' ? service.description_ar : service.description_fr

  return (
    <motion.li layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: Math.min(index, 8) * 0.04 }}>
      <label
        className={cn(
          'group relative flex h-full cursor-pointer gap-4 overflow-hidden rounded-card border bg-snow p-3 transition-[border-color,box-shadow] duration-300 sm:flex-col sm:p-0',
          selected ? 'border-gold shadow-glow' : 'border-line hover:border-line-strong hover:shadow-soft',
          disabled && !selected && 'cursor-not-allowed opacity-55',
        )}
      >
        <input
          type="checkbox"
          className="peer sr-only"
          checked={selected}
          disabled={disabled && !selected}
          onChange={onToggle}
          aria-describedby={`svc-${service.id}-meta`}
        />
        <span className="relative block size-24 shrink-0 overflow-hidden rounded-soft sm:aspect-[4/3] sm:size-auto sm:w-full sm:rounded-none">
          {service.image_url ? (
            <img src={service.image_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <ArtPlaceholder variant={index} />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-2 sm:p-5">
          <span className="flex items-start justify-between gap-3">
            <span className="font-display text-xl leading-tight text-cocoa sm:text-2xl">{name}</span>
            <span
              aria-hidden
              className={cn(
                'inline-flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-300',
                selected ? 'border-gold bg-gold text-snow' : 'border-line-strong text-cocoa-soft group-hover:border-cocoa',
              )}
            >
              {selected ? <Check className="size-4" strokeWidth={2} /> : <Plus className="size-4" strokeWidth={1.5} />}
            </span>
          </span>
          {description ? <span className="line-clamp-2 text-sm text-cocoa-soft">{description}</span> : null}
          <span id={`svc-${service.id}-meta`} className="mt-auto flex items-center justify-between gap-3 pt-1">
            <span className="inline-flex items-center gap-1.5 text-sm text-cocoa-muted">
              <Clock3 aria-hidden className="size-3.5" strokeWidth={1.5} />
              {formatDuration(service.duration_minutes, locale)}
            </span>
            <span className="font-medium text-cocoa">{formatPrice(service.price_dzd, locale)}</span>
          </span>
          <span className="sr-only">{selected ? t('booking.services.selected') : t('booking.services.select')}</span>
        </span>
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-card ring-gold-ink peer-focus-visible:ring-2" />
      </label>
    </motion.li>
  )
}
