import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useOutlet } from 'react-router-dom'
import { pageTransition } from '@/lib/motion'
import { Footer } from './Footer'
import { Header } from './Header'

/** Shell for every public page: skip link, header, animated outlet, footer. */
export function PublicLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const outlet = useOutlet()
  // Ignore the locale prefix so switching language doesn't replay the transition.
  const pageKey = location.pathname.split('/').slice(2).join('/') || 'home'

  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pageKey, location.hash])

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="fixed start-4 top-4 z-50 -translate-y-24 rounded-full bg-cocoa px-5 py-3 text-sm text-ivory transition-transform focus:translate-y-0"
      >
        {t('a11y.skipToContent')}
      </a>
      <Header />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          id="main"
          key={pageKey}
          tabIndex={-1}
          className="flex-1 outline-none"
          variants={pageTransition}
          initial="initial"
          animate="enter"
          exit="exit"
        >
          {outlet}
        </motion.main>
      </AnimatePresence>
      <Footer />
    </div>
  )
}
