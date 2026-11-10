import { useTranslation } from 'react-i18next'
import { ContactDetails, SocialLinks } from '@/components/layout/ContactDetails'
import { Reveal } from '@/components/motion/Reveal'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { PHOTOS } from '@/config/photos'
import { site } from '@/config/site'
import { useLocalePath } from '@/hooks/useLocalePath'

export function ContactPreview() {
  const { t } = useTranslation()
  const to = useLocalePath()
  const { mapEmbedUrl } = site.contact

  return (
    <Section tone="white" aria-label={t('home.contact.title')}>
      <Container className="grid gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="flex flex-col gap-10 lg:col-span-5">
          <SectionHeading eyebrow={t('home.contact.eyebrow')} title={t('home.contact.title')} lead={t('home.contact.body')} />
          <Reveal>
            <ContactDetails />
          </Reveal>
          <Reveal delay={0.1} className="flex flex-col gap-4">
            <span className="eyebrow">{t('contactInfo.social')}</span>
            <SocialLinks />
          </Reveal>
          <Reveal delay={0.15} className="flex flex-wrap gap-3">
            <ButtonLink to={to('booking')} withArrow>
              {t('actions.book')}
            </ButtonLink>
            <ButtonLink to={to('contact')} variant="outline">
              {t('actions.contactUs')}
            </ButtonLink>
          </Reveal>
        </div>

        <Reveal className="lg:col-span-6 lg:col-start-7" amount={0.15}>
          <div className="relative h-full min-h-80 overflow-hidden rounded-frame border border-line bg-ivory-200">
            {mapEmbedUrl ? (
              <iframe
                title={t('contactInfo.address')}
                src={mapEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 h-full w-full border-0 grayscale-[0.3]"
              />
            ) : (
              <img src={PHOTOS.contact} alt="" width={1200} height={800} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            )}
          </div>
        </Reveal>
      </Container>
    </Section>
  )
}
