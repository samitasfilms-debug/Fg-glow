import { createContext, useContext } from 'react'
import type { Locale } from '@/i18n/config'

export const AdminLocaleContext = createContext<(l: Locale) => void>(() => {})
export const useSetAdminLocale = () => useContext(AdminLocaleContext)
