# FG GLOW — Booking system

Customers send a booking **request** from `/fr/reservation` or `/ar/reservation`.
`/booking` and `/:lang/booking` redirect there. Every request is created as **PENDING**:
the customer is told clearly that it is not confirmed until the salon approves it in `/admin`.
Payment is on site only.

## 1. Database (Supabase project `fg-glow`)

Migrations live in `supabase/migrations/` and are already applied to the `fg-glow` project:

| File | Contents |
|---|---|
| `20261101000001_booking_core.sql` | enums, tables, triggers, RLS policies, grants |
| `20261101000002_booking_engine.sql` | availability engine, `create_booking_request`, admin status changes |
| `20261101000003_booking_read_api.sql` | `get_public_catalog`, `admin_list_appointments`, `admin_get_appointment`, `get_my_profile` |
| `20261104000002_beauty_categories.sql` | categories lashes, brows, manicure, pedicure, waxing |
| `20261104000003_service_options.sql` | `service_options` (supplements per service, price only), snapshot `appointment_services.options`, catalogue / booking / admin detail updated |
| `20261104000001_salon_setup_admin.sql` | `admin_save_salon_hours` (atomic weekly hours), `admin_set_booking_enabled` (refuses to open without services + hours) |

Tables: `profiles`, `salon_settings` (one row), `services`, `staff`, `staff_services`, `working_hours`,
`blocked_slots`, `customers`, `appointments`, `appointment_services` (price/name snapshots),
`appointment_events` (history), `notifications`, `audit_logs`, `booking_attempts` (rate limiting).

### Security model
- The browser only ever has the **publishable (anon) key**. No service role key, no WhatsApp secret in the frontend.
- RLS is enabled on every table. Anonymous visitors can read only the public catalogue
  (active services, public staff fields, opening hours, public settings). Customers, appointments,
  history, notifications and audit logs are readable only by salon members (`profiles` row).
- All writes go through `SECURITY DEFINER` functions with `search_path = ''`:
  - `create_booking_request` (anon): validates name/phone/email/notes, normalises the Algerian phone,
    checks services are active, **recomputes prices and durations from the database**, takes a
    schedule lock, checks the slot again (hours, closures, buffer, notice, max advance, staff or
    salon capacity, other appointments), enforces a per-phone daily limit and duplicate detection,
    then stores the appointment as `pending` with a reference `FG-YYMMDD-XXXX`.
  - `admin_update_appointment` (salon managers only): confirm / reject / propose another time /
    cancel / completed / no-show, with allowed-transition checks, a fresh availability check,
    history + audit log + notification record.
- A Postgres exclusion constraint makes two confirmed appointments for the same staff member
  physically impossible to overlap, even with concurrent requests.
- A pending request holds its slot for `pending_hold_hours` (default 24 h) and then frees it.

### Availability rules
Slots are computed by the database from: opening hours (salon or per staff), `blocked_slots`
(closures, holidays), total duration of the chosen services, `buffer_minutes`, `slot_interval_minutes`,
`min_notice_minutes`, `max_advance_days`, existing confirmed appointments and active pending holds.
If at least one active staff member has services assigned, booking works per staff member
("staff mode"); otherwise the salon's `salon_capacity` is used. Time zone: `Africa/Algiers`.

## 2. Opening online booking (salon data — nothing has been invented)
Everything is entered by the salon in the admin dashboard; nothing is seeded:
1. **`/admin/prestations`** — add each service: category, name FR + AR, optional descriptions,
   **real price in DZD**, duration in minutes, active / bookable online, and its **supplements**
   (e.g. French +500 DA; "à partir de" for variable prices). Customers tick supplements under the
   chosen service; the database recomputes the total. Supplements never change the duration.
2. **`/admin/horaires`** — weekly opening hours (one or more ranges per day; a day with no range
   is closed), exceptional closures (whole days), booking rules (slot interval, buffer, capacity,
   minimum notice, how far ahead, pending hold, max services, salon WhatsApp number).
3. **`/admin/horaires` → "Ouvrir la réservation en ligne"**. The button stays disabled (and the
   database refuses) until at least one active service and opening hours exist.

Until then `/reservation` says online booking is unavailable and links to the contact page
(no "coming soon" wording). Removing all hours closes booking automatically.

## 3. Creating the first admin
1. Supabase → Authentication → Users → *Add user* (email + password, auto-confirm).
2. SQL editor:
   ```sql
   insert into public.profiles (id, full_name, role)
   values ('<uuid of the auth user>', 'Nom de la gérante', 'super_admin');
   ```
   Roles: `super_admin` and `manager` can act on appointments; `staff` can only view.
3. Sign in at `/admin` (→ `/admin/connexion`).

## 4. Admin appointments (`/admin/rendez-vous`)
List with status filters + counts, search (name, phone, reference), date range.
Detail: services and snapshot prices, customer (phone, email, notes, visit count, call button),
history, WhatsApp notifications, and actions allowed for the current status
(confirm, reject, propose another time, cancel, completed, no-show). FR/AR toggle.

## 5. WhatsApp
- **Today (no API credentials):** after each action a notification is recorded as
  "À envoyer manuellement". The **Ouvrir WhatsApp** button opens `wa.me` with a prefilled
  message in the customer's language; the salon presses *send* itself. The app never claims a
  message was sent; it records only that the link was opened.
- **Later (WhatsApp Cloud API):** `supabase/functions/whatsapp-dispatch/index.ts` is written but
  **not deployed and not tested against Meta**. To activate: create a Meta Business app, approve
  templates `fg_glow_booking_confirmed`, `fg_glow_booking_rejected`, `fg_glow_reschedule_proposed`,
  `fg_glow_booking_cancelled` (4 body parameters: name, date, time, reference), set secrets
  `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `DISPATCH_SECRET`, deploy the function,
  schedule it with Supabase cron, then set `salon_settings.whatsapp_api_enabled = true`.

## 6. Environment variables (Vercel → Project → Settings → Environment Variables)
```
VITE_SUPABASE_URL=https://tulciaykouercciyexzl.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key from Supabase → Project Settings → API Keys>
```

## 7. Tests
All tests use a throwaway local PostgreSQL with fictitious fixtures. Nothing is seeded in the real project.
```bash
# PostgreSQL 16 on PGHOST/PGPORT/PGUSER
supabase/tests/run.sh               # SQL assertions (engine + salon set-up): slots, rules, RLS, transitions, admin API
supabase/tests/02_concurrency.sh    # 8 parallel requests for one slot → 1 accepted, 7 refused
e2e/setup-db.sh                     # e2e database = migrations + e2e/seed.sql
VITE_SUPABASE_URL=http://127.0.0.1:4400 VITE_SUPABASE_ANON_KEY=test npx vite build --outDir dist-e2e
e2e/start-server.sh                 # serves the build + emulates Supabase RPC/Auth over the real SQL
node e2e/run.mjs                    # 16 Playwright scenarios (FR, AR, mobile, admin)
# From an empty salon: admin adds a service + hours, opens booking, customer books (AR), admin confirms
E2E_DB=fgg_e2e_empty e2e/setup-db.sh --accounts-only
E2E_DB=fgg_e2e_empty e2e/start-server.sh
E2E_DB=fgg_e2e_empty node e2e/setup-flow.mjs
```
`e2e/server.mjs` is a local stand-in for PostgREST/GoTrue: it runs each RPC as `anon` or
`authenticated` with `auth.uid()` set, so grants, RLS and functions behave as on Supabase,
but it is **not** Supabase itself. A final check on the real project is still needed once real data exists.
