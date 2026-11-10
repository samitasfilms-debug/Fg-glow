-- =============================================================================
-- FJ GLOW — booking core schema
-- Tables, constraints, indexes, Row Level Security.
-- Business values (hours, prices, durations…) are NOT seeded: the salon enters
-- them in the admin dashboard. Online booking stays disabled until then.
-- =============================================================================

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('super_admin', 'manager', 'staff');

create type public.appointment_status as enum (
  'pending', 'confirmed', 'rejected', 'reschedule_requested', 'cancelled', 'completed', 'no_show'
);

create type public.service_category as enum (
  'brushing', 'haircut', 'coloring', 'balayage', 'straightening', 'care', 'event', 'bridal', 'other'
);

create type public.notification_status as enum (
  'queued',              -- waiting for the server-side provider (WhatsApp Cloud API)
  'awaiting_provider',   -- no provider configured: admin must use click-to-chat
  'manual_opened',       -- admin opened the click-to-chat link (we cannot know if it was sent)
  'sent',
  'failed'
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles (admin users) — linked 1:1 with auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.app_role not null default 'staff',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Role checks used by RLS and RPCs. SECURITY DEFINER so they can read profiles
-- without recursive RLS evaluation.
create function public.current_app_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.is_active
$$;

create function public.is_salon_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_app_role() in ('super_admin', 'manager'), false)
$$;

create function public.is_salon_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.current_app_role() is not null
$$;

-- ---------------------------------------------------------------------------
-- Salon settings (single row)
-- ---------------------------------------------------------------------------
create table public.salon_settings (
  id boolean primary key default true check (id),
  timezone text not null default 'Africa/Algiers',
  -- Online booking is OFF until the salon has configured hours and services.
  booking_enabled boolean not null default false,
  allow_multiple_services boolean not null default true,
  max_services_per_booking smallint not null default 4 check (max_services_per_booking between 1 and 10),
  slot_interval_minutes smallint not null default 15 check (slot_interval_minutes in (5, 10, 15, 20, 30, 45, 60)),
  buffer_minutes smallint not null default 0 check (buffer_minutes between 0 and 120),
  -- Simultaneous appointments allowed when no staff member is assigned.
  salon_capacity smallint not null default 1 check (salon_capacity between 1 and 50),
  min_notice_minutes integer not null default 120 check (min_notice_minutes between 0 and 10080),
  max_advance_days smallint not null default 60 check (max_advance_days between 1 and 365),
  -- A pending request holds its slot for this long; afterwards the hold expires automatically.
  pending_hold_hours smallint not null default 24 check (pending_hold_hours between 1 and 168),
  max_requests_per_phone_per_day smallint not null default 3 check (max_requests_per_phone_per_day between 1 and 20),
  -- Salon WhatsApp number (receives "new request" alerts) — entered by the salon.
  whatsapp_number text check (whatsapp_number is null or whatsapp_number ~ '^\+[1-9][0-9]{7,14}$'),
  -- Set to true once the WhatsApp Cloud API secrets are configured on the Edge Function.
  whatsapp_api_enabled boolean not null default false,
  currency text not null default 'DZD' check (currency = 'DZD'),
  updated_at timestamptz not null default now()
);
create trigger salon_settings_touch before update on public.salon_settings
  for each row execute function public.touch_updated_at();
insert into public.salon_settings (id) values (true);

-- ---------------------------------------------------------------------------
-- Services
-- ---------------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  category public.service_category not null default 'other',
  name_fr text not null check (char_length(name_fr) between 1 and 120),
  name_ar text not null check (char_length(name_ar) between 1 and 120),
  description_fr text check (char_length(description_fr) <= 600),
  description_ar text check (char_length(description_ar) <= 600),
  image_url text,
  price_dzd integer not null check (price_dzd >= 0),
  duration_minutes integer not null check (duration_minutes between 5 and 600),
  is_active boolean not null default true,
  is_bookable_online boolean not null default true,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index services_public_idx on public.services (category, sort_order) where is_active and archived_at is null;
create trigger services_touch before update on public.services
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Staff (optional — the salon may have none configured)
-- ---------------------------------------------------------------------------
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 80),
  photo_url text,
  bio_fr text,
  bio_ar text,
  is_active boolean not null default true,
  is_bookable_online boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger staff_touch before update on public.staff
  for each row execute function public.touch_updated_at();

create table public.staff_services (
  staff_id uuid not null references public.staff (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  primary key (staff_id, service_id)
);
create index staff_services_service_idx on public.staff_services (service_id);

-- ---------------------------------------------------------------------------
-- Opening hours (staff_id null = salon hours) and closures / blocked slots
-- ---------------------------------------------------------------------------
create table public.working_hours (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references public.staff (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday (ISO: extract(dow))
  opens_at time not null,
  closes_at time not null,
  created_at timestamptz not null default now(),
  check (closes_at > opens_at)
);
create index working_hours_lookup_idx on public.working_hours (weekday, staff_id);

create table public.blocked_slots (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references public.staff (id) on delete cascade, -- null = whole salon closed
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text check (char_length(reason) <= 200),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index blocked_slots_range_idx on public.blocked_slots using gist (tstzrange(starts_at, ends_at));

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 80),
  phone text not null unique check (phone ~ '^\+213[5-7][0-9]{8}$'), -- normalised E.164
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  preferred_locale text not null default 'fr' check (preferred_locale in ('fr', 'ar')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_name_idx on public.customers (lower(full_name));
create trigger customers_touch before update on public.customers
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Appointments + service snapshots + history
-- ---------------------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^FG-[0-9]{6}-[A-Z0-9]{4}$'),
  customer_id uuid not null references public.customers (id) on delete restrict,
  staff_id uuid references public.staff (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- ends_at + salon buffer, frozen at booking time; used for overlap checks.
  blocked_until timestamptz not null,
  status public.appointment_status not null default 'pending',
  total_price_dzd integer not null check (total_price_dzd >= 0),
  total_duration_minutes integer not null check (total_duration_minutes > 0),
  customer_notes text check (char_length(customer_notes) <= 500),
  admin_notes text,
  locale text not null default 'fr' check (locale in ('fr', 'ar')),
  hold_expires_at timestamptz, -- only meaningful while pending / reschedule_requested
  previous_starts_at timestamptz, -- original time when a new time is proposed
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (blocked_until >= ends_at),
  -- Hard guarantee: one professional can never have two overlapping confirmed appointments.
  constraint appointments_no_staff_overlap exclude using gist (
    staff_id with =,
    tstzrange(starts_at, blocked_until) with &&
  ) where (status = 'confirmed' and staff_id is not null)
);
create index appointments_range_idx on public.appointments using gist (tstzrange(starts_at, blocked_until));
create index appointments_status_start_idx on public.appointments (status, starts_at);
create index appointments_customer_idx on public.appointments (customer_id, starts_at desc);
create index appointments_staff_idx on public.appointments (staff_id, starts_at);
create trigger appointments_touch before update on public.appointments
  for each row execute function public.touch_updated_at();

create table public.appointment_services (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  -- Snapshot: history never changes when the service is edited later.
  name_fr text not null,
  name_ar text not null,
  price_dzd integer not null check (price_dzd >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  position smallint not null default 0
);
create index appointment_services_appointment_idx on public.appointment_services (appointment_id);

create table public.appointment_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  from_status public.appointment_status,
  to_status public.appointment_status not null,
  actor_id uuid references public.profiles (id) on delete set null, -- null = customer (public form)
  note text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index appointment_events_appointment_idx on public.appointment_events (appointment_id, created_at);

-- ---------------------------------------------------------------------------
-- Notifications log (WhatsApp) and audit log
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments (id) on delete cascade,
  channel text not null default 'whatsapp' check (channel in ('whatsapp')),
  event text not null check (event in ('booking_created', 'booking_confirmed', 'booking_rejected', 'reschedule_proposed', 'booking_cancelled')),
  audience text not null check (audience in ('customer', 'salon')),
  recipient text,
  locale text not null default 'fr' check (locale in ('fr', 'ar')),
  status public.notification_status not null,
  provider text,
  provider_message_id text,
  attempts smallint not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notifications_appointment_idx on public.notifications (appointment_id, created_at);
create index notifications_queue_idx on public.notifications (status, created_at) where status in ('queued', 'failed');
create trigger notifications_touch before update on public.notifications
  for each row execute function public.touch_updated_at();

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id, created_at desc);

-- Public submissions counter (rate limiting the public booking endpoint).
create table public.booking_attempts (
  id bigint generated always as identity primary key,
  phone text not null,
  created_at timestamptz not null default now()
);
create index booking_attempts_phone_idx on public.booking_attempts (phone, created_at desc);

-- =============================================================================
-- Row Level Security
-- Public visitors (anon) can only read the public catalogue. Every write from
-- the public site goes through the SECURITY DEFINER function
-- public.create_booking_request(). Admin writes go through admin_* functions.
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.salon_settings enable row level security;
alter table public.services enable row level security;
alter table public.staff enable row level security;
alter table public.staff_services enable row level security;
alter table public.working_hours enable row level security;
alter table public.blocked_slots enable row level security;
alter table public.customers enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_services enable row level security;
alter table public.appointment_events enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.booking_attempts enable row level security;

-- Start from zero privileges, then grant precisely.
revoke all on all tables in schema public from anon, authenticated;

-- profiles: a member reads their own profile; admins read all. Changes via SQL/dashboard only.
grant select on public.profiles to authenticated;
create policy profiles_self_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_salon_admin());

-- salon_settings: public may read booking rules (no secrets in this table); admins update.
grant select on public.salon_settings to anon, authenticated;
grant update on public.salon_settings to authenticated;
create policy settings_public_read on public.salon_settings for select to anon, authenticated using (true);
create policy settings_admin_update on public.salon_settings for update to authenticated
  using (public.is_salon_admin()) with check (public.is_salon_admin());

-- services: public reads active, non-archived services; admins manage all.
grant select on public.services to anon, authenticated;
grant insert, update, delete on public.services to authenticated;
create policy services_public_read on public.services for select to anon, authenticated
  using ((is_active and archived_at is null) or public.is_salon_member());
create policy services_admin_write on public.services for all to authenticated
  using (public.is_salon_admin()) with check (public.is_salon_admin());

-- staff: public reads active, bookable staff (public columns only); admins manage.
grant select (id, display_name, photo_url, bio_fr, bio_ar, is_active, is_bookable_online, sort_order) on public.staff to anon;
grant select on public.staff to authenticated;
grant insert, update, delete on public.staff to authenticated;
create policy staff_public_read on public.staff for select to anon, authenticated
  using ((is_active and is_bookable_online) or public.is_salon_member());
create policy staff_admin_write on public.staff for all to authenticated
  using (public.is_salon_admin()) with check (public.is_salon_admin());

grant select on public.staff_services to anon, authenticated;
grant insert, delete on public.staff_services to authenticated;
create policy staff_services_public_read on public.staff_services for select to anon, authenticated using (true);
create policy staff_services_admin_write on public.staff_services for all to authenticated
  using (public.is_salon_admin()) with check (public.is_salon_admin());

-- working hours are public (opening hours are shown on the site).
grant select on public.working_hours to anon, authenticated;
grant insert, update, delete on public.working_hours to authenticated;
create policy working_hours_public_read on public.working_hours for select to anon, authenticated using (true);
create policy working_hours_admin_write on public.working_hours for all to authenticated
  using (public.is_salon_admin()) with check (public.is_salon_admin());

-- blocked slots: admins only (availability is exposed through get_available_slots()).
grant select, insert, update, delete on public.blocked_slots to authenticated;
create policy blocked_slots_admin on public.blocked_slots for all to authenticated
  using (public.is_salon_admin()) with check (public.is_salon_admin());

-- Private data: salon members read; status changes only through admin_* functions.
grant select on public.customers, public.appointments, public.appointment_services,
  public.appointment_events, public.notifications to authenticated;
grant update (full_name, email, admin_notes) on public.customers to authenticated;
create policy customers_member_read on public.customers for select to authenticated using (public.is_salon_member());
create policy customers_admin_update on public.customers for update to authenticated
  using (public.is_salon_admin()) with check (public.is_salon_admin());
create policy appointments_member_read on public.appointments for select to authenticated using (public.is_salon_member());
create policy appointment_services_member_read on public.appointment_services for select to authenticated using (public.is_salon_member());
create policy appointment_events_member_read on public.appointment_events for select to authenticated using (public.is_salon_member());
create policy notifications_member_read on public.notifications for select to authenticated using (public.is_salon_member());

grant select on public.audit_logs to authenticated;
create policy audit_logs_admin_read on public.audit_logs for select to authenticated using (public.is_salon_admin());

-- booking_attempts: no client access at all (RLS on, no policy, no grant).
