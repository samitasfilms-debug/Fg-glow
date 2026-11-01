#!/usr/bin/env bash
# Fires N simultaneous public requests for the SAME slot; exactly one must succeed.
set -euo pipefail
DB=${TEST_DB:-fgg_test}
psql -q -d "$DB" -c "delete from public.booking_attempts; update public.salon_settings set booking_enabled = true;" >/dev/null
START=$(psql -tAq -d "$DB" -c "select (((now() at time zone 'Africa/Algiers')::date + 20) + time '15:00') at time zone 'Africa/Algiers'")
for i in $(seq 1 8); do
  psql -tAq -d "$DB" -c "set role anon; select public.create_booking_request(jsonb_build_object('full_name','Concurrent $i','phone','05500100$((10+i))','service_ids',jsonb_build_array('22222222-2222-2222-2222-222222222222'),'starts_at','$START')) ->> 'reference';" > /tmp/conc_$i.out 2>&1 &
done
wait
OK=$(grep -lE '^FG-' /tmp/conc_*.out | wc -l)
REFUSED=$(grep -l 'FGG_SLOT_UNAVAILABLE' /tmp/conc_*.out | wc -l)
echo "succeeded=$OK refused=$REFUSED"
[ "$OK" -eq 1 ] && [ "$REFUSED" -eq 7 ] && echo "CONCURRENCY TEST PASSED" || { cat /tmp/conc_*.out; exit 1; }
