import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SERVICE_CATEGORIES } from '@/config/services'
import { cn } from '@/lib/cn'
import type { CatalogService } from '../api'
import { ServiceCard } from '../components/ServiceCard'

interface Props {
  services: CatalogService[]
  selectedIds: string[]
  optionIds: string[]
  maxSelectable: number
  onChange: (ids: string[]) => void
  onOptionsChange: (ids: string[]) => void
}

export function ServicesStep({ services, selectedIds, optionIds, maxSelectable, onChange, onOptionsChange }: Props) {
  const { t } = useTranslation()
  const [category, setCategory] = useState<string>('all')

  // Only categories that actually contain services are offered as filters.
  const categories = useMemo(
    () => SERVICE_CATEGORIES.filter((c) => services.some((s) => s.category === c)),
    [services],
  )
  const visible = category === 'all' ? services : services.filter((s) => s.category === category)
  const maxReached = selectedIds.length >= maxSelectable

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id))
    else if (maxSelectable === 1) onChange([id])
    else if (!maxReached) onChange([...selectedIds, id])
  }

  return (
    <section aria-labelledby="step-services-title" className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 id="step-services-title" className="text-display-sm">
          {t('booking.services.title')}
        </h2>
        <p className="text-sm text-cocoa-soft">
          {maxSelectable > 1 ? t('booking.services.hint', { max: maxSelectable }) : t('booking.services.hintSingle')}
          {maxReached && maxSelectable > 1 ? <span className="ms-2 text-gold-ink">{t('booking.services.maxReached')}</span> : null}
        </p>
      </header>

      {categories.length > 1 ? (
        <div role="radiogroup" aria-label={t('nav.services')} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {['all', ...categories].map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                'inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm transition-colors duration-300',
                category === c ? 'border-cocoa bg-cocoa text-ivory' : 'border-line-strong bg-snow text-cocoa-soft hover:border-cocoa hover:text-cocoa',
              )}
            >
              {c === 'all' ? t('booking.services.all') : t(`services.categories.${c as (typeof SERVICE_CATEGORIES)[number]}`)}
            </button>
          ))}
        </div>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((s, i) => (
          <ServiceCard
            key={s.id}
            service={s}
            index={i}
            selected={selectedIds.includes(s.id)}
            disabled={maxReached && maxSelectable > 1}
            onToggle={() => toggle(s.id)}
            optionIds={optionIds}
            onToggleOption={(id) => onOptionsChange(optionIds.includes(id) ? optionIds.filter((x) => x !== id) : [...optionIds, id])}
          />
        ))}
      </ul>
    </section>
  )
}
