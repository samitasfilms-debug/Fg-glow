-- ---------------------------------------------------------------------------
-- FJ GLOW — brand rename (FG GLOW → FJ GLOW)
-- New booking references start with "FJ-" instead of "FG-".
-- References already given to customers are kept as they are, so the check
-- constraint accepts both prefixes. Error codes (FGG_*) and internal function
-- names (_fgg_*) are technical identifiers, never shown to customers: unchanged.
-- ---------------------------------------------------------------------------

alter table public.appointments drop constraint if exists appointments_reference_check;
alter table public.appointments
  add constraint appointments_reference_check check (reference ~ '^F[GJ]-[0-9]{6}-[A-Z0-9]{4}$');

create or replace function public._fgg_new_reference(p_start timestamptz, p_tz text) returns text
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
    ref := 'FJ-' || to_char(p_start at time zone p_tz, 'YYMMDD') || '-' || suffix;
    exit when not exists (select 1 from public.appointments a where a.reference = ref);
  end loop;
  return ref;
end $$;
