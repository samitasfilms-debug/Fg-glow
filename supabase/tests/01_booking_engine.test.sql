-- Automated tests for the booking engine (run on a throwaway local database:
-- supabase/tests/run.sh). Test fixtures below are fictitious and never seeded
-- into a real project.
\set ON_ERROR_STOP 1
set client_min_messages = warning;

create or replace function pg_temp.expect_error(p_sql text, p_code text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'EXPECTED ERROR % BUT STATEMENT SUCCEEDED: %', p_code, p_sql;
exception when others then
  if sqlerrm not like '%' || p_code || '%' then
    raise exception 'EXPECTED % GOT %: %', p_code, sqlerrm, p_sql;
  end if;
end $$;

create or replace function pg_temp.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'FAILED: %', label; end if;
  raise notice 'ok - %', label;
end $$;
set client_min_messages = notice;

-- Fixtures -------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'stranger@test.local');
insert into public.profiles (id, full_name, role) values ('00000000-0000-0000-0000-0000000000a1', 'Test Admin', 'super_admin');

insert into public.services (id, category, name_fr, name_ar, price_dzd, duration_minutes) values
  ('11111111-1111-1111-1111-111111111111', 'coloring', 'Test A', 'اختبار أ', 2000, 60),
  ('22222222-2222-2222-2222-222222222222', 'care', 'Test B', 'اختبار ب', 1500, 30),
  ('33333333-3333-3333-3333-333333333333', 'other', 'Inactive', 'غير نشط', 100, 30);
update public.services set is_active = false where id = '33333333-3333-3333-3333-333333333333';
insert into public.working_hours (staff_id, weekday, opens_at, closes_at)
select null, d, '09:00', '18:00' from generate_series(0, 6) d;

create temp table t_ctx as
select ((now() at time zone 'Africa/Algiers')::date + 2) as d;
grant select on t_ctx to anon, authenticated;

-- 1. Disabled by default ----------------------------------------------------
set role anon;
select pg_temp.ok((select count(*) from public.get_available_slots((select d from t_ctx), array['11111111-1111-1111-1111-111111111111']::uuid[])) = 0,
  'booking disabled → no slots');
select pg_temp.expect_error($$select public.create_booking_request('{"full_name":"Amel","phone":"0555000001","service_ids":["11111111-1111-1111-1111-111111111111"],"starts_at":"2030-01-01T10:00:00+01:00"}')$$, 'FGG_BOOKING_DISABLED');
reset role;

update public.salon_settings set booking_enabled = true, buffer_minutes = 15, slot_interval_minutes = 30, min_notice_minutes = 60, salon_capacity = 1;

-- 2. Slots & durations ------------------------------------------------------
set role anon;
select pg_temp.ok((select count(*) from public.get_available_slots((select d from t_ctx), array['11111111-1111-1111-1111-111111111111']::uuid[])) = 17,
  '60 min service → 17 slots between 09:00 and 17:00');
select pg_temp.ok((select count(*) from public.get_available_slots((select d from t_ctx), array['11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222']::uuid[])) = 16,
  '60+30 min services → 16 slots (last start 16:30)');
select pg_temp.expect_error($$select * from public.get_available_slots(current_date + 2, array['33333333-3333-3333-3333-333333333333']::uuid[])$$, 'FGG_SERVICE_UNAVAILABLE');
select pg_temp.ok((select count(*) from public.get_available_slots((select d - 3 from t_ctx), array['11111111-1111-1111-1111-111111111111']::uuid[])) = 0, 'past date → no slots');
select pg_temp.ok((select count(*) from public.get_availability_calendar((select d from t_ctx), (select d + 6 from t_ctx), array['11111111-1111-1111-1111-111111111111']::uuid[]) where slot_count > 0) = 7, 'calendar: 7 open days');

-- 3. Validation -------------------------------------------------------------
select pg_temp.expect_error(format($$select public.create_booking_request('{"full_name":"A","phone":"0555000001","service_ids":["11111111-1111-1111-1111-111111111111"],"starts_at":"%s"}')$$, ((select d from t_ctx) + time '10:00') at time zone 'Africa/Algiers'), 'FGG_INVALID_NAME');
select pg_temp.expect_error(format($$select public.create_booking_request('{"full_name":"Amel B","phone":"12345","service_ids":["11111111-1111-1111-1111-111111111111"],"starts_at":"%s"}')$$, ((select d from t_ctx) + time '10:00') at time zone 'Africa/Algiers'), 'FGG_INVALID_PHONE');
select pg_temp.expect_error(format($$select public.create_booking_request('{"full_name":"Amel B","phone":"0555000001","email":"nope","service_ids":["11111111-1111-1111-1111-111111111111"],"starts_at":"%s"}')$$, ((select d from t_ctx) + time '10:00') at time zone 'Africa/Algiers'), 'FGG_INVALID_EMAIL');
select pg_temp.expect_error(format($$select public.create_booking_request('{"full_name":"Amel B","phone":"0555000001","service_ids":["33333333-3333-3333-3333-333333333333"],"starts_at":"%s"}')$$, ((select d from t_ctx) + time '10:00') at time zone 'Africa/Algiers'), 'FGG_SERVICE_UNAVAILABLE');
select pg_temp.expect_error(format($$select public.create_booking_request('{"full_name":"Amel B","phone":"0555000001","service_ids":["11111111-1111-1111-1111-111111111111"],"starts_at":"%s"}')$$, ((select d from t_ctx) + time '10:10') at time zone 'Africa/Algiers'), 'FGG_SLOT_UNAVAILABLE');
select pg_temp.expect_error(format($$select public.create_booking_request('{"full_name":"Amel B","phone":"0555000001","service_ids":["11111111-1111-1111-1111-111111111111"],"starts_at":"%s"}')$$, ((select d from t_ctx) + time '17:30') at time zone 'Africa/Algiers'), 'FGG_SLOT_UNAVAILABLE');

-- 4. Successful request ----------------------------------------------------
create temp table t_res (r jsonb);
reset role;
grant insert, select on t_res to anon;
set role anon;
insert into t_res select public.create_booking_request(jsonb_build_object(
  'full_name', 'Amel Test', 'phone', '0555 00 00 01', 'email', 'amel@test.local', 'notes', 'Test',
  'locale', 'ar', 'service_ids', jsonb_build_array('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
  'starts_at', ((select d from t_ctx) + time '10:00') at time zone 'Africa/Algiers'));
select pg_temp.ok((select r ->> 'reference' ~ '^FJ-[0-9]{6}-[A-Z0-9]{4}$' from t_res), 'reference generated');
select pg_temp.ok((select r ->> 'status' = 'pending' from t_res), 'status pending');
select pg_temp.ok((select (r ->> 'total_price_dzd')::int = 3500 and (r ->> 'total_duration_minutes')::int = 90 from t_res), 'totals from database (3500 DZD, 90 min)');

-- 5. Pending request holds the slot (+ buffer) -------------------------------
-- booked 10:00–11:30 (+15 buffer → 11:45). 60-min candidates 09:00..11:30 now overlap → 17 - 6 = 11
select pg_temp.ok((select count(*) from public.get_available_slots((select d from t_ctx), array['11111111-1111-1111-1111-111111111111']::uuid[])) = 11,
  'pending request + buffer removes overlapping slots');
select pg_temp.expect_error(format($$select public.create_booking_request('{"full_name":"Other Client","phone":"0661000002","service_ids":["22222222-2222-2222-2222-222222222222"],"starts_at":"%s"}')$$, ((select d from t_ctx) + time '10:30') at time zone 'Africa/Algiers'), 'FGG_SLOT_UNAVAILABLE');
select pg_temp.expect_error(format($$select public.create_booking_request('{"full_name":"Amel Test","phone":"0555000001","service_ids":["22222222-2222-2222-2222-222222222222"],"starts_at":"%s"}')$$, ((select d from t_ctx) + time '11:00') at time zone 'Africa/Algiers'), 'FGG_DUPLICATE_REQUEST');

-- 6. Public users cannot read or change private data --------------------------
select pg_temp.expect_error('select * from public.appointments', 'permission denied');
select pg_temp.expect_error('select * from public.customers', 'permission denied');
select pg_temp.expect_error('select * from public.notifications', 'permission denied');
select pg_temp.expect_error($$update public.services set price_dzd = 1$$, 'permission denied');
select pg_temp.expect_error($$select public.admin_update_appointment(gen_random_uuid(), 'confirm')$$, 'permission denied');
select pg_temp.expect_error($$insert into public.appointments (reference) values ('x')$$, 'permission denied');
select pg_temp.ok((select count(*) from public.services) = 2, 'anon sees only active services');
reset role;

-- 7. Snapshots are immutable history ----------------------------------------
update public.services set price_dzd = 9999 where id = '11111111-1111-1111-1111-111111111111';
select pg_temp.ok((select price_dzd from public.appointment_services where name_fr = 'Test A') = 2000, 'price snapshot unchanged after price update');
update public.services set price_dzd = 2000 where id = '11111111-1111-1111-1111-111111111111';

-- 8. Authenticated stranger (not staff) sees nothing and cannot act ------------
create temp table t_appt as select id from public.appointments limit 1;
grant select on t_appt to authenticated;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
select pg_temp.ok((select count(*) from public.appointments) = 0, 'non-member reads 0 appointments (RLS)');
select pg_temp.expect_error(format($$select public.admin_update_appointment('%s', 'confirm')$$, (select id from t_appt)), 'FGG_FORBIDDEN');
reset role;

-- 9. Hold expiry, competing request, confirmation recheck ----------------------
update public.appointments set hold_expires_at = now() - interval '1 minute';
set role anon;
select pg_temp.ok((select count(*) from public.get_available_slots((select d from t_ctx), array['11111111-1111-1111-1111-111111111111']::uuid[])) = 17, 'expired hold frees the slot automatically');
insert into t_res select public.create_booking_request(jsonb_build_object(
  'full_name', 'Second Client', 'phone', '0770000003', 'locale', 'fr',
  'service_ids', jsonb_build_array('11111111-1111-1111-1111-111111111111'),
  'starts_at', ((select d from t_ctx) + time '10:00') at time zone 'Africa/Algiers'));
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.ok((select count(*) from public.appointments) = 2, 'admin reads all appointments');
select pg_temp.ok((public.admin_update_appointment((select a.id from public.appointments a join public.customers c on c.id = a.customer_id where c.phone = '+213770000003'), 'confirm', 'ok') ->> 'status') = 'confirmed', 'admin confirms second request');
select pg_temp.expect_error(format($$select public.admin_update_appointment('%s', 'confirm')$$,
  (select a.id from public.appointments a join public.customers c on c.id = a.customer_id where c.phone = '+213555000001')), 'FGG_SLOT_UNAVAILABLE');
select pg_temp.ok(true, 'confirming an overlapping request is refused (capacity 1)');
-- Propose a new time instead
select pg_temp.ok((public.admin_update_appointment(
  (select a.id from public.appointments a join public.customers c on c.id = a.customer_id where c.phone = '+213555000001'),
  'propose', 'Plus tôt ?', ((select d from t_ctx) + time '14:00') at time zone 'Africa/Algiers') ->> 'status') = 'reschedule_requested', 'admin proposes another time');
select pg_temp.ok((select count(*) from public.appointment_events) = 4, 'history recorded (2 created + confirm + propose)');
select pg_temp.ok((select count(*) from public.notifications where audience = 'customer' and status = 'awaiting_provider') = 2, 'customer notifications logged as awaiting provider (no WhatsApp API)');
select pg_temp.ok((select count(*) from public.audit_logs) = 2, 'audit log written');
select pg_temp.expect_error(format($$select public.admin_update_appointment('%s', 'complete')$$,
  (select a.id from public.appointments a join public.customers c on c.id = a.customer_id where c.phone = '+213555000001')), 'FGG_INVALID_TRANSITION');
select pg_temp.ok((public.admin_update_appointment(
  (select a.id from public.appointments a join public.customers c on c.id = a.customer_id where c.phone = '+213555000001'), 'confirm') ->> 'status') = 'confirmed', 'proposed time confirmed');
reset role;

-- 10. Closures -----------------------------------------------------------------
insert into public.blocked_slots (staff_id, starts_at, ends_at, reason)
values (null, ((select d + 1 from t_ctx)::timestamp) at time zone 'Africa/Algiers', ((select d + 2 from t_ctx)::timestamp) at time zone 'Africa/Algiers', 'test closure');
set role anon;
select pg_temp.ok((select count(*) from public.get_available_slots((select d + 1 from t_ctx), array['22222222-2222-2222-2222-222222222222']::uuid[])) = 0, 'closed day → no slots');
reset role;

-- 11. Staff mode + exclusion constraint ----------------------------------------
insert into public.staff (id, display_name) values ('44444444-4444-4444-4444-444444444444', 'Test Pro');
insert into public.staff_services values ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111');
set role anon;
select pg_temp.ok((select count(*) from public.get_available_slots((select d + 3 from t_ctx), array['22222222-2222-2222-2222-222222222222']::uuid[])) = 0, 'staff mode: service with no qualified professional → no slots');
select pg_temp.ok((select count(*) from public.get_available_slots((select d + 3 from t_ctx), array['11111111-1111-1111-1111-111111111111']::uuid[], '44444444-4444-4444-4444-444444444444')) = 17, 'staff mode: professional slots');
reset role;
insert into public.appointments (reference, customer_id, staff_id, starts_at, ends_at, blocked_until, status, total_price_dzd, total_duration_minutes)
select 'FJ-000000-AAAA', id, '44444444-4444-4444-4444-444444444444', now() + interval '10 days', now() + interval '10 days 1 hour', now() + interval '10 days 1 hour', 'confirmed', 0, 60 from public.customers limit 1;
select pg_temp.expect_error($$insert into public.appointments (reference, customer_id, staff_id, starts_at, ends_at, blocked_until, status, total_price_dzd, total_duration_minutes)
  select 'FJ-000000-BBBB', id, '44444444-4444-4444-4444-444444444444', now() + interval '10 days 30 minutes', now() + interval '10 days 90 minutes', now() + interval '10 days 90 minutes', 'confirmed', 0, 60 from public.customers limit 1$$, 'appointments_no_staff_overlap');
select pg_temp.ok(true, 'exclusion constraint blocks overlapping confirmed appointments for one professional');

-- 12. Rate limit -----------------------------------------------------------------
delete from public.staff;
set role anon;
select public.create_booking_request(jsonb_build_object('full_name', 'Rate Test', 'phone', '0550000009',
  'service_ids', jsonb_build_array('22222222-2222-2222-2222-222222222222'), 'starts_at', ((select d + 4 from t_ctx) + time '09:00') at time zone 'Africa/Algiers')) is not null;
select public.create_booking_request(jsonb_build_object('full_name', 'Rate Test', 'phone', '0550000009',
  'service_ids', jsonb_build_array('22222222-2222-2222-2222-222222222222'), 'starts_at', ((select d + 4 from t_ctx) + time '11:00') at time zone 'Africa/Algiers')) is not null;
select public.create_booking_request(jsonb_build_object('full_name', 'Rate Test', 'phone', '0550000009',
  'service_ids', jsonb_build_array('22222222-2222-2222-2222-222222222222'), 'starts_at', ((select d + 4 from t_ctx) + time '13:00') at time zone 'Africa/Algiers')) is not null;
select pg_temp.expect_error(format($$select public.create_booking_request(jsonb_build_object('full_name', 'Rate Test', 'phone', '0550000009',
  'service_ids', jsonb_build_array('22222222-2222-2222-2222-222222222222'), 'starts_at', '%s'))$$, ((select d + 4 from t_ctx) + time '15:00') at time zone 'Africa/Algiers'), 'FGG_RATE_LIMITED');
select pg_temp.ok(true, '4th request from the same phone within 24h is rate-limited');
reset role;

-- 13. Read API ---------------------------------------------------------------------
set role anon;
select pg_temp.ok(jsonb_array_length(public.get_public_catalog() -> 'services') = 2, 'public catalogue lists active services only');
select pg_temp.expect_error('select public.admin_list_appointments()', 'permission denied');
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
select pg_temp.expect_error('select public.admin_list_appointments()', 'FGG_FORBIDDEN');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.ok((public.admin_list_appointments() ->> 'total')::int >= 5, 'admin lists appointments');
select pg_temp.ok((public.admin_list_appointments(array['confirmed']::public.appointment_status[]) -> 'items' -> 0 ->> 'status') = 'confirmed', 'status filter');
select pg_temp.ok((public.admin_list_appointments(null, null, null, '0555 00 00 01') -> 'items' -> 0 ->> 'customer_phone') = '+213555000001', 'search by phone');
select pg_temp.ok((public.admin_list_appointments(null, null, null, 'amel') -> 'items' -> 0 ->> 'customer_name') = 'Amel Test', 'search by name');
select pg_temp.ok(jsonb_array_length(public.admin_get_appointment((select a.id from public.appointments a join public.customers c on c.id = a.customer_id where c.phone = '+213555000001' and a.reference <> 'FJ-000000-AAAA')) -> 'events') = 3, 'detail includes history');
select pg_temp.ok((public.get_my_profile() ->> 'role') = 'super_admin', 'own profile');
reset role;

-- 14. Salon set-up from the admin -------------------------------------------------
set role anon;
select pg_temp.expect_error($$select public.admin_save_salon_hours('[]')$$, 'permission denied');
select pg_temp.expect_error($$insert into public.services (name_fr, name_ar, price_dzd, duration_minutes) values ('x', 'x', 1, 30)$$, 'permission denied');
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
select pg_temp.expect_error($$select public.admin_save_salon_hours('[]')$$, 'FGG_FORBIDDEN');
select pg_temp.expect_error($$select public.admin_set_booking_enabled(true)$$, 'FGG_FORBIDDEN');
select pg_temp.expect_error($$insert into public.services (name_fr, name_ar, price_dzd, duration_minutes) values ('x', 'x', 1, 30)$$, 'row-level security');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.expect_error($$select public.admin_save_salon_hours('[{"weekday":1,"opens_at":"12:00","closes_at":"10:00"}]')$$, 'FGG_INVALID_HOURS');
select pg_temp.expect_error($$select public.admin_save_salon_hours('[{"weekday":1,"opens_at":"09:00","closes_at":"13:00"},{"weekday":1,"opens_at":"12:00","closes_at":"18:00"}]')$$, 'FGG_INVALID_HOURS');
select pg_temp.ok((select count(*) from public.working_hours where staff_id is null) = 7, 'invalid hours are rolled back');
select pg_temp.ok(public.admin_save_salon_hours('[{"weekday":6,"opens_at":"09:00","closes_at":"12:30"},{"weekday":6,"opens_at":"14:00","closes_at":"18:00"},{"weekday":0,"opens_at":"10:00","closes_at":"17:00"}]') = 3, 'admin saves split opening hours');
select pg_temp.ok((select count(*) from public.working_hours where staff_id is null) = 3, 'salon hours replaced atomically');
select pg_temp.ok(public.admin_save_salon_hours('[]') = 0, 'clearing all hours');
select pg_temp.ok(not (select booking_enabled from public.salon_settings), 'no hours → booking closed automatically');
select pg_temp.expect_error($$select public.admin_set_booking_enabled(true)$$, 'FGG_SETUP_NO_HOURS');
select public.admin_save_salon_hours('[{"weekday":1,"opens_at":"09:00","closes_at":"18:00"}]');
update public.services set is_active = false;
select pg_temp.expect_error($$select public.admin_set_booking_enabled(true)$$, 'FGG_SETUP_NO_SERVICES');
insert into public.services (name_fr, name_ar, price_dzd, duration_minutes) values ('Admin created', 'أنشأتها الإدارة', 1234, 45);
select pg_temp.ok(public.admin_set_booking_enabled(true), 'booking opens once services + hours exist');
select pg_temp.ok((select booking_enabled from public.salon_settings), 'booking_enabled stored');
reset role;
-- restore fixtures for the following tests / concurrency script
update public.services set is_active = true where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
delete from public.working_hours where staff_id is null;
insert into public.working_hours (staff_id, weekday, opens_at, closes_at) select null, d, '09:00', '18:00' from generate_series(0, 6) d;

-- 15. Supplements (service options) ----------------------------------------------
insert into public.service_options (id, service_id, name_fr, name_ar, price_dzd) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Option A1', 'خيار أ1', 500),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Option A2 inactive', 'خيار أ2', 700),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Option B1', 'خيار ب1', 300);
update public.service_options set is_active = false where id = 'aaaaaaaa-0000-0000-0000-000000000002';
set role anon;
select pg_temp.ok((select jsonb_array_length(s -> 'options') from jsonb_array_elements(public.get_public_catalog() -> 'services') s where s ->> 'id' = '11111111-1111-1111-1111-111111111111') = 1,
  'catalogue lists only active options under their service');
select pg_temp.expect_error(format($$select public.create_booking_request(jsonb_build_object('full_name', 'Opt Test', 'phone', '0550000031',
  'service_ids', jsonb_build_array('11111111-1111-1111-1111-111111111111'), 'option_ids', jsonb_build_array('bbbbbbbb-0000-0000-0000-000000000001'),
  'starts_at', '%s'))$$, ((select d + 6 from t_ctx) + time '09:00') at time zone 'Africa/Algiers'), 'FGG_INVALID_OPTIONS');
select pg_temp.ok(true, 'option of a service not chosen is refused');
select pg_temp.expect_error(format($$select public.create_booking_request(jsonb_build_object('full_name', 'Opt Test', 'phone', '0550000032',
  'service_ids', jsonb_build_array('11111111-1111-1111-1111-111111111111'), 'option_ids', jsonb_build_array('aaaaaaaa-0000-0000-0000-000000000002'),
  'starts_at', '%s'))$$, ((select d + 6 from t_ctx) + time '09:00') at time zone 'Africa/Algiers'), 'FGG_INVALID_OPTIONS');
select pg_temp.ok(true, 'inactive option is refused');
create temp table t_opt as select public.create_booking_request(jsonb_build_object('full_name', 'Opt Test', 'phone', '0550000033',
  'service_ids', jsonb_build_array('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
  'option_ids', jsonb_build_array('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001'),
  'starts_at', ((select d + 6 from t_ctx) + time '10:00') at time zone 'Africa/Algiers')) r;
reset role;
grant select on t_opt to anon, authenticated;
set role anon;
select pg_temp.ok(((select r from t_opt) ->> 'total_price_dzd')::int = 2000 + 1500 + 500 + 300, 'total includes supplements (server-side prices)');
select pg_temp.ok(((select r from t_opt) ->> 'total_duration_minutes')::int = 90, 'supplements add no duration');
reset role;
select pg_temp.ok((select s.options -> 0 ->> 'name_fr' from public.appointment_services s join public.appointments a on a.id = s.appointment_id
  where a.reference = (select r ->> 'reference' from t_opt) and s.service_id = '11111111-1111-1111-1111-111111111111') = 'Option A1', 'supplement snapshot stored on the booked service');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.ok((public.admin_get_appointment((select a.id from public.appointments a where a.reference = (select r ->> 'reference' from t_opt))) -> 'services' -> 1 -> 'options' -> 0 ->> 'price_dzd')::int = 300, 'admin detail shows supplements');
reset role;

-- 16. Price modes ("à partir de" / "sur devis") -----------------------------------
update public.services set price_mode = 'from' where id = '11111111-1111-1111-1111-111111111111';
update public.services set price_mode = 'quote', price_dzd = 0 where id = '22222222-2222-2222-2222-222222222222';
set role anon;
select pg_temp.ok((select s ->> 'price_mode' from jsonb_array_elements(public.get_public_catalog() -> 'services') s where s ->> 'id' = '22222222-2222-2222-2222-222222222222') = 'quote',
  'catalogue exposes the price mode');
create temp table t_mode as select public.create_booking_request(jsonb_build_object('full_name', 'Mode Test', 'phone', '0550000041',
  'service_ids', jsonb_build_array('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
  'starts_at', ((select d + 7 from t_ctx) + time '10:00') at time zone 'Africa/Algiers')) r;
reset role;
grant select on t_mode to anon, authenticated;
select pg_temp.ok(((select r from t_mode) ->> 'total_price_dzd')::int = 2000, 'quote service adds nothing to the total');
select pg_temp.ok((select string_agg(s.price_mode, ',' order by s.position) from public.appointment_services s join public.appointments a on a.id = s.appointment_id
  where a.reference = (select r ->> 'reference' from t_mode)) = 'from,quote', 'price mode snapshotted on the booked services');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.ok((public.admin_get_appointment((select a.id from public.appointments a where a.reference = (select r ->> 'reference' from t_mode))) -> 'services' -> 1 ->> 'price_mode') = 'quote', 'admin detail shows the price mode');
reset role;
select pg_temp.expect_error($$update public.services set price_mode = 'free' where id = '11111111-1111-1111-1111-111111111111'$$, 'check');
select pg_temp.ok(true, 'unknown price mode refused');
update public.services set price_mode = 'fixed' where id = '11111111-1111-1111-1111-111111111111';
update public.services set price_mode = 'fixed', price_dzd = 2500 where id = '22222222-2222-2222-2222-222222222222';

\echo ALL BOOKING ENGINE TESTS PASSED
