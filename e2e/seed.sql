-- LOCAL TESTING ONLY: fictitious fixtures for the end-to-end tests.
-- Never applied to a real project. Names/prices are obviously fake.
-- Test logins are in e2e/seed-accounts.sql (loaded first).

insert into public.services (id, category, name_fr, name_ar, description_fr, description_ar, price_dzd, duration_minutes, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'manicure', 'Service test A', 'خدمة تجريبية أ', 'Description de test A.', 'وصف تجريبي أ.', 1000, 60, 1),
  ('22222222-2222-2222-2222-222222222222', 'waxing', 'Service test B', 'خدمة تجريبية ب', 'Description de test B.', 'وصف تجريبي ب.', 2500, 30, 2),
  ('33333333-3333-3333-3333-333333333333', 'makeup', 'Service test C', 'خدمة تجريبية ج', null, null, 4000, 90, 3);

-- Open every day 09:00–18:00 except Friday (weekday 5), salon mode, capacity 1.
insert into public.working_hours (staff_id, weekday, opens_at, closes_at)
select null, d, '09:00', '18:00' from generate_series(0, 6) d where d <> 5;

update public.salon_settings set booking_enabled = true, slot_interval_minutes = 30, buffer_minutes = 0,
  salon_capacity = 1, min_notice_minutes = 60, max_advance_days = 60;
