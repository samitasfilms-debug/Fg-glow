import { motion } from 'framer-motion'
import { Gem, HeartHandshake, Sparkles, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { fadeUp, stagger } from '@/lib/motion'

const ITEMS = [
  { key: 'listen', Icon: HeartHandshake },
  { key: 'craft', Icon: Gem },
  { key: 'moment', Icon: Sun },
  { key: 'confidence', Icon: Sparkles },
] as const

export function WhyUs() {
  const { t } = useTranslation()
  return (
    <Section tone="sand" aria-label={t('home.why.title')}>
      <Container className="grid gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-32">
            <SectionHeading eyebrow={t('home.why.eyebrow')} title={t('home.why.title')} />
          </div>
        </div>
        <motion.ol
          className="grid gap-px overflow-hidden rounded-frame border border-line bg-line sm:grid-cols-2 lg:col-span-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger(0.1)}
        >
          {ITEMS.map(({ key, Icon }, i) => (
            <motion.li key={key} variants={fadeUp} className="group flex flex-col gap-6 bg-ivory p-8 transition-colors duration-500 hover:bg-snow md:p-10">
              <div className="flex items-center justify-between">
                <span className="inline-flex size-12 items-center justify-center rounded-full border border-gold/40 text-gold-ink transition-colors duration-500 group-hover:bg-gold group-hover:text-snow">
                  <Icon className="size-5" strokeWidth={1.25} />
                </span>
                <span className="font-display text-4xl text-cocoa/15">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <h3 className="font-display text-[1.75rem] leading-tight">{t(`home.why.items.${key}.title`)}</h3>
              <p className="text-[0.9375rem] leading-relaxed text-cocoa-soft">{t(`home.why.items.${key}.body`)}</p>
            </motion.li>
          ))}
        </motion.ol>
      </Container>
    </Section>
  )
}
