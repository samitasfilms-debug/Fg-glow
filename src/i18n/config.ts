export const LOCALES = ['fr', 'ar'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'fr'
export const LOCALE_STORAGE_KEY = 'fg-glow.locale'

export const LOCALE_META: Record<Locale, { dir: 'ltr' | 'rtl'; htmlLang: string; label: string; short: string }> = {
  fr: { dir: 'ltr', htmlLang: 'fr', label: 'Français', short: 'FR' },
  ar: { dir: 'rtl', htmlLang: 'ar', label: 'العربية', short: 'عربي' },
}

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value)
}

/** Locale preference: saved choice → browser language → French. */
export function detectPreferredLocale(): Locale {
  try {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (isLocale(saved)) return saved
  } catch {
    /* storage unavailable (private mode) */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : []
  if (nav.some((l) => l?.toLowerCase().startsWith('ar'))) return 'ar'
  return DEFAULT_LOCALE
}

export function rememberLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    /* ignore */
  }
}

/** Apply lang/dir on <html> so CSS, fonts and logical properties follow. */
export function applyDocumentLocale(locale: Locale) {
  const meta = LOCALE_META[locale]
  document.documentElement.lang = meta.htmlLang
  document.documentElement.dir = meta.dir
}
