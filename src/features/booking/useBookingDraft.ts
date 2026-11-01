import { useCallback, useEffect, useState } from 'react'

/** Everything the customer entered. Kept in sessionStorage so a refresh or a
 * step change never loses information. Cleared after a successful request. */
export interface BookingDraft {
  step: number
  serviceIds: string[]
  staffId: string | null
  day: string | null
  slot: string | null
  customer: { fullName: string; phone: string; email: string; notes: string }
}

const KEY = 'fg-glow.booking-draft.v1'

export const emptyDraft: BookingDraft = {
  step: 0,
  serviceIds: [],
  staffId: null,
  day: null,
  slot: null,
  customer: { fullName: '', phone: '', email: '', notes: '' },
}

function load(): BookingDraft {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return emptyDraft
    const parsed = JSON.parse(raw) as Partial<BookingDraft>
    return { ...emptyDraft, ...parsed, customer: { ...emptyDraft.customer, ...(parsed.customer ?? {}) } }
  } catch {
    return emptyDraft
  }
}

export function useBookingDraft() {
  const [draft, setDraft] = useState<BookingDraft>(load)

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(draft))
    } catch {
      /* storage unavailable */
    }
  }, [draft])

  const update = useCallback((patch: Partial<BookingDraft>) => setDraft((d) => ({ ...d, ...patch })), [])
  const reset = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
    setDraft(emptyDraft)
  }, [])

  return { draft, update, reset }
}
