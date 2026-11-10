-- =============================================================================
-- FJ GLOW — catalogue v2 (November 2026 price list)
-- * New categories: make-up and hair styling.
-- * services.price_mode: 'fixed' (default), 'from' ("à partir de": the amount
--   is a minimum, final price set at the salon) or 'quote' ("sur devis":
--   price_dzd is 0 and the price is agreed at the salon).
-- * The mode is snapshotted on appointment_services so history stays exact.
-- * The public catalogue lists categories in the salon's menu order.
-- No business data is inserted here.
-- =============================================================================

alter type public.service_category add value if not exists 'makeup';
alter type public.service_category add value if not exists 'hairstyling';

alter table public.services add column price_mode text not null default 'fixed'
  check (price_mode in ('fixed', 'from', 'quote'));
alter table public.appointment_services add column price_mode text not null default 'fixed'
  check (price_mode in ('fixed', 'from', 'quote'));

-- Snapshot the price mode of the booked service (create_booking_request inserts
-- name/price/duration; this keeps the mode alongside without rewriting it).
create function public._fgg_snapshot_price_mode() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.service_id is not null then
    select s.price_mode into new.price_mode from public.services s where s.id = new.service_id;
  end if;
  new.price_mode := coalesce(new.price_mode, 'fixed');
  return new;
end $$;
revoke all on function public._fgg_snapshot_price_mode() from public;

create trigger appointment_services_price_mode before insert on public.appointment_services
  for each row execute function public._fgg_snapshot_price_mode();

create or replace function public.get_public_catalog()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'category', s.category,
        'name_fr', s.name_fr, 'name_ar', s.name_ar,
        'description_fr', s.description_fr, 'description_ar', s.description_ar,
        'image_url', s.image_url, 'price_dzd', s.price_dzd, 'price_mode', s.price_mode, 'duration_minutes', s.duration_minutes,
        'options', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'name_fr', o.name_fr, 'name_ar', o.name_ar,
          'price_dzd', o.price_dzd, 'price_is_minimum', o.price_is_minimum) order by o.sort_order, o.name_fr)
          from public.service_options o where o.service_id = s.id and o.is_active), '[]'::jsonb)
      ) order by array_position(array['manicure', 'pedicure', 'lashes', 'brows', 'waxing', 'makeup', 'hairstyling', 'care'], s.category::text), s.sort_order, s.name_fr)
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
      'price_dzd', s.price_dzd, 'price_mode', s.price_mode, 'duration_minutes', s.duration_minutes, 'options', s.options) order by s.position)
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
