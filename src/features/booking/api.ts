import { supabase } from '@/lib/supabase'

/**
 * Public booking API. Every call is a Postgres function (Supabase RPC):
 * prices, durations and availability are always computed by the database.
 */

/** A supplement attached to one service (e.g. "French +500 DA"). Price only, no duration. */
export interface ServiceOption {
  id: string
  name_fr: string
  name_ar: string
  price_dzd: number
  /** "à partir de": the final amount is set at the salon. */
  price_is_minimum: boolean
}

export interface CatalogService {
  id: string
  category: string
  name_fr: string
  name_ar: string
  description_fr: string | null
  description_ar: string | null
  image_url: string | null
  price_dzd: number
  duration_minutes: number
  options?: ServiceOption[]
}

export interface CatalogStaff {
  id: string
  display_name: string
  photo_url: string | null
  service_ids: string[]
}

export interface BookingStatus {
  enabled: boolean
  has_hours: boolean
  has_services: boolean
  staff_mode: boolean
  allow_multiple_services: boolean
  max_services_per_booking: number
  max_advance_days: number
  timezone: string
}

export interface BookingRequest {
  full_name: string
  phone: string
  email?: string
  notes?: string
  locale: 'fr' | 'ar'
  service_ids: string[]
  option_ids?: string[]
  staff_id?: string | null
  starts_at: string
}

export interface BookingResult {
  reference: string
  status: 'pending'
  starts_at: string
  ends_at: string
  total_price_dzd: number
  total_duration_minutes: number
}

/** Error carrying a stable code (FGG_*) that the UI translates. */
export class BookingError extends Error {
  readonly code: string
  constructor(code: string) {
    super(code)
    this.code = code
  }
}

function client() {
  if (!supabase) throw new BookingError('NOT_CONFIGURED')
  return supabase
}

function toError(error: { message?: string; code?: string } | null): BookingError {
  const msg = error?.message ?? ''
  if (/^FGG_[A-Z_]+$/.test(msg)) return new BookingError(msg)
  if (/fetch|network|Failed/i.test(msg)) return new BookingError('network')
  return new BookingError('generic')
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await client().rpc(fn, args)
  if (error) throw toError(error)
  return data as T
}

export const bookingApi = {
  status: () => rpc<BookingStatus>('get_booking_status'),
  catalog: () => rpc<{ services: CatalogService[]; staff: CatalogStaff[] }>('get_public_catalog'),
  calendar: (from: string, to: string, serviceIds: string[], staffId: string | null) =>
    rpc<{ day: string; slot_count: number }[]>('get_availability_calendar', {
      p_from: from,
      p_to: to,
      p_service_ids: serviceIds,
      p_staff_id: staffId,
    }),
  slots: (day: string, serviceIds: string[], staffId: string | null) =>
    rpc<{ starts_at: string }[]>('get_available_slots', { p_date: day, p_service_ids: serviceIds, p_staff_id: staffId }).then((rows) =>
      rows.map((r) => r.starts_at),
    ),
  create: (request: BookingRequest) => rpc<BookingResult>('create_booking_request', { p_request: request }),
}
