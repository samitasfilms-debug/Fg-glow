/**
 * Initial service categories, as specified in the project brief.
 * Prices, durations, descriptions and images are intentionally absent:
 * they are configured by the salon in the admin dashboard (Phase 04).
 * Labels live in the i18n files under `services.categories.<key>`.
 */
export const SERVICE_CATEGORIES = [
  'brushing',
  'haircut',
  'coloring',
  'balayage',
  'straightening',
  'care',
  'event',
  'bridal',
  'other',
] as const

export type ServiceCategoryKey = (typeof SERVICE_CATEGORIES)[number]

/** The four categories highlighted on the homepage "Signature" section. */
export const SIGNATURE_CATEGORIES: ServiceCategoryKey[] = ['balayage', 'coloring', 'care', 'bridal']
