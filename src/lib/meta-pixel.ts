/**
 * Meta (Facebook) Pixel, for Meta Ads measurement.
 *
 * The Pixel is only loaded when VITE_META_PIXEL_ID is set: without it every
 * function here is a no-op, nothing is downloaded and nothing is sent.
 * The salon back-office (/admin) is never tracked.
 *
 * Privacy: no customer data (name, phone, email, notes) is ever sent to Meta.
 */
import { env } from '@/config/env'

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void
  queue: unknown[]
  push: Fbq
  loaded: boolean
  version: string
  disablePushState?: boolean
}

declare global {
  interface Window {
    fbq?: Fbq
    _fbq?: Fbq
  }
}

const pixelId = env.metaPixelId
let initialised = false
let lastPath: string | null = null

export const isMetaPixelEnabled = Boolean(pixelId)

const isAdminPath = (path: string) => path === '/admin' || path.startsWith('/admin/')

/** Official Meta base snippet, rewritten as a function (no inline script needed). */
function load(id: string) {
  if (window.fbq) return
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args)
    else fbq.queue.push(args)
  } as Fbq
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  fbq.queue = []
  // We send PageView ourselves on each route change; stop the Pixel from
  // also firing one on history.pushState (would double count).
  fbq.disablePushState = true
  window.fbq = fbq
  window._fbq = fbq

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(script)

  fbq('init', id)
}

function ensure(): boolean {
  if (!pixelId || typeof window === 'undefined') return false
  if (!initialised) {
    load(pixelId)
    initialised = true
  }
  return true
}

/** PageView for the current SPA route (deduplicated, admin excluded). */
export function trackPageView(pathname: string) {
  if (isAdminPath(pathname) || pathname === lastPath) return
  if (!ensure()) return
  lastPath = pathname
  window.fbq?.('track', 'PageView')
}

type StandardEvent = 'Lead' | 'Schedule' | 'Contact' | 'InitiateCheckout'

export function trackEvent(name: StandardEvent, params?: Record<string, unknown>, eventId?: string) {
  if (isAdminPath(window.location.pathname)) return
  if (!ensure()) return
  if (eventId) window.fbq?.('track', name, params ?? {}, { eventID: eventId })
  else window.fbq?.('track', name, params ?? {})
}

/**
 * Fires `Contact` when a visitor clicks a phone, WhatsApp or e-mail link,
 * wherever it is on the page. Returns a cleanup function.
 */
export function listenForContactClicks(): () => void {
  if (!pixelId) return () => {}
  const onClick = (event: MouseEvent) => {
    const link = (event.target as Element | null)?.closest?.('a[href]')
    if (!link) return
    const href = link.getAttribute('href') ?? ''
    const method = href.startsWith('tel:')
      ? 'phone'
      : /^https:\/\/(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\//.test(href)
        ? 'whatsapp'
        : href.startsWith('mailto:')
          ? 'email'
          : null
    if (method) trackEvent('Contact', { content_category: method })
  }
  document.addEventListener('click', onClick, { capture: true })
  return () => document.removeEventListener('click', onClick, { capture: true })
}
