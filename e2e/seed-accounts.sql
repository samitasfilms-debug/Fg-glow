-- LOCAL TESTING ONLY: two fictitious logins for the end-to-end tests.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'stranger@test.local');
insert into public.profiles (id, full_name, role) values ('00000000-0000-0000-0000-0000000000a1', 'Admin Test', 'super_admin');
