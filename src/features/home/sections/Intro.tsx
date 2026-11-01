import { useTranslation } from 'react-i18next'
import { Parallax } from '@/components/motion/Parallax'
import { Reveal } from '@/components/motion/Reveal'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { ImageFrame } from '@/components/ui/ImageFrame'
import { Ornament } from '@/components/ui/Ornament'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { useLocalePath } from '@/hooks/useLocalePath'

export function Intro() {
  const { t } = useTranslation()
  const to = useLocalePath()
  return (
    <Section id="maison" tone="white" aria-label={t('home.intro.eyebrow')} className="scroll-mt-header">
      <Container className="grid items-center gap-16 lg:grid-cols-12 lg:gap-10">
        <div className="relative lg:col-span-5">
          <Parallax offset={30}>
            <ImageFrame shape="portrait" variant={1} className="max-w-md shadow-soft" />
          </Parallax>
        </div>
        <div className="flex flex-col gap-8 lg:col-span-6 lg:col-start-7">
          <SectionHeading eyebrow={t('home.intro.eyebrow')} title={t('home.intro.title')} />
          <Reveal>
            <p className="text-lead max-w-xl text-cocoa-soft">{t('home.intro.body')}</p>
          </Reveal>
          <Reveal delay={0.1} className="flex flex-col items-start gap-5">
            <Ornament className="justify-start" />
            <p className="font-display text-2xl text-cocoa italic rtl:not-italic md:text-3xl">{t('home.intro.quote')}</p>
          </Reveal>
          <Reveal delay={0.2}>
            <ButtonLink to={to('about')} variant="link" withArrow>
              {t('actions.learnMore')}
            </ButtonLink>
          </Reveal>
        </div>
      </Container>
    </Section>
  )
}
