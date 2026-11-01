import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Wordmark } from '@/components/brand/Wordmark'
import { ButtonLink } from '@/components/ui/Button'
import { site } from '@/config/site'
import { useLocalePath } from '@/hooks/useLocalePath'
import { ContactDetails, SocialLinks } from './ContactDetails'
import { NAV_ITEMS } from './nav-items'

const YEAR = new Date().getFullYear()

export function Footer() {
  const { t } = useTranslation()
  const to = useLocalePath()

  return (
    <footer className="relative overflow-hidden bg-cocoa text-ivory">
      <div className="container-site pt-20 pb-10 md:pt-28">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="flex flex-col gap-6 lg:col-span-5">
            <Wordmark size="lg" tone="light" />
            <p className="font-display text-2xl text-blush italic rtl:not-italic" dir="ltr" lang="en">
              {site.slogan.fr}
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-ivory/70">{t('footer.tagline')}</p>
            <div>
              <ButtonLink to={to('booking')} variant="gold" withArrow>
                {t('actions.book')}
              </ButtonLink>
            </div>
          </div>

          <nav aria-label={t('a11y.footerNav')} className="lg:col-span-2">
            <h2 className="eyebrow mb-6 text-gold-soft">{t('footer.explore')}</h2>
            <ul className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.key}>
                  <Link to={to(item.key)} className="inline-flex min-h-10 items-center text-[0.9375rem] text-ivory/80 transition-colors hover:text-ivory">
                    {t(item.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-3">
            <h2 className="eyebrow mb-6 text-gold-soft">{t('footer.visit')}</h2>
            <ContactDetails tone="light" showHours={false} />
          </div>

          <div className="lg:col-span-2">
            <h2 className="eyebrow mb-6 text-gold-soft">{t('footer.follow')}</h2>
            <SocialLinks tone="light" />
          </div>
        </div>

        <div aria-hidden className="pointer-events-none mt-20 select-none overflow-hidden text-center">
          <Wordmark size="hero" tone="light" className="justify-center opacity-[0.06]" />
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-ivory/10 pt-8 text-xs text-ivory/55 sm:flex-row sm:items-center sm:justify-between">
          <p>{t('footer.rights', { year: YEAR })}</p>
          <p>{t('footer.onSitePayment')}</p>
        </div>
      </div>
    </footer>
  )
}
