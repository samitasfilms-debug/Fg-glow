import { createContext, useContext } from 'react'
import type { Locale } from './config'

export interface LocaleContextValue {
  locale: Locale
  dir: 'ltr' | 'rtl'
  isRtl: boolean
}

export const LocaleContext = createContext<LocaleContextValue | null>(null)

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used inside <LocaleProvider>')
  return ctx
}
