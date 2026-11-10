-- =============================================================================
-- FJ GLOW — service supplements (options)
-- A supplement belongs to one service (e.g. "French +500 DA" on a manicure).
-- Customers tick supplements under a chosen service; the database recomputes
-- the total and snapshots the chosen supplements on the appointment.
-- Supplements add price only, never duration (availability is unchanged).
-- No business data is inserted here.
-- =============================================================================

create table public.service_options (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  name_fr text not null check (char_length(name_fr) between 1 and 120),
  name_ar text not null check (char_length(name_ar) between 1 and 120),
  price_dzd integer not null check (price_dzd >= 0),
  -- "à partir de": the final amount is set at the salon.
  price_is_minimum boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index service_options_service_idx on public.service_options (service_id, sort_order);

alter table public.service_options enable row level security;
grant select on public.service_options to anon, authenticated;
grant insert, update, delete on public.service_options to authenticated;
create policy service_options_public_read on public.service_options for select to anon, authenticated
  using (is_active or public.is_salon_member());
create policy service_options_admin_write on public.service_options for all to authenticated
  using (public.is_salon_admin()) with check (public.is_salon_admin());

-- Snapshot of the supplements chosen for each booked service.
alter table public.appointment_services add column options jsonb not null default '[]'::jsonb;

create or replace function public.get_public_catalog()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'category', s.category,
        'name_fr', s.name_fr, 'name_ar', s.name_ar,
        'description_fr', s.description_fr, 'description_ar', s.description_ar,
        'image_url', s.image_url, 'price_dzd', s.price_dzd, 'duration_minutes', s.duration_minutes,
        'options', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'name_fr', o.name_fr, 'name_ar', o.name_ar,
          'price_dzd', o.price_dzd, 'price_is_minimum', o.price_is_minimum) order by o.sort_order, o.name_fr)
          from public.service_options o where o.service_id = s.id and o.is_active), '[]'::jsonb)
      ) order by s.category, s.sort_order, s.name_fr)
      from public.services s
      where s.is_active and s.is_bookable_online and s.archived_at is null
    ), '[]'::jsonb),
    'staff', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', st.id, 'display_name', st.display_name, 'photo_url', st.photo_url,
        'service_ids', coalesce((select jsonb_agg(ss.service_id) from public.staff_services ss where ss.staff_id = st.id), '[]'::jsonb)
      ) order by st.sort_order, st.display_name)
      from public.staff st
      where st.is_active and st.is_bookable_online
        and exists (select 1 from public.staff_services ss where ss.staff_id = st.id)
    ), '[]'::jsonb)
  )
$$;

create or replace function public.create_booking_request(p_request jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  cfg public.salon_settings;
  v_name text := btrim(coalesce(p_request ->> 'full_name', ''));
  v_phone text := public.normalize_dz_phone(p_request ->> 'phone');
  v_email text := nullif(lower(btrim(coalesce(p_request ->> 'email', ''))), '');
  v_notes text := nullif(btrim(coalesce(p_request ->> 'notes', '')), '');
  v_locale text := coalesce(nullif(p_request ->> 'locale', ''), 'fr');
  v_staff uuid := nullif(p_request ->> 'staff_id', '')::uuid;
  v_start timestamptz;
  v_service_ids uuid[];
  v_option_ids uuid[];
  v_options_price integer := 0;
  v_price integer;
  v_duration integer;
  chk record;
  v_customer uuid;
  v_appt uuid;
  v_ref text;
begin
  select * into cfg from public.salon_settings where id;
  if not cfg.booking_enabled then perform public._fgg_error('FGG_BOOKING_DISABLED'); end if;

  -- 1. Validate input -------------------------------------------------------
  if char_length(v_name) < 2 or char_length(v_name) > 80 then perform public._fgg_error('FGG_INVALID_NAME'); end if;
  if v_phone is null then perform public._fgg_error('FGG_INVALID_PHONE'); end if;
  if v_email is not null and (char_length(v_email) > 160 or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    perform public._fgg_error('FGG_INVALID_EMAIL');
  end if;
  if v_notes is not null and char_length(v_notes) > 500 then perform public._fgg_error('FGG_INVALID_NOTES'); end if;
  if v_locale not in ('fr', 'ar') then v_locale := 'fr'; end if;
  begin
    v_start := (p_request ->> 'starts_at')::timestamptz;
    select array_agg(x::uuid) into v_service_ids from jsonb_array_elements_text(p_request -> 'service_ids') x;
    select coalesce(array_agg(distinct x::uuid), '{}') into v_option_ids
      from jsonb_array_elements_text(coalesce(p_request -> 'option_ids', '[]'::jsonb)) x;
  exception when others then
    perform public._fgg_error('FGG_INVALID_REQUEST');
  end;
  if v_start is null then perform public._fgg_error('FGG_INVALID_REQUEST'); end if;
  if coalesce(array_length(v_service_ids, 1), 0) > (case when cfg.allow_multiple_services then cfg.max_services_per_booking else 1 end) then
    perform public._fgg_error('FGG_TOO_MANY_SERVICES');
  end if;

  -- 2-3. Services must be active; totals come from trusted rows -------------
  select total_price, total_duration into v_price, v_duration from public._fgg_service_totals(v_service_ids);

  -- Supplements: each must be active and belong to one of the chosen services.
  if cardinality(v_option_ids) > 0 then
    if (select count(*) from public.service_options o
        where o.id = any (v_option_ids) and o.is_active and o.service_id = any (v_service_ids)) <> cardinality(v_option_ids) then
      perform public._fgg_error('FGG_INVALID_OPTIONS');
    end if;
    select coalesce(sum(o.price_dzd), 0) into v_options_price from public.service_options o where o.id = any (v_option_ids);
    v_price := v_price + v_options_price;
  end if;

  if v_staff is not null and not exists (select 1 from public._fgg_eligible_staff(v_service_ids) e where e = v_staff) then
    perform public._fgg_error('FGG_STAFF_UNAVAILABLE');
  end if;

  -- Serialise against concurrent requests from here on.
  perform public._fgg_lock_schedule();

  -- Rate limit per phone number.
  if (select count(*) from public.booking_attempts b
      where b.phone = v_phone and b.created_at > now() - interval '24 hours') >= cfg.max_requests_per_phone_per_day then
    perform public._fgg_error('FGG_RATE_LIMITED');
  end if;
  insert into public.booking_attempts (phone) values (v_phone);

  -- Duplicate: same customer already holds an overlapping active request.
  if exists (
    select 1 from public.appointments a join public.customers c on c.id = a.customer_id
    where c.phone = v_phone
      and a.status in ('pending', 'confirmed', 'reschedule_requested')
      and tstzrange(a.starts_at, a.ends_at) && tstzrange(v_start, v_start + make_interval(mins => v_duration))
  ) then
    perform public._fgg_error('FGG_DUPLICATE_REQUEST');
  end if;

  -- 4-5. Availability, re-checked inside the lock ----------------------------
  select * into chk from public._fgg_check_slot(v_start, v_duration, v_service_ids, v_staff, null, false, true);
  if not chk.ok then perform public._fgg_error('FGG_SLOT_UNAVAILABLE', chk.reason); end if;

  -- 6. Customer + appointment ------------------------------------------------
  insert into public.customers (full_name, phone, email, preferred_locale)
  values (v_name, v_phone, v_email, v_locale)
  on conflict (phone) do update
    set full_name = excluded.full_name,
        email = coalesce(excluded.email, public.customers.email),
        preferred_locale = excluded.preferred_locale
  returning id into v_customer;

  v_ref := public._fgg_new_reference(v_start, cfg.timezone);

  insert into public.appointments (
    reference, customer_id, staff_id, starts_at, ends_at, blocked_until, status,
    total_price_dzd, total_duration_minutes, customer_notes, locale, hold_expires_at
  ) values (
    v_ref, v_customer, v_staff, v_start,
    v_start + make_interval(mins => v_duration),
    v_start + make_interval(mins => v_duration + cfg.buffer_minutes),
    'pending', v_price, v_duration, v_notes, v_locale,
    now() + make_interval(hours => cfg.pending_hold_hours)
  ) returning id into v_appt;

  -- Snapshots, in the order chosen by the customer.
  insert into public.appointment_services (appointment_id, service_id, name_fr, name_ar, price_dzd, duration_minutes, position, options)
  select v_appt, s.id, s.name_fr, s.name_ar, s.price_dzd, s.duration_minutes, ord.n - 1,
    coalesce((select jsonb_agg(jsonb_build_object('name_fr', o.name_fr, 'name_ar', o.name_ar, 'price_dzd', o.price_dzd,
      'price_is_minimum', o.price_is_minimum) order by o.sort_order, o.name_fr)
      from public.service_options o where o.service_id = s.id and o.id = any (v_option_ids)), '[]'::jsonb)
  from unnest(v_service_ids) with ordinality as ord (sid, n)
  join public.services s on s.id = ord.sid;

  insert into public.appointment_events (appointment_id, from_status, to_status, note, details)
  values (v_appt, null, 'pending', null, jsonb_build_object('source', 'website'));

  -- Salon-side "new request" notification (sent by the server provider if configured).
  insert into public.notifications (appointment_id, event, audience, recipient, locale, status)
  values (v_appt, 'booking_created', 'salon', cfg.whatsapp_number, 'fr',
          (case when cfg.whatsapp_api_enabled and cfg.whatsapp_number is not null then 'queued' else 'awaiting_provider' end)::public.notification_status);

  return jsonb_build_object(
    'reference', v_ref,
    'status', 'pending',
    'starts_at', v_start,
    'ends_at', v_start + make_interval(mins => v_duration),
    'total_price_dzd', v_price,
    'total_duration_minutes', v_duration
  );
end $$;

create or replace function public.admin_get_appointment(p_appointment_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  result jsonb;
begin
  if not public.is_salon_member() then perform public._fgg_error('FGG_FORBIDDEN'); end if;
  select jsonb_build_object(
    'id', a.id, 'reference', a.reference, 'status', a.status,
    'starts_at', a.starts_at, 'ends_at', a.ends_at, 'previous_starts_at', a.previous_starts_at,
    'total_price_dzd', a.total_price_dzd, 'total_duration_minutes', a.total_duration_minutes,
    'customer_notes', a.customer_notes, 'locale', a.locale,
    'hold_expires_at', a.hold_expires_at, 'created_at', a.created_at,
    'staff', (select jsonb_build_object('id', st.id, 'display_name', st.display_name) from public.staff st where st.id = a.staff_id),
    'customer', jsonb_build_object('id', c.id, 'full_name', c.full_name, 'phone', c.phone, 'email', c.email,
      'completed_count', (select count(*) from public.appointments x where x.customer_id = c.id and x.status = 'completed'),
      'total_count', (select count(*) from public.appointments x where x.customer_id = c.id)),
    'services', coalesce((select jsonb_agg(jsonb_build_object('name_fr', s.name_fr, 'name_ar', s.name_ar,
      'price_dzd', s.price_dzd, 'duration_minutes', s.duration_minutes, 'options', s.options) order by s.position)
      from public.appointment_services s where s.appointment_id = a.id), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object('from_status', e.from_status, 'to_status', e.to_status,
      'note', e.note, 'details', e.details, 'created_at', e.created_at,
      'actor', (select p.full_name from public.profiles p where p.id = e.actor_id)) order by e.created_at)
      from public.appointment_events e where e.appointment_id = a.id), '[]'::jsonb),
    'notifications', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'event', n.event, 'audience', n.audience,
      'status', n.status, 'recipient', n.recipient, 'locale', n.locale, 'created_at', n.created_at) order by n.created_at)
      from public.notifications n where n.appointment_id = a.id), '[]'::jsonb)
  ) into result
  from public.appointments a join public.customers c on c.id = a.customer_id
  where a.id = p_appointment_id;
  if result is null then perform public._fgg_error('FGG_NOT_FOUND'); end if;
  return result;
end $$;
