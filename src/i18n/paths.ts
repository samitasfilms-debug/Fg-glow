import type { Locale } from './config'

/**
 * Public routes. Slugs are shared between languages (French, the salon's
 * primary language) — the locale prefix carries the language: /fr/…, /ar/….
 */
export const ROUTES = {
  home: '',
  about: 'a-propos',
  services: 'prestations',
  gallery: 'galerie',
  team: 'equipe',
  contact: 'contact',
  booking: 'reservation',
} as const

export type RouteKey = keyof typeof ROUTES

export function localePath(locale: Locale, route: RouteKey | string = 'home') {
  const slug = route in ROUTES ? ROUTES[route as RouteKey] : route
  const clean = String(slug).replace(/^\/+/, '')
  return clean ? `/${locale}/${clean}` : `/${locale}`
}

/** Same page, other language: swaps the first path segment, keeps query & hash. */
export function swapLocaleInPath(pathname: string, search: string, hash: string, next: Locale) {
  const parts = pathname.split('/')
  parts[1] = next
  const path = parts.join('/') || `/${next}`
  return `${path}${search}${hash}`
}
