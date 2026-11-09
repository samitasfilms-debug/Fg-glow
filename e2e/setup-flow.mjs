// End-to-end: from an EMPTY salon (like the real project before set-up) to a
// confirmed appointment. The admin enters a service and opening hours in the
// dashboard, opens online booking, a customer books in Arabic, the admin
// confirms. Data typed here is fictitious and lives only in the test database.
//
//   E2E_DB=fgg_e2e_empty e2e/setup-db.sh --accounts-only
//   E2E_DB=fgg_e2e_empty E2E_PORT=4401 e2e/start-server.sh
//   E2E_DB=fgg_e2e_empty E2E_BASE=http://127.0.0.1:4401 node e2e/setup-flow.mjs
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import pg from 'pg'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:4401'
const SHOTS = process.env.E2E_SHOTS ?? 'e2e/screenshots'
mkdirSync(SHOTS, { recursive: true })
const db = new pg.Client({ database: process.env.E2E_DB ?? 'fgg_e2e_empty' })
await db.connect()

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}
const step = (msg) => console.log(`ok   - ${msg}`)

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
let failed = false

try {
  // 1. Empty salon: honest unavailable state, no "coming soon" wording.
  await page.goto(`${BASE}/fr/reservation`)
  await page.waitForSelector('text=La réservation en ligne est momentanément indisponible.')
  assert(!(await page.content()).includes('bientôt'), 'no "bientôt" wording')
  step('empty salon → booking page explains it is unavailable (no "coming soon")')

  // 2. Admin login → set-up page shows what is missing; opening is refused.
  await page.goto(`${BASE}/admin`)
  await page.waitForURL(/\/admin\/connexion$/)
  await page.locator('input[type=email]').fill('admin@test.local')
  await page.locator('input[type=password]').fill('test-password')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL(/\/admin\/rendez-vous$/)
  await page.getByRole('link', { name: 'Horaires & réservation' }).click()
  await page.waitForSelector('[data-testid=booking-status]')
  assert(await page.locator('[data-testid=booking-toggle]').isDisabled(), 'open button disabled before set-up')
  step('admin set-up page: booking closed, open button disabled until services + hours exist')

  // 3. Add a service.
  await page.getByRole('link', { name: 'Prestations' }).click()
  await page.waitForSelector('text=Aucune prestation pour le moment.')
  await page.click('[data-testid=service-add]')
  const form = page.locator('[data-testid=service-form]')
  await form.locator('select[name=category]').selectOption('makeup')
  await form.locator('input[name=name_fr]').fill('Prestation e2e')
  await form.locator('input[name=name_ar]').fill('خدمة تجريبية')
  await form.locator('input[name=price]').fill('1800')
  await form.locator('input[name=duration]').fill('45')
  await page.click('[data-testid=option-add]')
  const opt = form.locator('[data-testid=option-row]').first()
  await opt.locator('input[name=option_name_fr]').fill('Supplément e2e')
  await opt.locator('input[name=option_name_ar]').fill('إضافة تجريبية')
  await opt.locator('input[name=option_price]').fill('500')
  await page.click('[data-testid=service-save]')
  await page.waitForSelector('[data-testid=service-options-summary] >> text=Supplément e2e')
  await page.waitForSelector('[data-testid=service-list] >> text=Prestation e2e')
  await page.screenshot({ path: `${SHOTS}/admin-services.png`, fullPage: true })
  step('admin adds a service with its price, duration and a supplement')

  // 4. Opening hours: Saturday→Thursday 09:00–18:00, Friday closed.
  await page.getByRole('link', { name: 'Horaires & réservation' }).click()
  await page.waitForSelector('[data-testid=hours]')
  for (const d of [6, 0, 1, 2, 3, 4]) {
    const row = page.locator(`[data-testid=hours-day-${d}]`)
    await row.getByRole('button', { name: 'Ajouter une plage' }).click()
    const times = row.locator('input[type=time]')
    await times.nth(0).fill('09:00')
    await times.nth(1).fill('18:00')
  }
  await page.click('[data-testid=hours-save]')
  await page.waitForSelector('text=Horaires enregistrés.')
  const { rows: wh } = await db.query('select count(*)::int n from working_hours where staff_id is null')
  assert(wh[0].n === 6, `6 ranges stored, got ${wh[0].n}`)
  step('admin saves opening hours (Friday closed)')

  // 5. Open online booking.
  await page.waitForFunction(() => !document.querySelector('[data-testid=booking-toggle]')?.hasAttribute('disabled'))
  await page.click('[data-testid=booking-toggle]')
  await page.waitForSelector('text=Ouverte : les clientes peuvent envoyer des demandes.')
  await page.screenshot({ path: `${SHOTS}/admin-setup.png`, fullPage: true })
  step('admin opens online booking')

  // 6. Customer books in Arabic.
  const cust = await ctx.newPage()
  cust.on('pageerror', (e) => errors.push(e.message))
  await cust.goto(`${BASE}/ar/reservation`)
  await cust.waitForSelector('[data-testid=booking-flow]')
  assert((await cust.evaluate(() => document.documentElement.dir)) === 'rtl', 'RTL')
  await cust.getByText('خدمة تجريبية', { exact: true }).click()
  await cust.waitForSelector('[data-testid=service-options]')
  await cust.getByText('إضافة تجريبية').click()
  await cust.waitForFunction(() => /2\D?300/.test(document.querySelector('[data-testid=total-price]')?.textContent ?? ''))
  await cust.screenshot({ path: `${SHOTS}/ar-options.png` })
  await cust.click('[data-testid=booking-next]')
  await cust.waitForSelector('[data-day]:not([disabled])')
  await cust.locator('[data-day]:not([disabled])').first().click()
  await cust.waitForSelector('[data-slot]')
  await cust.locator('[data-slot]').first().click()
  await cust.click('[data-testid=booking-next]')
  await cust.locator('input[autocomplete=name]').fill('زبونة تجريبية')
  await cust.locator('input[type=tel]').fill('0661 23 45 67')
  await cust.click('[data-testid=booking-next]')
  await cust.waitForSelector('[data-testid=booking-submit]')
  const total = (await cust.textContent('[data-testid=review-total]'))?.replace(/\s+/g, ' ').trim()
  assert(/2\D?300/.test(total ?? ''), `review total with supplement ${total}`)
  assert((await cust.locator('[data-testid=review-option]').count()) === 1, 'supplement listed on review')
  await cust.click('[data-testid=booking-submit]')
  await cust.waitForSelector('[data-testid=booking-success]')
  const ref = (await cust.textContent('[data-testid=booking-reference]'))?.trim() ?? ''
  const { rows } = await db.query('select status, total_price_dzd from appointments where reference = $1', [ref])
  assert(rows[0]?.status === 'pending' && rows[0].total_price_dzd === 2300, `stored pending 2300, got ${JSON.stringify(rows[0])}`)
  step(`customer books in Arabic with a supplement → ${ref} stored as PENDING, total 1800 + 500`)

  // 7. Admin sees it and confirms.
  await page.getByRole('link', { name: 'Rendez-vous' }).click()
  await page.waitForSelector(`[data-reference="${ref}"]`)
  await page.click(`[data-reference="${ref}"]`)
  await page.waitForSelector('[data-testid=appointment-detail][data-status=pending]')
  assert((await page.locator('[data-testid=detail-option]').count()) === 1, 'admin detail shows the supplement')
  await page.click('[data-action=confirm]')
  await page.click('[data-testid=action-apply]')
  await page.waitForSelector('[data-testid=appointment-detail][data-status=confirmed]')
  const { rows: r2 } = await db.query('select status from appointments where reference = $1', [ref])
  assert(r2[0].status === 'confirmed', 'confirmed in db')
  step('admin sees the request and confirms it')

  // 8. Arabic admin set-up screen renders RTL.
  await page.goto(`${BASE}/admin/horaires`)
  await page.waitForSelector('[data-testid=hours]')
  // The customer just used the Arabic site, so the saved language may already be Arabic.
  if ((await page.evaluate(() => document.documentElement.dir)) !== 'rtl') await page.getByRole('button', { name: /العربية/ }).click()
  await page.waitForFunction(() => document.documentElement.dir === 'rtl')
  await page.waitForSelector('text=أوقات العمل')
  await page.screenshot({ path: `${SHOTS}/admin-setup-ar.png`, fullPage: true })
  step('admin set-up screen in Arabic (RTL)')

  if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`)
} catch (e) {
  failed = true
  console.log(`FAIL - ${e.message.split('\n')[0]}`)
  await page.screenshot({ path: `${SHOTS}/FAIL-setup-flow.png`, fullPage: true }).catch(() => {})
}

await browser.close()
await db.end()
console.log(failed ? '\nsetup flow FAILED' : '\nsetup flow passed')
process.exit(failed ? 1 : 0)
