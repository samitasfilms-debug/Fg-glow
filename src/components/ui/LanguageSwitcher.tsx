import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { LOCALES, LOCALE_META } from '@/i18n/config'
import { useLocale } from '@/i18n/locale-context'
import { swapLocaleInPath } from '@/i18n/paths'
import { cn } from '@/lib/cn'

/** FR / ع segmented switch. Keeps the current page, query and hash. */
export function LanguageSwitcher({ className, tone = 'dark' }: { className?: string; tone?: 'dark' | 'light' }) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const { pathname, search, hash } = useLocation()

  return (
    <nav aria-label={t('a11y.language')} className={cn('inline-flex items-center rounded-full border p-0.5', tone === 'light' ? 'border-ivory/30' : 'border-cocoa/15', className)}>
      {LOCALES.map((l) => {
        const active = l === locale
        const meta = LOCALE_META[l]
        return (
          <Link
            key={l}
            to={swapLocaleInPath(pathname, search, hash, l)}
            hrefLang={meta.htmlLang}
            lang={meta.htmlLang}
            aria-current={active ? 'true' : undefined}
            aria-label={active ? meta.label : t('actions.switchTo', { language: meta.label })}
            className={cn(
              'inline-flex min-h-9 min-w-10 items-center justify-center rounded-full px-3 text-xs font-semibold tracking-wider transition-colors duration-300',
              l === 'ar' && 'font-arabic text-sm',
              active
                ? tone === 'light'
                  ? 'bg-ivory text-cocoa'
                  : 'bg-cocoa text-ivory'
                : tone === 'light'
                  ? 'text-ivory/80 hover:text-ivory'
                  : 'text-cocoa-soft hover:text-cocoa',
            )}
          >
            {meta.short}
          </Link>
        )
      })}
    </nav>
  )
}
