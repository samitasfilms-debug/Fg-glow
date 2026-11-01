import { Navigate, Outlet, useParams } from 'react-router-dom'
import { isLocale, detectPreferredLocale } from '@/i18n/config'
import { LocaleProvider } from '@/i18n/LocaleContext'

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
