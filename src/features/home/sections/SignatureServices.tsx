import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { ImageFrame } from '@/components/ui/ImageFrame'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SERVICE_CATEGORIES, SIGNATURE_CATEGORIES } from '@/config/services'
import { useLocalePath } from '@/hooks/useLocalePath'
import { fadeUp, stagger } from '@/lib/motion'

/**
 * Category showcase. Real services (price in DZD, duration, image) are loaded
 * from Supabase from Phase 03 — nothing is invented here.
 */
export function SignatureServices() {
  const { t } = useTranslation()
  const to = useLocalePath()
  return (
    <Section tone="ivory" aria-label={t('home.signature.eyebrow')}>
      <Container className="flex flex-col gap-14 md:gap-20">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeading eyebrow={t('home.signature.eyebrow')} title={t('home.signature.title')} lead={t('home.signature.body')} />
          <ButtonLink to={to('services')} variant="outline" withArrow className="self-start md:self-end">
            {t('actions.viewAll')}
          </ButtonLink>
        </div>

        <motion.ul
          className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={stagger(0.12)}
        >
          {SIGNATURE_CATEGORIES.map((key, i) => (
            <motion.li key={key} variants={fadeUp} className={i % 2 === 1 ? 'lg:mt-16' : undefined}>
              <Link to={to('services')} className="group flex flex-col gap-5">
                <div className="overflow-hidden rounded-frame">
                  <div className="transition-transform duration-[1.2s] ease-luxe group-hover:scale-[1.04]">
                    <ImageFrame shape="portrait" variant={i} reveal={false} />
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs tracking-[0.25em] text-gold-ink">{String(i + 1).padStart(2, '0')}</span>
                    <h3 className="font-display text-[1.75rem] leading-tight transition-colors group-hover:text-gold-ink">
                      {t(`services.categories.${key}`)}
                    </h3>
                  </div>
                  <Badge tone="muted" className="self-start">
                    {t('placeholder.priceComing')}
                  </Badge>
                </div>
              </Link>
            </motion.li>
          ))}
        </motion.ul>

        <ul className="flex flex-wrap gap-2 border-t border-line pt-10" aria-label={t('nav.services')}>
          {SERVICE_CATEGORIES.map((key) => (
            <li key={key}>
              <Link
                to={to('services')}
                className="inline-flex min-h-11 items-center rounded-full border border-line-strong bg-snow px-5 text-sm text-cocoa-soft transition-colors duration-300 hover:border-cocoa hover:text-cocoa"
              >
                {t(`services.categories.${key}`)}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  )
}
