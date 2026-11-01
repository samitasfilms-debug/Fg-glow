import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ar from './locales/ar'
import fr from './locales/fr'
import { DEFAULT_LOCALE, LOCALES, applyDocumentLocale, detectPreferredLocale, isLocale } from './config'

export const resources = {
  fr: { translation: fr },
  ar: { translation: ar },
} as const

// The URL (/fr/…, /ar/…) is the source of truth. Read it once at boot so the
// first paint already has the right language and direction.
const fromPath = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : undefined
const initial = isLocale(fromPath) ? fromPath : typeof window !== 'undefined' ? detectPreferredLocale() : DEFAULT_LOCALE

void i18n.use(initReactI18next).init({
  resources,
  lng: initial,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: [...LOCALES],
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
})

if (typeof document !== 'undefined') applyDocumentLocale(initial)

export default i18n
