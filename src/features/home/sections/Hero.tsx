import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ImageIcon } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ScriptMonogram } from '@/components/brand/ScriptMonogram'
import { ButtonLink } from '@/components/ui/Button'
import { ArtPlaceholder } from '@/components/ui/ImageFrame'
import { site } from '@/config/site'
import { useLocalePath } from '@/hooks/useLocalePath'
import { useLocale } from '@/i18n/locale-context'
import { EASE_LUXE } from '@/lib/motion'

/**
 * Cinematic hero. The visual is a placeholder artwork until the salon provides
 * photography/video (hero media becomes admin-managed in Phase 04).
 */
export function Hero() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const to = useLocalePath()
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '14%'])
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '-10%'])
  const sloganTranslation = t('brand.sloganTranslation')

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 32 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 1.1, ease: EASE_LUXE, delay },
  })

  return (
    <section ref={ref} aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-ivory pt-header">
      {/* soft blush wash, very low intensity */}
      <div aria-hidden className="absolute inset-y-0 end-0 -z-10 w-full bg-[radial-gradient(55%_55%_at_75%_35%,var(--color-blush-100),transparent_100%)] rtl:bg-[radial-gradient(55%_55%_at_25%_35%,var(--color-blush-100),transparent_100%)]" />

      <div className="container-site grid min-h-[calc(100svh-var(--spacing-header))] items-center gap-12 py-10 lg:grid-cols-12 lg:gap-8 lg:py-16">
        <motion.div style={reduce ? undefined : { y: textY }} className="relative z-10 flex flex-col gap-7 lg:col-span-7">
          <motion.p {...rise(0.35)} className="eyebrow flex items-center gap-3">
            <span aria-hidden className="h-px w-10 bg-current opacity-60" />
            {t('home.hero.eyebrow')}
          </motion.p>

          <h1 id="hero-title" className="sr-only">
            {site.name} — {site.slogan.fr}
          </h1>

          <div aria-hidden dir="ltr" className="flex flex-nowrap items-baseline gap-x-[0.12em] font-display text-display-xl text-cocoa rtl:justify-end" style={{ fontFamily: 'var(--font-display)' }}>
            <motion.span
              className="relative top-[0.27em] inline-block shrink-0"
              initial={{ opacity: 0, y: '18%' }}
              animate={{ opacity: 1, y: '0%' }}
              transition={{ duration: 1.4, ease: EASE_LUXE, delay: 0.5 }}
            >
              <ScriptMonogram className="h-[0.95em] w-auto" />
            </motion.span>
            <span className="inline-flex shrink-0 overflow-hidden pb-[0.06em]">
              {'GLOW'.split('').map((ch, ci) => (
                <motion.span
                  key={ci}
                  className="font-light tracking-[0.14em]"
                  initial={{ y: '105%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 1.2, ease: EASE_LUXE, delay: 0.5 + (2 + ci) * 0.07 }}
                  style={{ display: 'inline-block' }}
                >
                  {ch}
                </motion.span>
              ))}
            </span>
          </div>

          <motion.div {...rise(1.05)} className="flex flex-col gap-2">
            <p dir="ltr" lang="en" className="font-display text-display-sm text-cocoa italic rtl:text-end" style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}>
              {site.slogan[locale]}
            </p>
            {sloganTranslation ? <p className="text-xl font-semibold text-gold-ink">{sloganTranslation}</p> : null}
          </motion.div>

          <motion.p {...rise(1.2)} className="text-lead max-w-lg text-cocoa-soft">
            {t('home.hero.intro')}
          </motion.p>

          <motion.div {...rise(1.35)} className="flex flex-wrap items-center gap-3 pt-2">
            <ButtonLink to={to('booking')} size="lg" withArrow>
              {t('actions.book')}
            </ButtonLink>
            <ButtonLink to={to('services')} size="lg" variant="outline">
              {t('actions.discoverServices')}
            </ButtonLink>
          </motion.div>
        </motion.div>

        <div className="relative lg:col-span-5">
          <motion.div
            className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-arch shadow-lift lg:max-w-none"
            initial={{ clipPath: 'inset(100% 0% 0% 0% round 999px 999px 28px 28px)' }}
            animate={{ clipPath: 'inset(0% 0% 0% 0% round 999px 999px 28px 28px)' }}
            transition={{ duration: 1.8, ease: EASE_LUXE, delay: 0.3 }}
          >
            <motion.div className="h-[114%] w-full" style={reduce ? undefined : { y: imageY }} initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 2.4, ease: EASE_LUXE, delay: 0.3 }}>
              <ArtPlaceholder variant={0} />
            </motion.div>
            <span className="absolute end-5 bottom-5 z-[2] inline-flex items-center gap-1.5 rounded-full bg-ivory/80 px-3 py-1 text-[0.6875rem] font-medium tracking-wide text-cocoa-soft backdrop-blur">
              <ImageIcon aria-hidden className="size-3" strokeWidth={1.75} />
              {t('placeholder.imageComing')}
            </span>
          </motion.div>

          <motion.div
            className="absolute -bottom-6 start-0 hidden w-40 overflow-hidden rounded-frame border-[6px] border-ivory shadow-lift sm:block lg:-start-10 xl:w-48"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: EASE_LUXE, delay: 1.4 }}
          >
            <div className="aspect-square">
              <ArtPlaceholder variant={2} />
            </div>
          </motion.div>

          <motion.p
            aria-hidden
            dir="ltr"
            className="absolute top-1/2 -end-2 hidden origin-center translate-x-1/2 rtl:-translate-x-1/2 -translate-y-1/2 rotate-90 text-[0.6875rem] tracking-[0.4em] text-cocoa-muted uppercase xl:block rtl:xl:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 1.8 }}
          >
            {site.secondarySlogan.fr}
          </motion.p>
        </div>
      </div>

      <motion.a
        href="#maison"
        className="absolute bottom-6 start-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-[0.6875rem] tracking-[0.3em] text-cocoa-muted uppercase md:flex rtl:translate-x-1/2 rtl:tracking-normal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
      >
        {t('actions.scroll')}
        <span className="relative h-10 w-px overflow-hidden bg-cocoa/15">
          <motion.span
            className="absolute inset-x-0 top-0 h-1/2 bg-gold"
            animate={reduce ? undefined : { y: ['-100%', '200%'] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
      </motion.a>
    </section>
  )
}
