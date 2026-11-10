/**
 * Site photography: professional stock photos from Unsplash (free Unsplash
 * License, commercial use allowed), stored in /public/photos as WebP.
 * They illustrate the services; they are not photos of the salon or its team.
 * Credits: /public/photos/CREDITS.md. Swap any file for the salon's own photo
 * by keeping the same path.
 */
const site = (name: string) => `/photos/site/${name}.webp`

export const PHOTOS = {
  hero: site('hero'),
  heroDetail: site('hero-detail'),
  intro: site('intro'),
  /** Shown in the homepage contact block until the salon's map is configured. */
  contact: site('contact'),
  homeGallery: [site('home-gallery-1'), site('home-gallery-2'), site('home-gallery-3'), site('home-gallery-4')],
  banners: {
    about: site('banner-about'),
    services: site('banner-services'),
    gallery: site('banner-gallery'),
    team: site('banner-team'),
    contact: site('banner-contact'),
  },
  gallery: Array.from({ length: 12 }, (_, i) => site(`gallery-${String(i + 1).padStart(2, '0')}`)),
} as const

/**
 * Photo of a service. The catalogue stores `/prestations/<slug>.svg`
 * (illustrations); each one has a matching photo `/photos/prestations/<slug>.webp`.
 * Any other URL (e.g. one set by the salon in the admin) is used as is.
 */
export function servicePhoto(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null
  const m = /^\/prestations\/([a-z0-9-]+)\.svg$/.exec(imageUrl)
  return m ? `/photos/prestations/${m[1]}.webp` : imageUrl
}
