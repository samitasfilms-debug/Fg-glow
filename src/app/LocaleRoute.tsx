import { Navigate, Outlet, useParams } from 'react-router-dom'
import { isLocale, detectPreferredLocale } from '@/i18n/config'
import { LocaleProvider } from '@/i18n/LocaleContext'
import { ROUTES } from '@/i18n/paths'

/** Validates the :lang segment and provides the locale to the subtree. */
export function LocaleRoute() {
  const { lang } = useParams()
  if (!isLocale(lang)) return <Navigate to={`/${detectPreferredLocale()}`} replace />
  return (
    <LocaleProvider locale={lang}>
      <Outlet />
    </LocaleProvider>
  )
}

/** "/" → "/fr" or "/ar" depending on saved choice / browser language. */
export function RootRedirect() {
  return <Navigate to={`/${detectPreferredLocale()}`} replace />
}

/** /booking and /:lang/booking → localized booking page. */
export function BookingAlias() {
  const { lang } = useParams()
  return <Navigate to={`/${isLocale(lang) ? lang : detectPreferredLocale()}/${ROUTES.booking}`} replace />
}
