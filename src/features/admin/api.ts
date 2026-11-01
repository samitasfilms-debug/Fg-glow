import { supabase } from '@/lib/supabase'
import { BookingError } from '@/features/booking/api'

export type AppointmentStatus = 'pending' | 'confirmed' | 'rejected' | 'reschedule_requested' | 'cancelled' | 'completed' | 'no_show'
export type AdminAction = 'confirm' | 'reject' | 'propose' | 'cancel' | 'complete' | 'no_show'
export const STATUSES: AppointmentStatus[] = ['pending', 'reschedule_requested', 'confirmed', 'completed', 'rejected', 'cancelled', 'no_show']

/** Mirrors the transitions enforced by admin_update_appointment (the database stays the authority). */
export const ACTIONS_BY_STATUS: Record<AppointmentStatus, AdminAction[]> = {
  pending: ['confirm', 'propose', 'reject', 'cancel'],
  reschedule_requested: ['confirm', 'propose', 'reject', 'cancel'],
  confirmed: ['complete', 'no_show', 'propose', 'cancel'],
  rejected: [],
  cancelled: [],
  completed: [],
  no_show: [],
}

export interface ServiceName {
  name_fr: string
  name_ar: string
}

export interface AppointmentListItem {
  id: string
  reference: string
  status: AppointmentStatus
  starts_at: string
  ends_at: string
  total_price_dzd: number
  total_duration_minutes: number
  customer_name: string
  customer_phone: string
  hold_expires_at: string | null
  created_at: string
  services: ServiceName[] | null
}

export interface AppointmentList {
  total: number
  counts: Partial<Record<AppointmentStatus, number>>
  items: AppointmentListItem[]
}

export interface NotificationRow {
  id: string
  event: 'booking_created' | 'booking_confirmed' | 'booking_rejected' | 'reschedule_proposed' | 'booking_cancelled'
  audience: 'customer' | 'salon'
  status: 'queued' | 'awaiting_provider' | 'manual_opened' | 'sent' | 'failed'
  recipient: string | null
  locale: 'fr' | 'ar'
  created_at: string
}

export interface AppointmentDetail {
  id: string
  reference: string
  status: AppointmentStatus
  starts_at: string
  ends_at: string
  previous_starts_at: string | null
  total_price_dzd: number
  total_duration_minutes: number
  customer_notes: string | null
  locale: 'fr' | 'ar'
  hold_expires_at: string | null
  created_at: string
  staff: { id: string; display_name: string } | null
  customer: { id: string; full_name: string; phone: string; email: string | null; completed_count: number; total_count: number }
  services: (ServiceName & { price_dzd: number; duration_minutes: number })[]
  events: { from_status: AppointmentStatus | null; to_status: AppointmentStatus; note: string | null; details: Record<string, unknown> | null; created_at: string; actor: string | null }[]
  notifications: NotificationRow[]
}

export interface Profile {
  id: string
  full_name: string | null
  role: 'super_admin' | 'manager' | 'staff'
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new BookingError('NOT_CONFIGURED')
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    const msg = error.message ?? ''
    const code = /^FGG_[A-Z_]+/.exec(msg)?.[0]
    throw new BookingError(code ?? (/fetch|network/i.test(msg) ? 'network' : /permission denied/i.test(msg) ? 'FGG_FORBIDDEN' : 'generic'))
  }
  return data as T
}

export const adminApi = {
  profile: () => rpc<Profile | null>('get_my_profile'),
  list: (f: { status?: AppointmentStatus[] | null; from?: string | null; to?: string | null; search?: string | null }) =>
    rpc<AppointmentList>('admin_list_appointments', {
      p_status: f.status?.length ? f.status : null,
      p_from: f.from || null,
      p_to: f.to || null,
      p_search: f.search?.trim() || null,
      p_limit: 200,
      p_offset: 0,
    }),
  get: (id: string) => rpc<AppointmentDetail>('admin_get_appointment', { p_appointment_id: id }),
  update: (id: string, action: AdminAction, opts: { note?: string; newStartsAt?: string } = {}) =>
    rpc<{ status: AppointmentStatus }>('admin_update_appointment', {
      p_appointment_id: id,
      p_action: action,
      p_note: opts.note?.trim() || null,
      p_new_starts_at: opts.newStartsAt ?? null,
      p_staff_id: null,
    }),
  markNotificationOpened: (id: string) => rpc<null>('admin_mark_notification_opened', { p_notification_id: id }),
}
