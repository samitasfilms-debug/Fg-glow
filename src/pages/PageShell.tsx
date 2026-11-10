import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Seo } from '@/components/layout/Seo'
import { Reveal } from '@/components/motion/Reveal'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { ImageFrame } from '@/components/ui/ImageFrame'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { PHOTOS } from '@/config/photos'
import { CATEGORY_IMAGES, SERVICE_CATEGORIES } from '@/config/services'
import { useLocalePath } from '@/hooks/useLocalePath'
import { cn } from '@/lib/cn'

type ShellPage = 'about' | 'services' | 'gallery' | 'team' | 'contact'

/**
 * Interior page frame: heading, a full-width photo, then the page body.
 * Services lists the categories; Gallery shows the photo grid; the other pages
 * keep an honest "in progress" note until their text content is written.
 */
export function PageShell({ page }: { page: ShellPage }) {
  const { t } = useTranslation()
  const to = useLocalePath()

  return (
    <>
      <Seo title={t(`pages.${page}.title`)} description={t(`pages.${page}.intro`)} />
      <Section tone="ivory" className="pt-header">
        <Container className="flex flex-col gap-14 pt-12 md:pt-20">
          <SectionHeading as="h1" eyebrow="FJ GLOW" title={t(`pages.${page}.title`)} lead={t(`pages.${page}.intro`)} />
          <Reveal>
            <div className="aspect-[16/10] overflow-hidden rounded-frame shadow-soft md:aspect-[21/9]">
              <img src={PHOTOS.banners[page]} alt="" width={2000} height={857} fetchPriority="high" decoding="async" className="h-full w-full object-cover" />
            </div>
          </Reveal>

          {page === 'services' ? (
            <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {SERVICE_CATEGORIES.map((key, i) => (
                <Reveal as="li" key={key} delay={(i % 4) * 0.08}>
                  <Link to={to('booking')} className="group flex flex-col gap-5">
                    <div className="overflow-hidden rounded-frame">
                      <div className="transition-transform duration-[1.2s] ease-luxe group-hover:scale-[1.04]">
                        <ImageFrame src={CATEGORY_IMAGES[key]} shape="portrait" reveal={false} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <span className="text-xs tracking-[0.25em] text-gold-ink">{String(i + 1).padStart(2, '0')}</span>
                      <h2 className="font-display text-[1.75rem] leading-tight transition-colors group-hover:text-gold-ink">{t(`services.categories.${key}`)}</h2>
                      <Badge tone="gold" className="self-start">
                        {t('actions.book')}
                      </Badge>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </ul>
          ) : page === 'gallery' ? (
            <div className="flex flex-col gap-6">
              <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
                {PHOTOS.gallery.map((src, i) => (
                  <Reveal as="li" key={src} delay={(i % 3) * 0.08} className={cn(i % 4 === 0 && 'md:row-span-2')}>
                    <ImageFrame src={src} shape={i % 4 === 0 ? 'portrait' : 'square'} className={cn(i % 4 === 0 && 'md:h-full md:aspect-auto')} reveal={false} />
                  </Reveal>
                ))}
              </ul>
              <p className="text-center text-xs text-cocoa-muted">{t('pages.gallery.credit')}</p>
            </div>
          ) : (
            <EmptyState
              icon={<Sparkles className="size-7" strokeWidth={1.25} />}
              title={t('pages.inProgress')}
              action={
                <ButtonLink to={to('home')} variant="outline" className="mt-2">
                  {t('actions.backHome')}
                </ButtonLink>
              }
            />
          )}
        </Container>
      </Section>
    </>
  )
}
