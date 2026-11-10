import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { env } from '@/config/env'
import { LOCALES, LOCALE_META } from '@/i18n/config'
import { useLocale } from '@/i18n/locale-context'
import { swapLocaleInPath } from '@/i18n/paths'

interface SeoProps {
  /** Page name; omitted on the homepage. */
  title?: string
  description?: string
  noindex?: boolean
}

/**
 * Per-page metadata. React 19 hoists <title>/<meta>/<link> into <head>.
 * Canonical and hreflang URLs are absolute once VITE_SITE_URL is set.
 */
export function Seo({ title, description, noindex }: SeoProps) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const { pathname } = useLocation()
  const fullTitle = title ? t('meta.titleTemplate', { page: title }) : t('meta.defaultTitle')
  const desc = description ?? t('meta.description')
  const base = env.siteUrl?.replace(/\/$/, '')

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noindex ? <meta name="robots" content="noindex,nofollow" /> : null}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="FJ GLOW" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:locale" content={locale === 'ar' ? 'ar_DZ' : 'fr_DZ'} />
      <meta name="twitter:card" content="summary_large_image" />
      {base ? (
        <>
          <link rel="canonical" href={`${base}${pathname}`} />
          <meta property="og:url" content={`${base}${pathname}`} />
          {LOCALES.map((l) => (
            <link key={l} rel="alternate" hrefLang={LOCALE_META[l].htmlLang} href={`${base}${swapLocaleInPath(pathname, '', '', l)}`} />
          ))}
          <link rel="alternate" hrefLang="x-default" href={`${base}${swapLocaleInPath(pathname, '', '', 'fr')}`} />
        </>
      ) : null}
    </>
  )
}
