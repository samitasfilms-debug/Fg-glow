/**
 * Service categories of the salon's menu, in display order.
 * Services themselves (names, prices, durations, images) live in the database
 * and are managed in /admin/prestations. Labels: i18n `services.categories.<key>`.
 */
export const SERVICE_CATEGORIES = ['manicure', 'pedicure', 'lashes', 'brows', 'waxing', 'makeup', 'hairstyling', 'care'] as const

export type ServiceCategoryKey = (typeof SERVICE_CATEGORIES)[number]

/** How a price is shown: fixed, "à partir de" (minimum) or "sur devis" (agreed at the salon). */
export type PriceMode = 'fixed' | 'from' | 'quote'

/** One photo per category (see src/config/photos.ts for the source and licence). */
export const CATEGORY_IMAGES: Record<ServiceCategoryKey, string> = {
  manicure: '/photos/site/cat-manicure.webp',
  pedicure: '/photos/site/cat-pedicure.webp',
  lashes: '/photos/site/cat-lashes.webp',
  brows: '/photos/site/cat-brows.webp',
  waxing: '/photos/site/cat-waxing.webp',
  makeup: '/photos/site/cat-makeup.webp',
  hairstyling: '/photos/site/cat-hairstyling.webp',
  care: '/photos/site/cat-care.webp',
}

/** The four categories highlighted on the homepage "Signature" section. */
export const SIGNATURE_CATEGORIES: { key: ServiceCategoryKey; image: string }[] = (['lashes', 'manicure', 'makeup', 'hairstyling'] as const).map((key) => ({
  key,
  image: CATEGORY_IMAGES[key],
}))
