-- =============================================================================
-- FJ GLOW — read API used by the website and the admin dashboard.
-- Everything the UI reads goes through these functions, so filtering and
-- authorization happen in the database, never in the browser.
-- =============================================================================

-- PUBLIC: bookable catalogue (active services + bookable staff with their services).
create function public.get_public_catalog()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'category', s.category,
        'name_fr', s.name_fr, 'name_ar', s.name_ar,
        'description_fr', s.description_fr, 'description_ar', s.description_ar,
        'image_url', s.image_url, 'price_dzd', s.price_dzd, 'duration_minutes', s.duration_minutes
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

-- ADMIN: filtered appointment list (salon members only).
create function public.admin_list_appointments(
  p_status public.appointment_status[] default null,
  p_from date default null,
  p_to date default null,
  p_search text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  tz text;
  q text := nullif(btrim(coalesce(p_search, '')), '');
  -- digits of the search, without the national leading 0 (stored numbers are +213…)
  digits text := regexp_replace(regexp_replace(coalesce(p_search, ''), '[^0-9]', '', 'g'), '^(00213|213|0)', '');
  result jsonb;
begin
  if not public.is_salon_member() then perform public._fgg_error('FGG_FORBIDDEN'); end if;
  select timezone into tz from public.salon_settings where id;

  with filtered as (
    select a.*, c.full_name, c.phone, c.email
    from public.appointments a
    join public.customers c on c.id = a.customer_id
    where (p_status is null or a.status = any (p_status))
      and (p_from is null or (a.starts_at at time zone tz)::date >= p_from)
      and (p_to is null or (a.starts_at at time zone tz)::date <= p_to)
      and (q is null
           or c.full_name ilike '%' || q || '%'
           or (char_length(digits) >= 3 and c.phone like '%' || digits || '%')
           or a.reference ilike '%' || q || '%')
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'counts', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
               from (select a.status, count(*) n from public.appointments a group by a.status) x),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'reference', f.reference, 'status', f.status,
        'starts_at', f.starts_at, 'ends_at', f.ends_at,
        'total_price_dzd', f.total_price_dzd, 'total_duration_minutes', f.total_duration_minutes,
        'customer_name', f.full_name, 'customer_phone', f.phone,
        'hold_expires_at', f.hold_expires_at, 'created_at', f.created_at,
        'services', (select jsonb_agg(jsonb_build_object('name_fr', s.name_fr, 'name_ar', s.name_ar) order by s.position)
                     from public.appointment_services s where s.appointment_id = f.id)
      ) order by f.starts_at)
      from (select * from filtered order by starts_at limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0)) f
    ), '[]'::jsonb)
  ) into result;
  return result;
end $$;

-- ADMIN: full appointment detail with customer, services, history and notifications.
create function public.admin_get_appointment(p_appointment_id uuid)
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
      'price_dzd', s.price_dzd, 'duration_minutes', s.duration_minutes) order by s.position)
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

-- Signed-in user's own role (for the admin UI guard).
create function public.get_my_profile()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'full_name', p.full_name, 'role', p.role)
  from public.profiles p where p.id = auth.uid() and p.is_active
$$;

revoke execute on function public.get_public_catalog(), public.admin_list_appointments(public.appointment_status[], date, date, text, integer, integer),
  public.admin_get_appointment(uuid), public.get_my_profile() from public, anon, authenticated;
grant execute on function public.get_public_catalog() to anon, authenticated;
grant execute on function public.admin_list_appointments(public.appointment_status[], date, date, text, integer, integer) to authenticated;
grant execute on function public.admin_get_appointment(uuid) to authenticated;
grant execute on function public.get_my_profile() to authenticated;
