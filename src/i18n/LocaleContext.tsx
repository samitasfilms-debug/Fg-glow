import { useLayoutEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LOCALE_META, applyDocumentLocale, rememberLocale, type Locale } from './config'
import { LocaleContext } from './locale-context'


/** Keeps i18next, <html lang/dir> and the saved preference in sync with the URL locale. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const { i18n } = useTranslation()

  // Layout effect: bundled resources make changeLanguage synchronous, so the
  // re-render happens before the browser paints (no flash of the old language).
  useLayoutEffect(() => {
    if (i18n.language !== locale) void i18n.changeLanguage(locale)
    applyDocumentLocale(locale)
    rememberLocale(locale)
  }, [i18n, locale])

  const dir = LOCALE_META[locale].dir
  return <LocaleContext.Provider value={{ locale, dir, isRtl: dir === 'rtl' }}>{children}</LocaleContext.Provider>
}
