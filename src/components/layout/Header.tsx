import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Wordmark } from '@/components/brand/Wordmark'
import { ButtonLink } from '@/components/ui/Button'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useLocalePath } from '@/hooks/useLocalePath'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { useScrolled } from '@/hooks/useScrolled'
import { cn } from '@/lib/cn'
import { EASE_LUXE } from '@/lib/motion'
import { MobileMenu } from './MobileMenu'
import { NAV_ITEMS } from './nav-items'

export function Header() {
  const { t } = useTranslation()
  const to = useLocalePath()
  const scrolled = useScrolled(24)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useLockBodyScroll(open)
  // Close the menu whenever the route changes (incl. language switch).
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setOpen(false)
  }
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: EASE_LUXE, delay: 0.2 }}
        className={cn(
          'fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-500 ease-luxe',
          scrolled || open ? 'bg-ivory/85 shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl' : 'bg-transparent',
        )}
      >
        <div className="container-site flex h-header items-center justify-between gap-6">
          <Link to={to('home')} aria-label={t('a11y.homeLink')} className="relative z-50 -m-2 rounded-md p-2">
            <Wordmark size="md" />
          </Link>

          <nav aria-label={t('a11y.mainNav')} className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.key}>
                  <NavLink
                    to={to(item.key)}
                    end={item.key === 'home'}
                    className={({ isActive }) =>
                      cn(
                        'group relative inline-flex min-h-11 items-center px-3.5 text-[0.9375rem] transition-colors duration-300',
                        isActive ? 'text-cocoa' : 'text-cocoa-soft hover:text-cocoa',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {t(item.label)}
                        <span
                          aria-hidden
                          className={cn(
                            'absolute inset-x-3.5 bottom-2 h-px origin-center bg-gold transition-transform duration-500 ease-luxe',
                            isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                          )}
                        />
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="relative z-50 flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <ButtonLink to={to('booking')} size="sm" className="hidden md:inline-flex">
              {t('actions.bookShort')}
            </ButtonLink>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? t('actions.closeMenu') : t('actions.openMenu')}
              className="inline-flex size-11 items-center justify-center rounded-full text-cocoa transition-colors hover:bg-blush-100 lg:hidden"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={open ? 'close' : 'open'}
                  initial={{ rotate: -45, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 45, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="inline-flex"
                >
                  {open ? <X className="size-5" strokeWidth={1.5} /> : <Menu className="size-5" strokeWidth={1.5} />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>
      </motion.header>

      <MobileMenu open={open} onNavigate={() => setOpen(false)} />
    </>
  )
}
