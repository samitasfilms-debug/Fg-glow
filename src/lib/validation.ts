import type { TFunction } from 'i18next'
import { z } from 'zod'

/**
 * Shared, translated Zod primitives. Error messages are i18n keys resolved at
 * render time, so they follow the active language. The same schemas are
 * reused by Supabase Edge Functions for server-side validation (Phase 05).
 */
export const ALGERIAN_PHONE = /^(?:\+213|00213|0)(?:5|6|7)\d{8}$/

export const makeSchemas = (t: TFunction) => ({
  name: z.string().trim().min(2, t('validation.tooShort', { count: 2 })).max(80, t('validation.tooLong', { count: 80 })),
  phone: z
    .string()
    .trim()
    .min(1, t('validation.required'))
    .transform((v) => v.replace(/[\s.-]/g, ''))
    .refine((v) => ALGERIAN_PHONE.test(v), t('validation.invalidPhone')),
  optionalEmail: z
    .string()
    .trim()
    .refine((v) => v === '' || z.email().safeParse(v).success, t('validation.invalidEmail')),
  message: z.string().trim().min(10, t('validation.tooShort', { count: 10 })).max(1000, t('validation.tooLong', { count: 1000 })),
})
