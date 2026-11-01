import { useTranslation } from 'react-i18next'
import { Reveal } from '@/components/motion/Reveal'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Ornament } from '@/components/ui/Ornament'
import { Section } from '@/components/ui/Section'
import { RevealText } from '@/components/motion/RevealText'
import { useLocalePath } from '@/hooks/useLocalePath'

export function BookingCta() {
  const { t } = useTranslation()
  const to = useLocalePath()
  return (
    <Section tone="sand" spacing="md" aria-label={t('home.cta.title')}>
      <Container className="flex flex-col items-center gap-8 text-center">
        <Ornament />
        <RevealText as="h2" text={t('home.cta.title')} className="text-display-lg max-w-[16ch]" />
        <Reveal delay={0.1}>
          <p className="text-lead mx-auto max-w-xl text-cocoa-soft">{t('home.cta.body')}</p>
        </Reveal>
        <Reveal delay={0.2}>
          <ButtonLink to={to('booking')} size="lg" withArrow>
            {t('actions.book')}
          </ButtonLink>
        </Reveal>
      </Container>
    </Section>
  )
}
