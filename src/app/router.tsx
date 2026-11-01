import { createBrowserRouter } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { ROUTES } from '@/i18n/paths'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PageShell } from '@/pages/PageShell'
import { LocaleRoute, RootRedirect } from './LocaleRoute'
import { PageLoader } from './PageLoader'

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
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
          { path: ROUTES.booking, element: <PageShell page="booking" /> },
          ...(import.meta.env.DEV
            ? [{ path: 'design-system', lazy: async () => ({ Component: (await import('@/pages/DesignSystemPage')).DesignSystemPage }) }]
            : []),
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
