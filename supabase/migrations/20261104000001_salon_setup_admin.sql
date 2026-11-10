-- =============================================================================
-- FJ GLOW — salon set-up from the admin dashboard
-- Services, closures and settings are edited with plain table writes (RLS
-- already restricts them to salon admins). Two operations need to be atomic or
-- guarded, so they go through SECURITY DEFINER functions:
--   * admin_save_salon_hours: replaces the weekly salon opening hours in one go
--   * admin_set_booking_enabled: refuses to open booking without services + hours
-- No business data is inserted here.
-- =============================================================================

create function public.admin_save_salon_hours(p_hours jsonb)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  n integer := 0;
begin
  if not public.is_salon_admin() then perform public._fgg_error('FGG_FORBIDDEN'); end if;
  if p_hours is null or jsonb_typeof(p_hours) <> 'array' then perform public._fgg_error('FGG_INVALID_REQUEST'); end if;

  perform public._fgg_lock_schedule();
  delete from public.working_hours where staff_id is null;

  for r in select * from jsonb_array_elements(p_hours) loop
    if (r->>'weekday')::smallint not between 0 and 6
       or (r->>'closes_at')::time <= (r->>'opens_at')::time then
      perform public._fgg_error('FGG_INVALID_HOURS');
    end if;
    insert into public.working_hours (staff_id, weekday, opens_at, closes_at)
    values (null, (r->>'weekday')::smallint, (r->>'opens_at')::time, (r->>'closes_at')::time);
    n := n + 1;
  end loop;

  -- Overlapping ranges on the same day are a typing mistake: refuse them.
  if exists (
    select 1 from public.working_hours a join public.working_hours b
      on a.staff_id is null and b.staff_id is null and a.weekday = b.weekday and a.id < b.id
     and a.opens_at < b.closes_at and b.opens_at < a.closes_at
  ) then
    perform public._fgg_error('FGG_INVALID_HOURS');
  end if;

  -- Without hours the site cannot offer any slot: close online booking.
  if n = 0 then update public.salon_settings set booking_enabled = false where id; end if;

  insert into public.audit_logs (actor_id, action, entity, details)
  values (auth.uid(), 'salon_hours_saved', 'working_hours', jsonb_build_object('ranges', n));
  return n;
end $$;

create function public.admin_set_booking_enabled(p_enabled boolean)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_salon_admin() then perform public._fgg_error('FGG_FORBIDDEN'); end if;
  if p_enabled then
    if not exists (select 1 from public.services v where v.is_active and v.is_bookable_online and v.archived_at is null) then
      perform public._fgg_error('FGG_SETUP_NO_SERVICES');
    end if;
    if not exists (select 1 from public.working_hours w where w.staff_id is null) then
      perform public._fgg_error('FGG_SETUP_NO_HOURS');
    end if;
  end if;
  update public.salon_settings set booking_enabled = p_enabled where id;
  insert into public.audit_logs (actor_id, action, entity, details)
  values (auth.uid(), case when p_enabled then 'booking_opened' else 'booking_closed' end, 'salon_settings', '{}'::jsonb);
  return p_enabled;
end $$;

revoke all on function public.admin_save_salon_hours(jsonb) from public, anon;
revoke all on function public.admin_set_booking_enabled(boolean) from public, anon;
grant execute on function public.admin_save_salon_hours(jsonb) to authenticated;
grant execute on function public.admin_set_booking_enabled(boolean) to authenticated;
