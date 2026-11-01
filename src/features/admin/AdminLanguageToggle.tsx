import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LOCALE_META } from '@/i18n/config'
import { useLocale } from '@/i18n/locale-context'
import { useSetAdminLocale } from './admin-locale'

export function AdminLanguageToggle() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const setLocale = useSetAdminLocale()
  const next = locale === 'fr' ? 'ar' : 'fr'
  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      lang={LOCALE_META[next].htmlLang}
      aria-label={t('actions.switchTo', { language: LOCALE_META[next].label })}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 text-sm text-cocoa hover:border-cocoa"
    >
      <Languages aria-hidden className="size-4" strokeWidth={1.5} />
      {LOCALE_META[next].label}
    </button>
  )
}
