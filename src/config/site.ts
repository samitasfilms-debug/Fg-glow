/**
 * FG GLOW — static brand configuration.
 *
 * IMPORTANT: real business information (address, phone, hours, prices, team…)
 * has NOT been provided yet. Every unknown value is `null` and the UI renders a
 * clearly identified placeholder instead of invented data.
 *
 * From Phase 04/05 these values are managed in the admin dashboard
 * (`salon_settings` table in Supabase); this file then only provides defaults.
 */
export interface SiteConfig {
  name: string
  slogan: { fr: string; ar: string }
  secondarySlogan: { fr: string; ar: string }
  /** Official logo URL. `null` → the typographic wordmark is used. */
  logoUrl: string | null
  contact: {
    phone: string | null
    whatsapp: string | null
    email: string | null
    address: { fr: string | null; ar: string | null }
    /** Google Maps embed URL, only once a real address is supplied. */
    mapEmbedUrl: string | null
  }
  social: {
    instagram: string | null
    facebook: string | null
  }
  currency: 'DZD'
}

export const site: SiteConfig = {
  name: 'FG GLOW',
  // The official slogans are in English and are kept as-is in both languages.
  // The Arabic site also shows a translation (see i18n key `brand.sloganTranslation`).
  slogan: {
    fr: 'Your Beauty, Your Moment.',
    ar: 'Your Beauty, Your Moment.',
  },
  secondarySlogan: {
    fr: 'Beauty. Elegance. Confidence.',
    ar: 'Beauty. Elegance. Confidence.',
  },
  logoUrl: null,
  contact: {
    phone: null,
    whatsapp: null,
    email: null,
    address: { fr: null, ar: null },
    mapEmbedUrl: null,
  },
  social: {
    instagram: null,
    facebook: null,
  },
  currency: 'DZD',
}
