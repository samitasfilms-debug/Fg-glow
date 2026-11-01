import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { ButtonLink } from '@/components/ui/Button'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { Ornament } from '@/components/ui/Ornament'
import { useLocalePath } from '@/hooks/useLocalePath'
import { cn } from '@/lib/cn'
import { EASE_LUXE } from '@/lib/motion'
import { NAV_ITEMS } from './nav-items'

export function MobileMenu({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const { t } = useTranslation()
  const to = useLocalePath()

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          id="mobile-menu"
          key="mobile-menu"
          className="fixed inset-0 z-30 flex flex-col bg-ivory pt-header lg:hidden"
          initial={{ clipPath: 'inset(0 0 100% 0)' }}
          animate={{ clipPath: 'inset(0 0 0% 0)' }}
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: 0.7, ease: EASE_LUXE }}
        >
          <nav aria-label={t('a11y.mainNav')} className="container-site flex flex-1 flex-col justify-center overflow-y-auto py-10">
            <motion.ul
              className="flex flex-col gap-1"
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } } }}
            >
              {NAV_ITEMS.map((item, i) => (
                <motion.li
                  key={item.key}
                  variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_LUXE } } }}
                >
                  <NavLink
                    to={to(item.key)}
                    end={item.key === 'home'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-baseline gap-4 py-2 font-display text-[2.5rem] leading-tight transition-colors',
                        isActive ? 'text-cocoa' : 'text-cocoa/55 hover:text-cocoa',
                      )
                    }
                  >
                    <span className="font-sans text-xs tracking-widest text-gold-ink">{String(i + 1).padStart(2, '0')}</span>
                    {t(item.label)}
                  </NavLink>
                </motion.li>
              ))}
            </motion.ul>
          </nav>
          <motion.div
            className="container-site flex flex-col gap-6 pb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.5 } }}
          >
            <Ornament className="justify-start" />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <LanguageSwitcher />
              <ButtonLink to={to('booking')} onClick={onNavigate} withArrow>
                {t('actions.book')}
              </ButtonLink>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
