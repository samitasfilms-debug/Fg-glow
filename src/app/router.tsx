import { createBrowserRouter, Navigate } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { ROUTES } from '@/i18n/paths'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PageShell } from '@/pages/PageShell'
import { BookingAlias, LocaleRoute, RootRedirect } from './LocaleRoute'
import { PageLoader } from './PageLoader'

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  { path: '/booking', element: <BookingAlias /> },
  {
    // Salon back-office (not indexed, not linked from the public site).
    path: '/admin',
    HydrateFallback: PageLoader,
    lazy: async () => ({ Component: (await import('@/features/admin/AdminRoot')).AdminRoot }),
    children: [
      { path: 'connexion', lazy: async () => ({ Component: (await import('@/features/admin/AdminLoginPage')).AdminLoginPage }) },
      {
        lazy: async () => ({ Component: (await import('@/features/admin/AdminLayout')).AdminLayout }),
        children: [
          { index: true, element: <Navigate to="rendez-vous" replace /> },
          { path: 'rendez-vous', lazy: async () => ({ Component: (await import('@/features/admin/AppointmentsPage')).AppointmentsPage }) },
          { path: 'rendez-vous/:id', lazy: async () => ({ Component: (await import('@/features/admin/AppointmentDetailPage')).AppointmentDetailPage }) },
          { path: '*', element: <Navigate to="rendez-vous" replace /> },
        ],
      },
    ],
  },
  {
    path: '/:lang',
    element: <LocaleRoute />,
    HydrateFallback: PageLoader,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { index: true, element: <HomePage /> },
          // Full pages are built in Phase 02 (public site) and Phase 03 (booking).
          { path: ROUTES.about, element: <PageShell page="about" /> },
          { path: ROUTES.services, element: <PageShell page="services" /> },
          { path: ROUTES.gallery, element: <PageShell page="gallery" /> },
          { path: ROUTES.team, element: <PageShell page="team" /> },
          { path: ROUTES.contact, element: <PageShell page="contact" /> },
          { path: ROUTES.booking, lazy: async () => ({ Component: (await import('@/features/booking/BookingPage')).BookingPage }) },
          { path: 'booking', element: <BookingAlias /> },
          ...(import.meta.env.DEV
            ? [{ path: 'design-system', lazy: async () => ({ Component: (await import('@/pages/DesignSystemPage')).DesignSystemPage }) }]
            : []),
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])

