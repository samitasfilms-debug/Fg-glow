import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Seo } from '@/components/layout/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { useLocalePath } from '@/hooks/useLocalePath'

type ShellPage = 'about' | 'services' | 'gallery' | 'team' | 'contact'

/**
 * Interim page frame (Phase 01). Gives every navigation link a real,
 * translated destination. Replaced by full pages in Phases 02–03.
 */
export function PageShell({ page }: { page: ShellPage }) {
  const { t } = useTranslation()
  const to = useLocalePath()

  return (
    <>
      <Seo title={t(`pages.${page}.title`)} description={t(`pages.${page}.intro`)} />
      <Section tone="ivory" className="pt-header">
        <Container className="flex flex-col gap-14 pt-12 md:pt-20">
          <SectionHeading as="h1" eyebrow="FG GLOW" title={t(`pages.${page}.title`)} lead={t(`pages.${page}.intro`)} />
          <EmptyState
            icon={<Sparkles className="size-7" strokeWidth={1.25} />}
            title={t('pages.inProgress')}
            action={
              <ButtonLink to={to('home')} variant="outline" className="mt-2">
                {t('actions.backHome')}
              </ButtonLink>
            }
          />
        </Container>
      </Section>
    </>
  )
}
