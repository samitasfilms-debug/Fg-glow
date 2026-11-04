// End-to-end browser tests (Playwright) against the local test server.
//   e2e/setup-db.sh && <build dist-e2e> && e2e/start-server.sh && node e2e/run.mjs
// Uses fictitious fixtures from e2e/seed.sql only.
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import pg from 'pg'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:4400'
const SHOTS = process.env.E2E_SHOTS ?? 'e2e/screenshots'
mkdirSync(SHOTS, { recursive: true })
const db = new pg.Client({ database: process.env.E2E_DB ?? 'fgg_e2e' })
await db.connect()

const results = []
let browser
async function test(name, fn) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  try {
    await fn(page, ctx)
    if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`)
    results.push({ name, ok: true })
    console.log(`ok   - ${name}`)
  } catch (e) {
    results.push({ name, ok: false, error: e.message })
    console.log(`FAIL - ${name}\n       ${e.message.split('\n')[0]}`)
    await page.screenshot({ path: `${SHOTS}/FAIL-${name.replace(/\W+/g, '_')}.png`, fullPage: true }).catch(() => {})
  } finally {
    await ctx.close()
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}
const eq = (a, b, msg) => assert(a === b, `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`)
const text = async (page, sel) => (await page.textContent(sel))?.replace(/\s+/g, ' ').trim()
const rpc = async (fn, body, token) => {
  const r = await fetch(`${BASE}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  return { status: r.status, body: await r.json().catch(() => null) }
}

// Walks steps 1–3 and stops on the review step. Returns the chosen slot ISO.
async function fillUntilReview(page, { lang = 'fr', services = ['Service test A'], phone = '0555 12 34 56', name = 'Cliente Test', slotIndex = 0, dayIndex = 0 } = {}) {
  await page.goto(`${BASE}/${lang}/reservation`)
  await page.waitForSelector('[data-testid=booking-flow]')
  for (const s of services) await page.getByText(s, { exact: true }).click()
  await page.click('[data-testid=booking-next]')
  await page.waitForSelector('[data-day]:not([disabled])')
  await page.locator('[data-day]:not([disabled])').nth(dayIndex).click()
  await page.waitForSelector('[data-slot]')
  const slot = await page.locator('[data-slot]').nth(slotIndex).getAttribute('data-slot')
  await page.locator('[data-slot]').nth(slotIndex).click()
  await page.click('[data-testid=booking-next]')
  await page.locator('input[autocomplete=name]').fill(name)
  await page.locator('input[type=tel]').fill(phone)
  await page.click('[data-testid=booking-next]')
  await page.waitForSelector('[data-testid=booking-submit]')
  return slot
}

browser = await chromium.launch()

// ---------------------------------------------------------------- public flow
await test('/booking redirects to the localized booking page', async (page) => {
  await page.goto(`${BASE}/booking`)
  await page.waitForURL(/\/(fr|ar)\/reservation$/)
  await page.goto(`${BASE}/ar/booking`)
  await page.waitForURL(/\/ar\/reservation$/)
})

await test('services come from the database; totals update with multi-select', async (page) => {
  await page.goto(`${BASE}/fr/reservation`)
  await page.waitForSelector('[data-testid=booking-flow]')
  eq(await page.locator('[data-testid=booking-flow] li input[type=checkbox]').count(), 3, 'service cards')
  eq(await text(page, '[data-testid=total-price]'), 'Total 0 DA', 'empty total')
  await page.getByText('Service test A', { exact: true }).click()
  await page.getByText('Service test B', { exact: true }).click()
  eq(await text(page, '[data-testid=total-price]'), 'Total 3 500 DA', 'A+B total')
  eq(await text(page, '[data-testid=total-duration]'), '1 h 30', 'A+B duration')
  await page.getByText('Service test B', { exact: true }).click()
  eq(await text(page, '[data-testid=total-price]'), 'Total 1 000 DA', 'after removing B')
  await page.getByRole('radio', { name: 'Coloration' }).click()
  eq(await page.locator('[data-testid=booking-flow] li input[type=checkbox]').count(), 1, 'category filter')
})

await test('cannot continue without a service', async (page) => {
  await page.goto(`${BASE}/fr/reservation`)
  await page.waitForSelector('[data-testid=booking-flow]')
  await page.click('[data-testid=booking-next]', { force: true }) // aria-disabled button
  eq(await page.getAttribute('[data-testid=booking-flow]', 'data-step'), 'services', 'still on step 1')
  assert(await page.getByText('Sélectionnez au moins une prestation pour continuer.').isVisible(), 'hint visible')
})

await test('calendar: closed weekday disabled, month navigation, slots shown', async (page) => {
  await page.goto(`${BASE}/fr/reservation`)
  await page.waitForSelector('[data-testid=booking-flow]')
  await page.getByText('Service test C', { exact: true }).click()
  await page.click('[data-testid=booking-next]')
  await page.waitForSelector('[data-day]:not([disabled])')
  const friday = await page.evaluate(() =>
    [...document.querySelectorAll('[data-day]')].find((b) => new Date(b.dataset.day + 'T12:00:00Z').getUTCDay() === 5 && b.dataset.day > new Date().toISOString().slice(0, 10)),
  )
  assert(friday !== undefined, 'a future Friday exists in the month')
  const fridayDisabled = await page.evaluate(() =>
    [...document.querySelectorAll('[data-day]')]
      .filter((b) => new Date(b.dataset.day + 'T12:00:00Z').getUTCDay() === 5)
      .every((b) => b.disabled),
  )
  assert(fridayDisabled, 'every Friday is disabled (salon closed)')
  assert(await page.getByRole('button', { name: 'Mois précédent' }).isDisabled(), 'cannot go before current month')
  const m1 = await text(page, '[data-testid=calendar-month]')
  await page.getByRole('button', { name: 'Mois suivant' }).click()
  await page.waitForFunction((m) => document.querySelector('[data-testid=calendar-month]').textContent.trim() !== m, m1)
  await page.waitForSelector('[data-day]:not([disabled])')
  await page.locator('[data-day]:not([disabled])').first().click()
  await page.waitForSelector('[data-slot]')
  // 90 min service, 09:00–18:00, 30 min interval → last start 16:30 → 16 slots
  eq(await page.locator('[data-slot]').count(), 16, 'slot count for a 90 min service')
  await page.screenshot({ path: `${SHOTS}/fr-datetime.png`, fullPage: true })
})

await test('details: validation messages (FR) and draft kept after reload', async (page) => {
  await page.goto(`${BASE}/fr/reservation`)
  await page.waitForSelector('[data-testid=booking-flow]')
  await page.getByText('Service test A', { exact: true }).click()
  await page.click('[data-testid=booking-next]')
  await page.locator('[data-day]:not([disabled])').first().click()
  await page.locator('[data-slot]').first().click()
  await page.click('[data-testid=booking-next]')
  await page.click('[data-testid=booking-next]')
  assert(await page.getByText('Ce champ est obligatoire.').isVisible(), 'phone required message')
  assert(await page.getByText('Doit contenir au moins 2 caractères.').isVisible(), 'name min length message')
  await page.locator('input[type=tel]').fill('12345')
  await page.locator('input[type=email]').fill('pas-un-email')
  await page.click('[data-testid=booking-next]')
  assert(await page.getByText('Numéro de téléphone invalide.').isVisible(), 'invalid phone message')
  assert(await page.getByText('Adresse e-mail invalide.').isVisible(), 'invalid email message')
  await page.locator('input[autocomplete=name]').fill('Cliente Brouillon')
  await page.reload()
  await page.waitForSelector('[data-testid=booking-flow]')
  eq(await page.getAttribute('[data-testid=booking-flow]', 'data-step'), 'details', 'step kept after reload')
  eq(await page.inputValue('input[autocomplete=name]'), 'Cliente Brouillon', 'name kept after reload')
})

let firstRef
await test('submit creates a PENDING request with server-side prices and snapshots', async (page) => {
  const slot = await fillUntilReview(page, { services: ['Service test A', 'Service test B'], phone: '0555 00 00 01', name: 'Cliente Une' })
  eq(await text(page, '[data-testid=review-total]'), '3 500 DA', 'review total')
  assert(await page.getByText('Sur place, au salon. Aucun paiement en ligne.').isVisible(), 'on-site payment shown')
  await page.screenshot({ path: `${SHOTS}/fr-review.png`, fullPage: true })
  await page.click('[data-testid=booking-submit]')
  await page.waitForSelector('[data-testid=booking-success]')
  firstRef = (await text(page, '[data-testid=booking-reference]')) ?? ''
  assert(/^FG-\d{6}-[A-Z2-9]{4}$/.test(firstRef), `reference format ${firstRef}`)
  assert(await page.getByText('Votre rendez-vous n’est pas encore confirmé.', { exact: false }).isVisible(), 'not-confirmed notice')
  await page.waitForTimeout(1300)
  await page.screenshot({ path: `${SHOTS}/fr-success.png`, fullPage: true })
  const { rows } = await db.query(
    `select a.status, a.total_price_dzd, a.total_duration_minutes, a.starts_at, c.phone,
            (select json_agg(json_build_object('n', s.name_fr, 'p', s.price_dzd) order by s.position) from appointment_services s where s.appointment_id = a.id) svc
       from appointments a join customers c on c.id = a.customer_id where a.reference = $1`,
    [firstRef],
  )
  eq(rows.length, 1, 'row stored')
  eq(rows[0].status, 'pending', 'status')
  eq(rows[0].total_price_dzd, 3500, 'stored total')
  eq(rows[0].total_duration_minutes, 90, 'stored duration')
  eq(rows[0].phone, '+213555000001', 'normalized phone')
  eq(new Date(rows[0].starts_at).toISOString(), slot, 'stored slot')
  eq(JSON.stringify(rows[0].svc), JSON.stringify([{ n: 'Service test A', p: 1000 }, { n: 'Service test B', p: 2500 }]), 'service snapshots')
  eq(await page.evaluate(() => sessionStorage.getItem('fg-glow.booking-draft.v1')), JSON.stringify({ step: 0, serviceIds: [], optionIds: [], staffId: null, day: null, slot: null, customer: { fullName: '', phone: '', email: '', notes: '' } }), 'draft cleared')
})

await test('a slot taken while the customer is on the summary is refused (back to step 2)', async (page) => {
  const slot = await fillUntilReview(page, { phone: '0666 00 00 02', name: 'Cliente Deux', slotIndex: 4 })
  const other = await rpc('create_booking_request', {
    p_request: { full_name: 'Concurrente', phone: '0777000003', locale: 'fr', service_ids: ['11111111-1111-1111-1111-111111111111'], starts_at: slot },
  })
  eq(other.status, 200, 'competing request accepted')
  await page.click('[data-testid=booking-submit]')
  await page.waitForSelector('[data-testid=booking-error]')
  assert((await text(page, '[data-testid=booking-error]')).includes('vient d’être pris'), 'slot-taken message')
  eq(await page.getAttribute('[data-testid=booking-flow]', 'data-step'), 'datetime', 'back on date step')
  await page.waitForSelector('[data-slot]')
  eq(await page.locator(`[data-slot="${slot}"]`).count(), 0, 'taken slot no longer offered')
})

await test('server rejects tampered requests (inactive service, past time, rate limit)', async () => {
  await db.query(`update services set is_active = false where id = '33333333-3333-3333-3333-333333333333'`)
  const future = new Date(Date.now() + 3 * 86400000).toISOString()
  const r1 = await rpc('create_booking_request', { p_request: { full_name: 'X Y', phone: '0555111111', locale: 'fr', service_ids: ['33333333-3333-3333-3333-333333333333'], starts_at: future } })
  assert(r1.status === 400 && /FGG_SERVICE_UNAVAILABLE/.test(r1.body.message), `inactive service refused (${r1.body?.message})`)
  await db.query(`update services set is_active = true where id = '33333333-3333-3333-3333-333333333333'`)
  const r2 = await rpc('create_booking_request', { p_request: { full_name: 'X Y', phone: '0555111111', locale: 'fr', service_ids: ['11111111-1111-1111-1111-111111111111'], starts_at: '2020-01-01T10:00:00Z' } })
  assert(r2.status === 400 && /FGG_SLOT_UNAVAILABLE/.test(r2.body.message), `past slot refused (${r2.body?.message})`)
  const r3 = await rpc('create_booking_request', { p_request: { full_name: 'X Y', phone: '12', locale: 'fr', service_ids: ['11111111-1111-1111-1111-111111111111'], starts_at: future } })
  assert(r3.status === 400 && /FGG_INVALID_PHONE/.test(r3.body.message), 'invalid phone refused')
  const slots = (await rpc('get_available_slots', { p_date: future.slice(0, 10), p_service_ids: ['22222222-2222-2222-2222-222222222222'], p_staff_id: null })).body
  let last
  for (let i = 0; i < 4; i++) {
    last = await rpc('create_booking_request', { p_request: { full_name: 'Rate Test', phone: '0699000099', locale: 'fr', service_ids: ['22222222-2222-2222-2222-222222222222'], starts_at: slots[i * 2].starts_at } })
  }
  assert(last.status === 400 && /FGG_RATE_LIMITED/.test(last.body.message), `4th request same phone refused (${last.body?.message})`)
})

await test('anonymous visitors cannot read or change private data', async () => {
  const list = await rpc('admin_list_appointments', {})
  assert(list.status !== 200, 'admin_list_appointments denied to anon')
  const { rows } = await db.query(`select id from appointments limit 1`)
  const upd = await rpc('admin_update_appointment', { p_appointment_id: rows[0].id, p_action: 'confirm' })
  assert(upd.status !== 200, 'admin_update_appointment denied to anon')
  const st = await db.query(`select status from appointments where id = $1`, [rows[0].id])
  eq(st.rows[0].status, 'pending', 'status unchanged')
})

await test('Arabic: RTL layout, Arabic texts, prices and validation', async (page) => {
  await page.goto(`${BASE}/ar/reservation`)
  await page.waitForSelector('[data-testid=booking-flow]')
  eq(await page.getAttribute('html', 'dir'), 'rtl', 'dir')
  assert(await page.getByText('خدمة تجريبية أ', { exact: true }).isVisible(), 'Arabic service name')
  await page.getByText('خدمة تجريبية أ', { exact: true }).click()
  assert((await text(page, '[data-testid=total-price]')).includes('1,000 د.ج') || (await text(page, '[data-testid=total-price]')).includes('1000 د.ج') || /1.?000 د\.ج/.test(await text(page, '[data-testid=total-price]')), `Arabic price (${await text(page, '[data-testid=total-price]')})`)
  await page.screenshot({ path: `${SHOTS}/ar-services.png`, fullPage: true })
  await page.click('[data-testid=booking-next]')
  await page.locator('[data-day]:not([disabled])').first().click()
  await page.locator('[data-slot]').first().click()
  await page.screenshot({ path: `${SHOTS}/ar-datetime.png`, fullPage: true })
  await page.click('[data-testid=booking-next]')
  await page.locator('input[type=tel]').fill('999')
  await page.click('[data-testid=booking-next]')
  const alerts = await page.locator('[role=alert]').allTextContents()
  assert(alerts.length >= 2 && alerts.every((a) => /[؀-ۿ]/.test(a)), `Arabic validation messages: ${alerts.join(' / ')}`)
  await page.screenshot({ path: `${SHOTS}/ar-details.png`, fullPage: true })
})

await test('mobile (390px): no horizontal overflow, sticky action bar', async (_p, ctx) => {
  const page = await ctx.newPage()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/fr/reservation`)
  await page.waitForSelector('[data-testid=booking-flow]')
  await page.getByText('Service test A', { exact: true }).click()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  assert(overflow <= 0, `horizontal overflow ${overflow}px`)
  const box = await page.locator('[data-testid=booking-next]').boundingBox()
  assert(box && box.y + box.height <= 844 && box.y > 700, `next button pinned at bottom (y=${box?.y})`)
  await page.screenshot({ path: `${SHOTS}/mobile-services.png` })
  await page.click('[data-testid=booking-next]')
  await page.locator('[data-day]:not([disabled])').first().click()
  await page.waitForSelector('[data-slot]')
  const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  assert(overflow2 <= 0, `horizontal overflow on date step ${overflow2}px`)
  await page.screenshot({ path: `${SHOTS}/mobile-datetime.png`, fullPage: true })
})

// ---------------------------------------------------------------------- admin
async function login(page, email = 'admin@test.local', password = 'test-password') {
  await page.goto(`${BASE}/admin`)
  await page.waitForURL(/\/admin\/connexion$/)
  await page.locator('input[type=email]').fill(email)
  await page.locator('input[type=password]').fill(password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
}

await test('admin: guarded routes, wrong password, account without access', async (page) => {
  await page.goto(`${BASE}/admin/rendez-vous`)
  await page.waitForURL(/\/admin\/connexion$/)
  await login(page, 'admin@test.local', 'wrong')
  await page.waitForSelector('[data-testid=login-error]')
  eq(await text(page, '[data-testid=login-error]'), 'E-mail ou mot de passe incorrect.', 'invalid credentials message')
  await login(page, 'stranger@test.local')
  await page.waitForFunction(() => document.querySelector('[data-testid=login-error]')?.textContent?.includes('accès'))
})

await test('admin: list, filters and search', async (page) => {
  await login(page)
  await page.waitForSelector('[data-testid=appointments-list]')
  assert((await page.locator(`[data-reference="${firstRef}"]`).count()) === 1, 'first booking listed')
  await page.screenshot({ path: `${SHOTS}/admin-list.png`, fullPage: true })
  await page.locator('input[type=search]').fill('0555 00 00 01')
  await page.waitForFunction(() => document.querySelectorAll('[data-testid=appointments-list] li').length === 1)
  await page.locator('input[type=search]').fill('')
  await page.getByRole('radio', { name: /^Confirmé/ }).click()
  await page.waitForSelector('text=Aucun rendez-vous pour ces filtres.')
})

await test('admin: confirm → WhatsApp click-to-chat (manual, no automatic sending)', async (page, ctx) => {
  await login(page)
  await page.click(`[data-reference="${firstRef}"]`)
  await page.waitForSelector('[data-testid=appointment-detail][data-status=pending]')
  await page.click('[data-action=confirm]')
  await page.click('[data-testid=action-apply]')
  await page.waitForSelector('[data-testid=appointment-detail][data-status=confirmed]')
  assert(await page.getByText('L’API WhatsApp Business n’est pas configurée', { exact: false }).isVisible(), 'API-off notice')
  assert(await page.locator('[data-notification-status=awaiting_provider]').count() >= 1, 'notification awaiting manual send')
  await page.screenshot({ path: `${SHOTS}/admin-detail-confirmed.png`, fullPage: true })
  // wa.me is outside the test network: answer it locally, we only check the URL.
  await ctx.route(/wa\.me|whatsapp\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'ok' }))
  const [popup] = await Promise.all([ctx.waitForEvent('page'), page.click('[data-testid=whatsapp-open]')])
  await popup.waitForLoadState()
  const url = popup.url()
  await popup.close()
  assert(url.startsWith('https://wa.me/213555000001?text=') || url.includes('wa.me/213555000001') || url.includes('api.whatsapp.com'), `wa.me link (${url.slice(0, 80)})`)
  assert(decodeURIComponent(url).includes(firstRef), 'message contains reference')
  await page.waitForSelector('[data-notification-status=manual_opened]')
  const { rows } = await db.query(`select status from appointments where reference = $1`, [firstRef])
  eq(rows[0].status, 'confirmed', 'db status')
})

await test('admin: propose another time, then reject; cancel confirmed', async (page) => {
  await login(page)
  await page.waitForSelector('[data-testid=appointments-list]')
  const { rows } = await db.query(`select a.id, a.reference from appointments a join customers c on c.id = a.customer_id where c.phone = '+213777000003'`)
  await page.goto(`${BASE}/admin/rendez-vous/${rows[0].id}`)
  await page.waitForSelector('[data-testid=appointment-detail][data-status=pending]')
  await page.click('[data-action=propose]')
  // A Friday is closed → refused by the server, message shown in the dialog
  const nextFriday = await page.evaluate(() => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() + ((5 - d.getUTCDay() + 7) % 7 || 7))
    return d.toISOString().slice(0, 10)
  })
  await page.locator('[data-testid=action-dialog] input[type=date]').fill(nextFriday)
  await page.locator('[data-testid=action-dialog] input[type=time]').fill('10:00')
  await page.click('[data-testid=action-apply]')
  await page.waitForSelector('[data-testid=action-error]')
  const nextMonday = await page.evaluate(() => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() + ((1 - d.getUTCDay() + 7) % 7 || 7) + 7)
    return d.toISOString().slice(0, 10)
  })
  await page.locator('[data-testid=action-dialog] input[type=date]').fill(nextMonday)
  await page.locator('[data-testid=action-dialog] input[type=time]').fill('15:00')
  await page.locator('[data-testid=action-dialog] textarea').fill('Proposition test')
  await page.click('[data-testid=action-apply]')
  await page.waitForSelector('[data-testid=appointment-detail][data-status=reschedule_requested]')
  assert(await page.getByText('Horaire initial', { exact: false }).isVisible(), 'previous time shown')
  assert(await page.getByText('Proposition test').isVisible(), 'note in history')
  await page.screenshot({ path: `${SHOTS}/admin-detail-proposed.png`, fullPage: true })
  await page.click('[data-action=reject]')
  await page.click('[data-testid=action-apply]')
  await page.waitForSelector('[data-testid=appointment-detail][data-status=rejected]')
  assert(await page.getByText('Aucune action possible pour ce statut.').isVisible(), 'no actions after reject')
  // cancel the confirmed first booking
  const first = await db.query(`select id from appointments where reference = $1`, [firstRef])
  await page.goto(`${BASE}/admin/rendez-vous/${first.rows[0].id}`)
  await page.waitForSelector('[data-testid=appointment-detail][data-status=confirmed]')
  await page.click('[data-action=cancel]')
  await page.click('[data-testid=action-apply]')
  await page.waitForSelector('[data-testid=appointment-detail][data-status=cancelled]')
  const ev = await db.query(`select count(*)::int n from appointment_events e join appointments a on a.id = e.appointment_id where a.reference = $1`, [firstRef])
  eq(ev.rows[0].n, 3, 'history: created, confirmed, cancelled')
  const audit = await db.query(`select count(*)::int n from audit_logs where entity_id = $1`, [first.rows[0].id])
  eq(audit.rows[0].n, 2, 'audit log entries')
})

await test('admin: Arabic interface (RTL)', async (page) => {
  await login(page)
  await page.waitForSelector('[data-testid=appointments-list]')
  await page.getByRole('button', { name: /العربية/ }).click()
  await page.waitForFunction(() => document.documentElement.dir === 'rtl')
  assert(await page.getByRole('heading', { name: 'المواعيد' }).isVisible().catch(() => false) || /[؀-ۿ]/.test(await text(page, 'h1')), 'Arabic heading')
  await page.screenshot({ path: `${SHOTS}/admin-list-ar.png`, fullPage: true })
  await page.getByRole('button', { name: /Français/ }).click()
})

await browser.close()
await db.end()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
