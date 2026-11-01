import { useCallback } from 'react'
import { useLocale } from '@/i18n/locale-context'
import { localePath, type RouteKey } from '@/i18n/paths'

/** Build links that keep the current language. */
export function useLocalePath() {
  const { locale } = useLocale()
  return useCallback((route: RouteKey | string = 'home') => localePath(locale, route), [locale])
}
