import { Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Reveal } from '@/components/motion/Reveal'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'

/** Team members are never invented: this renders the empty state until staff are added (Phase 04). */
export function TeamPreview() {
  const { t } = useTranslation()
  return (
    <Section tone="ivory" aria-label={t('home.team.title')}>
      <Container className="flex flex-col gap-12">
        <SectionHeading eyebrow={t('home.team.eyebrow')} title={t('home.team.title')} />
        <Reveal>
          <EmptyState icon={<Users className="size-7" strokeWidth={1.25} />} title={t('home.team.empty')} />
        </Reveal>
      </Container>
    </Section>
  )
}
