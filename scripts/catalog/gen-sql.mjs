// Generates the one-time data script that applies the price list to a database
// where migration 20261109000001_catalog_v2.sql has already been run.
//   node scripts/catalog/gen-sql.mjs > supabase/data/2026-11-09_catalogue.sql
import { SERVICES } from './data.mjs'

const q = (v) => (v === null ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const rows = SERVICES.map((x, i) =>
  `    (${q(x.category)}, ${q(x.name_fr)}, ${q(x.name_ar)}, ${x.price_dzd}, ${q(x.price_mode)}, ${x.duration_minutes}, ${i + 1}, ${q(`/prestations/${x.slug}.svg`)}, array[${x.match.map(q).join(', ')}], ${q(JSON.stringify(x.options))}::jsonb)`,
).join(',\n')

process.stdout.write(`-- FG GLOW — nouveaux prix (liste du salon du 09/11/2026), images et catégories.
-- À exécuter UNE fois dans le SQL Editor de Supabase, APRÈS la migration 20261109000001_catalog_v2.sql.
-- Les prestations existantes sont mises à jour sur place (mêmes identifiants, l'historique des
-- rendez-vous ne change pas), les nouvelles sont ajoutées, celles qui ne sont plus à la carte sont retirées.
-- Les durées sont des estimations : à vérifier dans /admin/prestations.
-- Le script peut être relancé sans créer de doublons.
do $$
declare
  r record;
  v_id uuid;
  o jsonb;
  n int;
  v_keep uuid[] := '{}';
begin
  for r in select * from (values
${rows}
  ) as t(category, name_fr, name_ar, price_dzd, price_mode, duration_minutes, sort_order, image_url, match, options)
  loop
    select id into v_id from public.services
      where archived_at is null and (name_fr = r.name_fr or name_fr = any (r.match))
      order by created_at, id limit 1;
    if v_id is null then
      insert into public.services (category, name_fr, name_ar, price_dzd, price_mode, duration_minutes, sort_order, image_url)
      values (r.category::public.service_category, r.name_fr, r.name_ar, r.price_dzd, r.price_mode, r.duration_minutes, r.sort_order, r.image_url)
      returning id into v_id;
    else
      update public.services set category = r.category::public.service_category, name_fr = r.name_fr, name_ar = r.name_ar,
        price_dzd = r.price_dzd, price_mode = r.price_mode, sort_order = r.sort_order, image_url = r.image_url,
        is_active = true, is_bookable_online = true
      where id = v_id;
    end if;
    v_keep := v_keep || v_id;

    -- Suppléments : ceux de la liste sont créés / mis à jour, les autres désactivés.
    update public.service_options set is_active = false
      where service_id = v_id and name_fr not in (select e ->> 'name_fr' from jsonb_array_elements(r.options) e);
    n := 0;
    for o in select * from jsonb_array_elements(r.options) loop
      update public.service_options set name_ar = o ->> 'name_ar', price_dzd = (o ->> 'price_dzd')::int,
        price_is_minimum = (o ->> 'price_is_minimum')::boolean, is_active = true, sort_order = n
      where service_id = v_id and name_fr = o ->> 'name_fr';
      if not found then
        insert into public.service_options (service_id, name_fr, name_ar, price_dzd, price_is_minimum, sort_order)
        values (v_id, o ->> 'name_fr', o ->> 'name_ar', (o ->> 'price_dzd')::int, (o ->> 'price_is_minimum')::boolean, n);
      end if;
      n := n + 1;
    end loop;
  end loop;

  -- Prestations qui ne figurent plus sur la liste : retirées (pas supprimées).
  update public.services set archived_at = now(), is_active = false
    where archived_at is null and id <> all (v_keep);
end $$;

-- Contrôle : doit afficher ${SERVICES.length} prestations.
select category, name_fr, price_dzd, price_mode, duration_minutes from public.services
where archived_at is null order by sort_order;
`)
