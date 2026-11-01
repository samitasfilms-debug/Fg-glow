import type { RouteKey } from '@/i18n/paths'

export const NAV_ITEMS: { key: Exclude<RouteKey, 'booking'>; label: `nav.${Exclude<RouteKey, 'booking'>}` }[] = [
  { key: 'home', label: 'nav.home' },
  { key: 'about', label: 'nav.about' },
  { key: 'services', label: 'nav.services' },
  { key: 'gallery', label: 'nav.gallery' },
  { key: 'team', label: 'nav.team' },
  { key: 'contact', label: 'nav.contact' },
]
