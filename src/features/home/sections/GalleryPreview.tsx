import { useTranslation } from 'react-i18next'
import { Reveal } from '@/components/motion/Reveal'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { ImageFrame } from '@/components/ui/ImageFrame'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { useLocalePath } from '@/hooks/useLocalePath'
import { cn } from '@/lib/cn'

/** Editorial mosaic. Slots are filled by the admin-managed gallery (Phase 02/04). */
const SLOTS = [
  { shape: 'portrait', className: 'md:row-span-2' },
  { shape: 'square', className: '' },
  { shape: 'square', className: '' },
  { shape: 'wide', className: 'md:col-span-2' },
] as const

export function GalleryPreview() {
  const { t } = useTranslation()
  const to = useLocalePath()
  return (
    <Section tone="white" aria-label={t('home.gallery.title')}>
      <Container className="flex flex-col gap-14">
        <SectionHeading align="center" eyebrow={t('home.gallery.eyebrow')} title={t('home.gallery.title')} lead={t('home.gallery.body')} className="mx-auto" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          {SLOTS.map((slot, i) => (
            <Reveal key={i} delay={i * 0.08} className={cn('col-span-2 sm:col-span-1', slot.className, i === 3 && 'sm:col-span-2')}>
              <ImageFrame shape={slot.shape} variant={i + 1} className={cn(slot.shape === 'portrait' && 'md:h-full md:aspect-auto')} />
            </Reveal>
          ))}
        </div>
        <div className="flex justify-center">
          <ButtonLink to={to('gallery')} variant="outline" withArrow>
            {t('actions.viewGallery')}
          </ButtonLink>
        </div>
      </Container>
    </Section>
  )
}
