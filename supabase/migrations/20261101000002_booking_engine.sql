-- =============================================================================
-- FJ GLOW — availability engine, public booking endpoint, admin actions
--
-- SLOT POLICY
--   * A slot is offered only inside salon opening hours (working_hours with
--     staff_id null), outside salon closures, after the minimum notice and
--     within the advance-booking window.
--   * Blocking appointments = confirmed ones + pending / reschedule_requested
--     ones whose hold has not expired (hold_expires_at, set from
--     salon_settings.pending_hold_hours). Expired holds stop blocking
--     automatically, no cron needed.
--   * Salon mode (no staff configured with services): at most salon_capacity
--     overlapping blocking appointments.
--   * Staff mode: a professional able to perform ALL selected services must be
--     working, not blocked and not already booked.
--   * Every write takes the same transaction-level advisory lock, so two
--     concurrent requests are serialised; the availability check is repeated
--     inside the lock. Confirmation re-checks against confirmed appointments,
--     and the exclusion constraint forbids overlapping confirmed appointments
--     for the same professional.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Small helpers
-- ---------------------------------------------------------------------------
create function public._fgg_error(code text, detail text default null) returns void
language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = 'P0001', message = code, detail = coalesce(detail, code);
end $$;

-- Algerian mobile numbers → +2135xxxxxxxx / +2136… / +2137…; null if invalid.
create function public.normalize_dz_phone(p text) returns text
language plpgsql immutable set search_path = '' as $$
declare
  v text := regexp_replace(coalesce(p, ''), '[\s.\-()]', '', 'g');
begin
  if v ~ '^00213' then v := '+213' || substr(v, 6);
  elsif v ~ '^213' then v := '+' || v;
  elsif v ~ '^0[5-7]' then v := '+213' || substr(v, 2);
  end if;
  if v ~ '^\+213[5-7][0-9]{8}$' then return v; end if;
  return null;
end $$;

-- Lock serialising every schedule mutation (booking, confirmation, proposal).
create function public._fgg_lock_schedule() returns void
language sql set search_path = '' as $$ select pg_advisory_xact_lock(hashtext('fg_glow_schedule')) $$;

-- Totals for a set of service ids; raises if any is missing/inactive/not bookable.
create function public._fgg_service_totals(p_service_ids uuid[], out total_price integer, out total_duration integer)
language plpgsql stable security definer set search_path = '' as $$
declare
  n_requested integer := coalesce(array_length(p_service_ids, 1), 0);
  n_valid integer;
begin
  if n_requested = 0 then perform public._fgg_error('FGG_NO_SERVICE'); end if;
  if n_requested <> (select count(distinct x) from unnest(p_service_ids) x) then
    perform public._fgg_error('FGG_INVALID_SERVICES', 'duplicate service ids');
  end if;
  select count(*), coalesce(sum(s.price_dzd), 0), coalesce(sum(s.duration_minutes), 0)
    into n_valid, total_price, total_duration
  from public.services s
  where s.id = any (p_service_ids) and s.is_active and s.is_bookable_online and s.archived_at is null;
  if n_valid <> n_requested then perform public._fgg_error('FGG_SERVICE_UNAVAILABLE'); end if;
end $$;

-- Staff able to perform all requested services (active + bookable online).
create function public._fgg_eligible_staff(p_service_ids uuid[]) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select st.id
  from public.staff st
  where st.is_active and st.is_bookable_online
    and (select count(*) from public.staff_services ss
         where ss.staff_id = st.id and ss.service_id = any (p_service_ids)) = coalesce(array_length(p_service_ids, 1), 0)
$$;

-- Staff mode is on as soon as one active professional has services assigned.
create function public._fgg_staff_mode() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff st join public.staff_services ss on ss.staff_id = st.id
    where st.is_active and st.is_bookable_online
  )
$$;

-- Does [p_start, p_end) fall inside the given working hours on its local day?
create function public._fgg_within_hours(p_staff uuid, p_start timestamptz, p_end timestamptz, p_tz text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.working_hours wh
    where wh.staff_id is not distinct from p_staff
      and wh.weekday = extract(dow from (p_start at time zone p_tz))::int
      and (p_start at time zone p_tz)::date = (p_end at time zone p_tz - interval '1 microsecond')::date
      and (p_start at time zone p_tz)::time >= wh.opens_at
      and (p_end at time zone p_tz)::time <= wh.closes_at
      and (p_end at time zone p_tz)::time > (p_start at time zone p_tz)::time
  )
$$;

-- Core check. Returns (ok, assigned staff). Must be called under the schedule lock for writes.
--   p_confirmed_only: only confirmed appointments block (used when the salon confirms).
--   p_enforce_notice: apply min notice / advance window (public requests).
create function public._fgg_check_slot(
  p_start timestamptz,
  p_duration integer,
  p_service_ids uuid[],
  p_staff uuid,
  p_exclude uuid,
  p_confirmed_only boolean,
  p_enforce_notice boolean,
  out ok boolean,
  out assigned_staff uuid,
  out reason text
)
language plpgsql stable security definer set search_path = '' as $$
declare
  cfg public.salon_settings;
  v_end timestamptz := p_start + make_interval(mins => p_duration);
  v_block_end timestamptz;
  v_local_today date;
  v_unassigned integer;
  v_free uuid[];
begin
  ok := false; assigned_staff := null; reason := null;
  select * into cfg from public.salon_settings where id;
  v_block_end := v_end + make_interval(mins => cfg.buffer_minutes);
  v_local_today := (now() at time zone cfg.timezone)::date;

  if p_enforce_notice then
    if p_start < now() + make_interval(mins => cfg.min_notice_minutes) then reason := 'notice'; return; end if;
    if (p_start at time zone cfg.timezone)::date > v_local_today + cfg.max_advance_days then reason := 'too_far'; return; end if;
  elsif p_start < now() then
    reason := 'past'; return;
  end if;

  -- Slot grid alignment keeps the public endpoint from accepting odd times.
  if p_enforce_notice and (extract(epoch from (p_start at time zone cfg.timezone)::time)::int / 60) % cfg.slot_interval_minutes <> 0 then
    reason := 'grid'; return;
  end if;

  if not public._fgg_within_hours(null, p_start, v_end, cfg.timezone) then reason := 'closed'; return; end if;

  if exists (select 1 from public.blocked_slots b
             where b.staff_id is null and tstzrange(b.starts_at, b.ends_at) && tstzrange(p_start, v_block_end)) then
    reason := 'blocked'; return;
  end if;

  if public._fgg_staff_mode() then
    select array_agg(st.id order by st.sort_order, st.display_name)
      into v_free
    from public.staff st
    where st.id in (select public._fgg_eligible_staff(p_service_ids))
      and (p_staff is null or st.id = p_staff)
      and (
        public._fgg_within_hours(st.id, p_start, v_end, cfg.timezone)
        or not exists (select 1 from public.working_hours w where w.staff_id = st.id) -- falls back to salon hours
      )
      and not exists (select 1 from public.blocked_slots b
                      where b.staff_id = st.id and tstzrange(b.starts_at, b.ends_at) && tstzrange(p_start, v_block_end))
      and not exists (select 1 from public.appointments a
                      where a.staff_id = st.id
                        and a.id is distinct from p_exclude
                        and tstzrange(a.starts_at, a.blocked_until) && tstzrange(p_start, v_block_end)
                        and (a.status = 'confirmed'
                             or (not p_confirmed_only and a.status in ('pending', 'reschedule_requested') and a.hold_expires_at > now())));

    if coalesce(array_length(v_free, 1), 0) = 0 then reason := 'staff_busy'; return; end if;

    if p_staff is null then
      select count(*) into v_unassigned from public.appointments a
      where a.staff_id is null and a.id is distinct from p_exclude
        and tstzrange(a.starts_at, a.blocked_until) && tstzrange(p_start, v_block_end)
        and (a.status = 'confirmed'
             or (not p_confirmed_only and a.status in ('pending', 'reschedule_requested') and a.hold_expires_at > now()));
      if array_length(v_free, 1) - v_unassigned < 1 then reason := 'staff_busy'; return; end if;
    end if;

    ok := true;
    assigned_staff := v_free[1];
    return;
  end if;

  -- Salon mode: capacity rule.
  if (select count(*) from public.appointments a
      where a.id is distinct from p_exclude
        and tstzrange(a.starts_at, a.blocked_until) && tstzrange(p_start, v_block_end)
        and (a.status = 'confirmed'
             or (not p_confirmed_only and a.status in ('pending', 'reschedule_requested') and a.hold_expires_at > now())))
     >= cfg.salon_capacity then
    reason := 'full'; return;
  end if;

  ok := true;
end $$;

-- ---------------------------------------------------------------------------
-- PUBLIC: available start times for one local date
-- ---------------------------------------------------------------------------
create function public.get_available_slots(p_date date, p_service_ids uuid[], p_staff_id uuid default null)
returns table (starts_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  cfg public.salon_settings;
  v_duration integer;
  v_price integer;
  wh record;
  t timestamptz;
  v_close timestamptz;
  chk record;
begin
  select * into cfg from public.salon_settings where id;
  if not cfg.booking_enabled then return; end if;
  select total_price, total_duration into v_price, v_duration from public._fgg_service_totals(p_service_ids);
  if p_date < (now() at time zone cfg.timezone)::date
     or p_date > (now() at time zone cfg.timezone)::date + cfg.max_advance_days then
    return;
  end if;

  for wh in
    select w.opens_at, w.closes_at from public.working_hours w
    where w.staff_id is null and w.weekday = extract(dow from p_date)::int
    order by w.opens_at
  loop
    t := (p_date + wh.opens_at) at time zone cfg.timezone;
    v_close := (p_date + wh.closes_at) at time zone cfg.timezone;
    while t + make_interval(mins => v_duration) <= v_close loop
      select * into chk from public._fgg_check_slot(t, v_duration, p_service_ids, p_staff_id, null, false, true);
      if chk.ok then
        starts_at := t;
        return next;
      end if;
      t := t + make_interval(mins => cfg.slot_interval_minutes);
    end loop;
  end loop;
end $$;

-- PUBLIC: number of open slots per day, for the calendar (max 62 days per call).
create function public.get_availability_calendar(p_from date, p_to date, p_service_ids uuid[], p_staff_id uuid default null)
returns table (day date, slot_count integer)
language plpgsql stable security definer set search_path = '' as $$
declare
  d date;
begin
  if p_to < p_from or p_to - p_from > 62 then perform public._fgg_error('FGG_INVALID_RANGE'); end if;
  d := p_from;
  while d <= p_to loop
    day := d;
    select count(*)::int into slot_count from public.get_available_slots(d, p_service_ids, p_staff_id);
    return next;
    d := d + 1;
  end loop;
end $$;

-- PUBLIC: is online booking open? (lets the UI show an honest state)
create function public.get_booking_status()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'enabled', s.booking_enabled,
    'has_hours', exists (select 1 from public.working_hours w where w.staff_id is null),
    'has_services', exists (select 1 from public.services v where v.is_active and v.is_bookable_online and v.archived_at is null),
    'staff_mode', public._fgg_staff_mode(),
    'allow_multiple_services', s.allow_multiple_services,
    'max_services_per_booking', s.max_services_per_booking,
    'max_advance_days', s.max_advance_days,
    'timezone', s.timezone
  )
  from public.salon_settings s where s.id
$$;

-- ---------------------------------------------------------------------------
-- PUBLIC: create a booking request (always PENDING)
-- ---------------------------------------------------------------------------
create function public._fgg_new_reference(p_start timestamptz, p_tz text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea;
  suffix text;
  ref text;
begin
  loop
    bytes := extensions.gen_random_bytes(4);
    suffix := '';
    for i in 0..3 loop
      suffix := suffix || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
    end loop;
    ref := 'FG-' || to_char(p_start at time zone p_tz, 'YYMMDD') || '-' || suffix;
    exit when not exists (select 1 from public.appointments a where a.reference = ref);
  end loop;
  return ref;
end $$;

create function public.create_booking_request(p_request jsonb)
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
  exception when others then
    perform public._fgg_error('FGG_INVALID_REQUEST');
  end;
  if v_start is null then perform public._fgg_error('FGG_INVALID_REQUEST'); end if;
  if coalesce(array_length(v_service_ids, 1), 0) > (case when cfg.allow_multiple_services then cfg.max_services_per_booking else 1 end) then
    perform public._fgg_error('FGG_TOO_MANY_SERVICES');
  end if;

  -- 2-3. Services must be active; totals come from trusted rows -------------
  select total_price, total_duration into v_price, v_duration from public._fgg_service_totals(v_service_ids);

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
  insert into public.appointment_services (appointment_id, service_id, name_fr, name_ar, price_dzd, duration_minutes, position)
  select v_appt, s.id, s.name_fr, s.name_ar, s.price_dzd, s.duration_minutes, ord.n - 1
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

-- ---------------------------------------------------------------------------
-- ADMIN: status changes (super_admin / manager only)
-- actions: confirm | reject | propose | cancel | complete | no_show
-- ---------------------------------------------------------------------------
create function public.admin_update_appointment(
  p_appointment_id uuid,
  p_action text,
  p_note text default null,
  p_new_starts_at timestamptz default null,
  p_staff_id uuid default null
)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  cfg public.salon_settings;
  a public.appointments;
  v_service_ids uuid[];
  v_to public.appointment_status;
  v_staff uuid;
  v_start timestamptz;
  chk record;
  v_event text;
  v_phone text;
begin
  if not public.is_salon_admin() then perform public._fgg_error('FGG_FORBIDDEN'); end if;
  select * into cfg from public.salon_settings where id;

  perform public._fgg_lock_schedule();
  select * into a from public.appointments where id = p_appointment_id for update;
  if not found then perform public._fgg_error('FGG_NOT_FOUND'); end if;

  select array_agg(service_id) filter (where service_id is not null) into v_service_ids
  from public.appointment_services where appointment_id = a.id;

  v_to := case p_action
    when 'confirm' then 'confirmed'
    when 'reject' then 'rejected'
    when 'propose' then 'reschedule_requested'
    when 'cancel' then 'cancelled'
    when 'complete' then 'completed'
    when 'no_show' then 'no_show'
  end::public.appointment_status;
  if v_to is null then perform public._fgg_error('FGG_INVALID_ACTION'); end if;

  -- Allowed transitions
  if not (
    (p_action = 'confirm' and a.status in ('pending', 'reschedule_requested'))
    or (p_action = 'reject' and a.status in ('pending', 'reschedule_requested'))
    or (p_action = 'propose' and a.status in ('pending', 'reschedule_requested', 'confirmed'))
    or (p_action = 'cancel' and a.status in ('pending', 'reschedule_requested', 'confirmed'))
    or (p_action in ('complete', 'no_show') and a.status = 'confirmed')
  ) then
    perform public._fgg_error('FGG_INVALID_TRANSITION', a.status::text || ' -> ' || p_action);
  end if;

  v_staff := coalesce(p_staff_id, a.staff_id);
  v_start := a.starts_at;

  if p_action = 'confirm' then
    -- Re-check against CONFIRMED appointments (pending holds of others do not block the salon's decision).
    select * into chk from public._fgg_check_slot(a.starts_at, a.total_duration_minutes, coalesce(v_service_ids, '{}'),
                                                  v_staff, a.id, true, false);
    if not chk.ok then perform public._fgg_error('FGG_SLOT_UNAVAILABLE', chk.reason); end if;
    v_staff := coalesce(v_staff, chk.assigned_staff);
    update public.appointments
       set status = 'confirmed', staff_id = v_staff, hold_expires_at = null, status_changed_at = now()
     where id = a.id;
    v_event := 'booking_confirmed';

  elsif p_action = 'propose' then
    if p_new_starts_at is null then perform public._fgg_error('FGG_INVALID_REQUEST', 'new time required'); end if;
    select * into chk from public._fgg_check_slot(p_new_starts_at, a.total_duration_minutes, coalesce(v_service_ids, '{}'),
                                                  v_staff, a.id, false, false);
    if not chk.ok then perform public._fgg_error('FGG_SLOT_UNAVAILABLE', chk.reason); end if;
    v_start := p_new_starts_at;
    update public.appointments
       set status = 'reschedule_requested',
           previous_starts_at = a.starts_at,
           starts_at = p_new_starts_at,
           ends_at = p_new_starts_at + make_interval(mins => a.total_duration_minutes),
           blocked_until = p_new_starts_at + make_interval(mins => a.total_duration_minutes + cfg.buffer_minutes),
           staff_id = v_staff,
           hold_expires_at = now() + make_interval(hours => cfg.pending_hold_hours),
           status_changed_at = now()
     where id = a.id;
    v_event := 'reschedule_proposed';

  else
    update public.appointments
       set status = v_to, hold_expires_at = null, status_changed_at = now()
     where id = a.id;
    v_event := case p_action when 'reject' then 'booking_rejected' when 'cancel' then 'booking_cancelled' end;
  end if;

  if p_note is not null and char_length(p_note) > 1000 then perform public._fgg_error('FGG_INVALID_NOTES'); end if;

  insert into public.appointment_events (appointment_id, from_status, to_status, actor_id, note, details)
  values (a.id, a.status, v_to, auth.uid(), nullif(btrim(coalesce(p_note, '')), ''),
          jsonb_strip_nulls(jsonb_build_object(
            'previous_starts_at', case when p_action = 'propose' then a.starts_at end,
            'new_starts_at', case when p_action = 'propose' then v_start end,
            'staff_id', v_staff)));

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'appointment.' || p_action, 'appointments', a.id,
          jsonb_build_object('reference', a.reference, 'from', a.status, 'to', v_to));

  if v_event is not null then
    select c.phone into v_phone from public.customers c where c.id = a.customer_id;
    insert into public.notifications (appointment_id, event, audience, recipient, locale, status)
    values (a.id, v_event, 'customer', v_phone, a.locale,
            (case when cfg.whatsapp_api_enabled and v_phone is not null then 'queued' else 'awaiting_provider' end)::public.notification_status);
  end if;

  return jsonb_build_object('id', a.id, 'reference', a.reference, 'status', v_to, 'starts_at', v_start, 'staff_id', v_staff);
end $$;

-- ADMIN: record that the click-to-chat WhatsApp link was opened (we cannot know if it was sent).
create function public.admin_mark_notification_opened(p_notification_id uuid)
returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_salon_member() then perform public._fgg_error('FGG_FORBIDDEN'); end if;
  update public.notifications
     set status = 'manual_opened', provider = 'click_to_chat', attempts = attempts + 1
   where id = p_notification_id and status in ('awaiting_provider', 'failed', 'manual_opened');
end $$;

-- ---------------------------------------------------------------------------
-- Function privileges: deny by default, then expose the public API.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.get_available_slots(date, uuid[], uuid) to anon, authenticated;
grant execute on function public.get_availability_calendar(date, date, uuid[], uuid) to anon, authenticated;
grant execute on function public.get_booking_status() to anon, authenticated;
grant execute on function public.create_booking_request(jsonb) to anon, authenticated;
grant execute on function public.normalize_dz_phone(text) to anon, authenticated;

grant execute on function public.admin_update_appointment(uuid, text, text, timestamptz, uuid) to authenticated;
grant execute on function public.admin_mark_notification_opened(uuid) to authenticated;
-- Used inside RLS policies, so the calling role needs EXECUTE.
grant execute on function public.current_app_role() to anon, authenticated;
grant execute on function public.is_salon_admin() to anon, authenticated;
grant execute on function public.is_salon_member() to anon, authenticated;
