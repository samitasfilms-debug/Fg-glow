import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { FacebookIcon, InstagramIcon } from '@/components/brand/SocialIcons'
import { PlaceholderValue } from '@/components/ui/Placeholder'
import { site } from '@/config/site'
import { useLocale } from '@/i18n/locale-context'
import { cn } from '@/lib/cn'

const whatsappHref = (n: string) => `https://wa.me/${n.replace(/[^\d]/g, '')}`

interface RowProps {
  icon: ReactNode
  label: string
  children: ReactNode
  tone: 'dark' | 'light'
}

function Row({ icon, label, children, tone }: RowProps) {
  return (
    <li className="flex items-start gap-4">
      <span
        className={cn(
          'mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full border',
          tone === 'light' ? 'border-ivory/20 text-gold-soft' : 'border-line-strong text-gold-ink',
        )}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className={cn('text-xs uppercase tracking-[0.2em] rtl:tracking-normal', tone === 'light' ? 'text-ivory/55' : 'text-cocoa-muted')}>
          {label}
        </span>
        <span className="text-[0.9375rem]">{children}</span>
      </div>
    </li>
  )
}

/**
 * Salon contact block. Values come from `site` config (admin-managed later).
 * Missing values are shown as explicit placeholders, never invented.
 */
export function ContactDetails({ tone = 'dark', showHours = true }: { tone?: 'dark' | 'light'; showHours?: boolean }) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const { phone, whatsapp, email, address } = site.contact
  const iconClass = 'size-4'
  const linkClass = cn('underline-offset-4 hover:underline', tone === 'light' ? 'decoration-gold-soft' : 'decoration-gold')

  return (
    <ul className="flex flex-col gap-5">
      <Row tone={tone} label={t('contactInfo.address')} icon={<MapPin className={iconClass} strokeWidth={1.5} />}>
        {address[locale] ?? <PlaceholderValue />}
      </Row>
      <Row tone={tone} label={t('contactInfo.phone')} icon={<Phone className={iconClass} strokeWidth={1.5} />}>
        {phone ? (
          <a href={`tel:${phone.replace(/\s/g, '')}`} dir="ltr" className={linkClass}>
            {phone}
          </a>
        ) : (
          <PlaceholderValue />
        )}
      </Row>
      <Row tone={tone} label={t('contactInfo.whatsapp')} icon={<MessageCircle className={iconClass} strokeWidth={1.5} />}>
        {whatsapp ? (
          <a href={whatsappHref(whatsapp)} target="_blank" rel="noopener noreferrer" dir="ltr" className={linkClass}>
            {whatsapp}
          </a>
        ) : (
          <PlaceholderValue />
        )}
      </Row>
      {email ? (
        <Row tone={tone} label={t('contactInfo.email')} icon={<Mail className={iconClass} strokeWidth={1.5} />}>
          <a href={`mailto:${email}`} className={linkClass}>
            {email}
          </a>
        </Row>
      ) : null}
      {showHours ? (
        <Row tone={tone} label={t('contactInfo.hours')} icon={<Clock className={iconClass} strokeWidth={1.5} />}>
          {/* Opening hours come from salon_settings (Phase 04). */}
          <PlaceholderValue />
        </Row>
      ) : null}
    </ul>
  )
}

export function SocialLinks({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const { t } = useTranslation()
  const links = [
    { key: 'instagram', href: site.social.instagram, label: t('contactInfo.instagram'), Icon: InstagramIcon },
    { key: 'facebook', href: site.social.facebook, label: t('contactInfo.facebook'), Icon: FacebookIcon },
  ] as const

  return (
    <ul className="flex flex-wrap items-center gap-3">
      {links.map(({ key, href, label, Icon }) => (
        <li key={key}>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className={cn(
                'inline-flex size-11 items-center justify-center rounded-full border transition-colors duration-300',
                tone === 'light' ? 'border-ivory/25 hover:bg-ivory hover:text-cocoa' : 'border-line-strong hover:bg-cocoa hover:text-ivory',
              )}
            >
              <Icon className="size-[18px]" />
            </a>
          ) : (
            <span className={cn('inline-flex items-center gap-2 text-sm', tone === 'light' ? 'text-ivory/70' : 'text-cocoa-soft')}>
              <Icon className="size-[18px]" />
              <span className="sr-only">{label}</span>
              <PlaceholderValue />
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
