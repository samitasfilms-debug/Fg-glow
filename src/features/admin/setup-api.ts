import { supabase } from '@/lib/supabase'
import { BookingError } from '@/features/booking/api'

/**
 * Salon set-up (services, opening hours, closures, booking rules).
 * Plain table writes are protected by RLS (salon admins only); the two
 * operations that must be atomic or guarded are database functions.
 */

export const SERVICE_CATEGORIES = ['brushing', 'haircut', 'coloring', 'balayage', 'straightening', 'care', 'event', 'bridal', 'other'] as const
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number]

export interface AdminService {
  id: string
  category: ServiceCategory
  name_fr: string
  name_ar: string
  description_fr: string | null
  description_ar: string | null
  price_dzd: number
  duration_minutes: number
  is_active: boolean
  is_bookable_online: boolean
  sort_order: number
}

export type ServiceInput = Omit<AdminService, 'id'>

export interface HoursRange {
  weekday: number // 0 = Sunday … 6 = Saturday
  opens_at: string // "HH:mm"
  closes_at: string
}

export interface Closure {
  id: string
  starts_at: string
  ends_at: string
  reason: string | null
}

export interface SalonSettings {
  booking_enabled: boolean
  allow_multiple_services: boolean
  max_services_per_booking: number
  slot_interval_minutes: number
  buffer_minutes: number
  salon_capacity: number
  min_notice_minutes: number
  max_advance_days: number
  pending_hold_hours: number
  whatsapp_number: string | null
}

export type EditableSettings = Omit<SalonSettings, 'booking_enabled'>

function db() {
  if (!supabase) throw new BookingError('NOT_CONFIGURED')
  return supabase
}

function fail(error: { message?: string } | null): never {
  const msg = error?.message ?? ''
  const code = /FGG_[A-Z_]+/.exec(msg)?.[0]
  throw new BookingError(
    code ?? (/fetch|network/i.test(msg) ? 'network' : /permission denied|row-level security/i.test(msg) ? 'FGG_FORBIDDEN' : 'generic'),
  )
}

const SERVICE_COLUMNS =
  'id, category, name_fr, name_ar, description_fr, description_ar, price_dzd, duration_minutes, is_active, is_bookable_online, sort_order'
const SETTINGS_COLUMNS =
  'booking_enabled, allow_multiple_services, max_services_per_booking, slot_interval_minutes, buffer_minutes, salon_capacity, min_notice_minutes, max_advance_days, pending_hold_hours, whatsapp_number'

export const setupApi = {
  async services(): Promise<AdminService[]> {
    const { data, error } = await db()
      .from('services')
      .select(SERVICE_COLUMNS)
      .is('archived_at', null)
      .order('category')
      .order('sort_order')
      .order('name_fr')
    if (error) fail(error)
    return data as AdminService[]
  },
  async createService(input: ServiceInput) {
    const { error } = await db().from('services').insert(input)
    if (error) fail(error)
  },
  async updateService(id: string, input: Partial<ServiceInput>) {
    const { error } = await db().from('services').update(input).eq('id', id)
    if (error) fail(error)
  },
  /** Archive instead of delete: past appointments keep their snapshot either way. */
  async archiveService(id: string) {
    const { error } = await db().from('services').update({ archived_at: new Date().toISOString(), is_active: false }).eq('id', id)
    if (error) fail(error)
  },

  async hours(): Promise<HoursRange[]> {
    const { data, error } = await db().from('working_hours').select('weekday, opens_at, closes_at').is('staff_id', null).order('weekday').order('opens_at')
    if (error) fail(error)
    return (data as HoursRange[]).map((r) => ({ ...r, opens_at: r.opens_at.slice(0, 5), closes_at: r.closes_at.slice(0, 5) }))
  },
  async saveHours(ranges: HoursRange[]) {
    const { error } = await db().rpc('admin_save_salon_hours', { p_hours: ranges })
    if (error) fail(error)
  },

  async closures(): Promise<Closure[]> {
    const { data, error } = await db()
      .from('blocked_slots')
      .select('id, starts_at, ends_at, reason')
      .is('staff_id', null)
      .gte('ends_at', new Date().toISOString())
      .order('starts_at')
    if (error) fail(error)
    return data as Closure[]
  },
  async addClosure(c: { starts_at: string; ends_at: string; reason: string | null }) {
    const { error } = await db().from('blocked_slots').insert({ ...c, staff_id: null })
    if (error) fail(error)
  },
  async removeClosure(id: string) {
    const { error } = await db().from('blocked_slots').delete().eq('id', id)
    if (error) fail(error)
  },

  async settings(): Promise<SalonSettings> {
    const { data, error } = await db().from('salon_settings').select(SETTINGS_COLUMNS).single()
    if (error) fail(error)
    return data as SalonSettings
  },
  async saveSettings(s: EditableSettings) {
    const { error } = await db().from('salon_settings').update(s).eq('id', true)
    if (error) fail(error)
  },
  async setBookingEnabled(enabled: boolean) {
    const { error } = await db().rpc('admin_set_booking_enabled', { p_enabled: enabled })
    if (error) fail(error)
  },
}
