import { useTranslation } from 'react-i18next'
import { Seo } from '@/components/layout/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Ornament } from '@/components/ui/Ornament'
import { useLocalePath } from '@/hooks/useLocalePath'

export function NotFoundPage() {
  const { t } = useTranslation()
  const to = useLocalePath()
  return (
    <>
      <Seo title={t('pages.notFound.title')} noindex />
      <Container className="flex min-h-[80svh] flex-col items-center justify-center gap-6 pt-header text-center">
        <p className="font-display text-[clamp(6rem,20vw,14rem)] leading-none text-blush" style={{ fontFamily: 'var(--font-display)' }}>
          {t('pages.notFound.code')}
        </p>
        <Ornament />
        <h1 className="text-display-sm">{t('pages.notFound.title')}</h1>
        <p className="max-w-md text-cocoa-soft">{t('pages.notFound.body')}</p>
        <ButtonLink to={to('home')} variant="primary" withArrow className="mt-4">
          {t('actions.backHome')}
        </ButtonLink>
      </Container>
    </>
  )
}
