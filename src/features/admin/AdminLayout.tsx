import { CalendarDays, Clock, ExternalLink, LogOut, Scissors } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Navigate, Outlet } from 'react-router-dom'
import { Seo } from '@/components/layout/Seo'
import { Wordmark } from '@/components/brand/Wordmark'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { useLocale } from '@/i18n/locale-context'
import { localePath } from '@/i18n/paths'
import { cn } from '@/lib/cn'
import { AdminLanguageToggle } from './AdminLanguageToggle'
import { useAdminSession } from './session-context'

const NAV = [
  { to: '/admin/rendez-vous', key: 'appointments', Icon: CalendarDays },
  { to: '/admin/prestations', key: 'services', Icon: Scissors },
  { to: '/admin/horaires', key: 'setup', Icon: Clock },
] as const

/** Authenticated shell. Anything not "ready" goes back to the login page. */
export function AdminLayout() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const { session, signOut } = useAdminSession()

  if (session.status === 'loading')
    return (
      <div className="flex min-h-svh items-center justify-center bg-ivory">
        <Spinner />
      </div>
    )
  if (session.status === 'error')
    return (
      <div className="flex min-h-svh items-center justify-center bg-ivory p-6">
        <EmptyState title={t(`errors.${session.code}`, { defaultValue: t('errors.generic') })} action={<Button onClick={() => location.reload()}>{t('states.retry')}</Button>} />
      </div>
    )
  if (session.status !== 'ready') return <Navigate to="/admin/connexion" replace />

  return (
    <div className="min-h-svh bg-ivory">
      <Seo title={t('admin.title')} noindex />
      <header className="sticky top-0 z-40 border-b border-line bg-ivory/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <Link to="/admin/rendez-vous" className="flex items-center gap-3">
            <Wordmark size="sm" />
            <span className="hidden text-xs tracking-[0.2em] text-cocoa-muted uppercase sm:inline">{t('admin.title')}</span>
          </Link>
          <nav className="order-last -mx-1 flex w-full gap-1 overflow-x-auto px-1 md:order-none md:w-auto" aria-label={t('admin.nav.menu')}>
            {NAV.map(({ to, key, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn('inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm whitespace-nowrap', isActive ? 'bg-cocoa text-ivory' : 'text-cocoa hover:bg-blush-100')
                }
              >
                <Icon aria-hidden className="size-4" strokeWidth={1.5} />
                {t(`admin.nav.${key}`)}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a href={localePath(locale)} target="_blank" rel="noreferrer" className="hidden min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-cocoa-soft hover:text-cocoa sm:inline-flex">
              <ExternalLink aria-hidden className="size-4" strokeWidth={1.5} />
              {t('admin.nav.website')}
            </a>
            <AdminLanguageToggle />
            <Button variant="ghost" size="sm" onClick={() => void signOut()} icon={<LogOut aria-hidden className="flip-rtl size-4" strokeWidth={1.5} />}>
              <span className="sr-only sm:not-sr-only">{t('admin.nav.signOut')}</span>
            </Button>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <Outlet />
      </main>
    </div>
  )
}
