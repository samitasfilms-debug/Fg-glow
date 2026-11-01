import { Quote } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Reveal } from '@/components/motion/Reveal'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'

/** Only real, admin-approved reviews will be displayed (`reviews` table, Phase 04). */
export function Testimonials() {
  const { t } = useTranslation()
  return (
    <Section tone="blush" aria-label={t('home.testimonials.title')}>
      <Container className="flex flex-col items-center gap-12">
        <SectionHeading align="center" eyebrow={t('home.testimonials.eyebrow')} title={t('home.testimonials.title')} />
        <Reveal className="w-full max-w-3xl">
          <EmptyState icon={<Quote className="size-7" strokeWidth={1.25} />} title={t('home.testimonials.empty')} />
        </Reveal>
      </Container>
    </Section>
  )
}
