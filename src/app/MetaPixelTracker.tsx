import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { listenForContactClicks, trackPageView } from '@/lib/meta-pixel'

/** Sends a Meta Pixel PageView on every route change and tracks contact clicks. */
export function MetaPixelTracker() {
  const { pathname } = useLocation()

  useEffect(() => {
    trackPageView(pathname)
  }, [pathname])

  useEffect(() => listenForContactClicks(), [])

  return null
}
