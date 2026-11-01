import { PencilLine } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

/**
 * Clearly identified placeholder for business information that has not been
 * provided yet (address, phone, hours…). Never replace with invented values.
 */
export function PlaceholderValue({ label, className }: { label?: string; className?: string }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-dashed border-current/30 px-2.5 py-0.5 text-xs font-medium opacity-70',
        className,
      )}
      data-placeholder="true"
    >
      <PencilLine aria-hidden className="size-3" strokeWidth={1.75} />
      {label ?? t('placeholder.toBeProvided')}
    </span>
  )
}
