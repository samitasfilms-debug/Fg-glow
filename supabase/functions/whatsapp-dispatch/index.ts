// FG GLOW — WhatsApp Cloud API dispatcher (Supabase Edge Function, Deno).
//
// STATUS: written, NOT deployed and NOT tested against Meta (no credentials
// exist yet). Nothing in the app depends on it: while it is not deployed and
// `salon_settings.whatsapp_api_enabled` is false, notifications stay
// "awaiting_provider" and the salon uses the click-to-chat button.
//
// How it works: called on a schedule (Supabase cron) with a shared secret.
// It takes up to 20 "queued" customer notifications, sends the matching
// pre-approved WhatsApp *template* (business-initiated messages must be
// templates), and records sent / failed with a retry counter.
//
// Secrets (set with `supabase secrets set …`, never in the frontend):
//   WHATSAPP_ACCESS_TOKEN       permanent System User token (Meta Business)
//   WHATSAPP_PHONE_NUMBER_ID    sender phone number id
//   WHATSAPP_TEMPLATE_PREFIX    optional, default "fg_glow_"  → e.g. fg_glow_booking_confirmed
//   DISPATCH_SECRET             random string the cron job sends as Bearer token
// Provided automatically by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from 'npm:@supabase/supabase-js@2'

const MAX_ATTEMPTS = 5
const GRAPH = 'https://graph.facebook.com/v21.0'

type Notification = {
  id: string
  event: string
  recipient: string | null
  locale: 'fr' | 'ar'
  attempts: number
  appointment: { reference: string; starts_at: string; customer: { full_name: string } | null } | null
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

function formatParts(iso: string, locale: 'fr' | 'ar', tz: string) {
  const d = new Date(iso)
  const loc = locale === 'ar' ? 'ar-DZ-u-nu-latn' : 'fr-DZ'
  return {
    date: new Intl.DateTimeFormat(loc, { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' }).format(d),
    time: new Intl.DateTimeFormat(loc, { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d),
  }
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('DISPATCH_SECRET')
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return json(401, { error: 'unauthorized' })

  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
  const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
  if (!token || !phoneId) return json(503, { error: 'whatsapp_not_configured', sent: 0 })
  const prefix = Deno.env.get('WHATSAPP_TEMPLATE_PREFIX') ?? 'fg_glow_'

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  const { data: settings } = await db.from('salon_settings').select('whatsapp_api_enabled, timezone').single()
  if (!settings?.whatsapp_api_enabled) return json(200, { skipped: 'whatsapp_api_enabled is false', sent: 0 })

  const { data: queue, error } = await db
    .from('notifications')
    .select('id, event, recipient, locale, attempts, appointment:appointments(reference, starts_at, customer:customers(full_name))')
    .eq('status', 'queued')
    .eq('audience', 'customer')
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at')
    .limit(20)
  if (error) return json(500, { error: error.message })

  let sent = 0
  let failed = 0
  for (const n of (queue ?? []) as unknown as Notification[]) {
    // Claim the row first so two concurrent runs never send twice.
    const { data: claimed } = await db
      .from('notifications')
      .update({ status: 'awaiting_provider', attempts: n.attempts + 1, provider: 'whatsapp_cloud_api' })
      .eq('id', n.id)
      .eq('status', 'queued')
      .select('id')
    if (!claimed?.length) continue

    try {
      if (!n.recipient || !n.appointment) throw new Error('missing recipient or appointment')
      const { date, time } = formatParts(n.appointment.starts_at, n.locale, settings.timezone)
      const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: n.recipient.replace(/\D/g, ''),
          type: 'template',
          template: {
            name: `${prefix}${n.event}`,
            language: { code: n.locale === 'ar' ? 'ar' : 'fr' },
            components: [
              {
                type: 'body',
                parameters: [n.appointment.customer?.full_name ?? '', date, time, n.appointment.reference].map((text) => ({ type: 'text', text })),
              },
            ],
          },
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`)
      await db
        .from('notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString(), provider_message_id: body?.messages?.[0]?.id ?? null, last_error: null })
        .eq('id', n.id)
      sent++
    } catch (e) {
      const attempts = n.attempts + 1
      await db
        .from('notifications')
        .update({ status: attempts >= MAX_ATTEMPTS ? 'failed' : 'queued', last_error: String((e as Error).message).slice(0, 500) })
        .eq('id', n.id)
      failed++
    }
  }
  return json(200, { sent, failed })
})
