/**
 * Service categories of the salon's menu, in display order.
 * Services themselves (names, prices, durations, images) live in the database
 * and are managed in /admin/prestations. Labels: i18n `services.categories.<key>`.
 */
export const SERVICE_CATEGORIES = ['manicure', 'pedicure', 'lashes', 'brows', 'waxing', 'makeup', 'hairstyling', 'care'] as const

export type ServiceCategoryKey = (typeof SERVICE_CATEGORIES)[number]

/** How a price is shown: fixed, "à partir de" (minimum) or "sur devis" (agreed at the salon). */
export type PriceMode = 'fixed' | 'from' | 'quote'

/** The four categories highlighted on the homepage "Signature" section, with their illustration. */
export const SIGNATURE_CATEGORIES: { key: ServiceCategoryKey; image: string }[] = [
  { key: 'lashes', image: '/prestations/cils-oeil-de-biche.svg' },
  { key: 'manicure', image: '/prestations/manucure-pose-capsules.svg' },
  { key: 'makeup', image: '/prestations/maquillage-mariee.svg' },
  { key: 'hairstyling', image: '/prestations/coiffure-wavy.svg' },
]
