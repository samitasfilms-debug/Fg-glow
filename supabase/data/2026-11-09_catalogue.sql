-- FJ GLOW — nouveaux prix (liste du salon du 09/11/2026), images et catégories.
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
    ('manicure', 'Pose capsules', 'تركيب أظافر بالكبسولات', 3500, 'fixed', 120, 1, '/prestations/manucure-pose-capsules.svg', array['Pose capsules'], '[{"name_fr":"French","name_ar":"فرنش","price_dzd":500,"price_is_minimum":false},{"name_fr":"Baby Boomer","name_ar":"بيبي بومر","price_dzd":500,"price_is_minimum":false},{"name_fr":"Cat Eyes","name_ar":"كات آيز","price_dzd":500,"price_is_minimum":false},{"name_fr":"Déco","name_ar":"زينة","price_dzd":100,"price_is_minimum":true}]'::jsonb),
    ('manicure', 'Remplissage ongles', 'تعبئة الأظافر', 3000, 'fixed', 90, 2, '/prestations/manucure-remplissage.svg', array['Remplissage ongles'], '[{"name_fr":"French","name_ar":"فرنش","price_dzd":500,"price_is_minimum":false},{"name_fr":"Baby Boomer","name_ar":"بيبي بومر","price_dzd":500,"price_is_minimum":false},{"name_fr":"Cat Eyes","name_ar":"كات آيز","price_dzd":500,"price_is_minimum":false},{"name_fr":"Déco","name_ar":"زينة","price_dzd":100,"price_is_minimum":true}]'::jsonb),
    ('manicure', 'Gel sur ongles naturels (mains)', 'جل على الأظافر الطبيعية (اليدين)', 3000, 'fixed', 90, 3, '/prestations/manucure-gel.svg', array['Gel sur ongles naturels (mains)'], '[{"name_fr":"French","name_ar":"فرنش","price_dzd":500,"price_is_minimum":false},{"name_fr":"Baby Boomer","name_ar":"بيبي بومر","price_dzd":500,"price_is_minimum":false},{"name_fr":"Cat Eyes","name_ar":"كات آيز","price_dzd":500,"price_is_minimum":false},{"name_fr":"Déco","name_ar":"زينة","price_dzd":100,"price_is_minimum":true}]'::jsonb),
    ('manicure', 'Vernis semi-permanent (mains)', 'طلاء شبه دائم (اليدين)', 2000, 'fixed', 60, 4, '/prestations/manucure-semi-permanent.svg', array['Vernis semi-permanent (mains)'], '[{"name_fr":"French","name_ar":"فرنش","price_dzd":500,"price_is_minimum":false},{"name_fr":"Baby Boomer","name_ar":"بيبي بومر","price_dzd":500,"price_is_minimum":false},{"name_fr":"Cat Eyes","name_ar":"كات آيز","price_dzd":500,"price_is_minimum":false},{"name_fr":"Déco","name_ar":"زينة","price_dzd":100,"price_is_minimum":true}]'::jsonb),
    ('manicure', 'Dépose (mains)', 'إزالة (اليدين)', 1500, 'fixed', 30, 5, '/prestations/manucure-depose.svg', array['Dépose (mains)'], '[]'::jsonb),
    ('pedicure', 'Vernis semi-permanent (pieds)', 'طلاء شبه دائم (القدمين)', 2000, 'fixed', 60, 6, '/prestations/pedicure-semi-permanent.svg', array['Vernis semi-permanent (pieds)'], '[]'::jsonb),
    ('pedicure', 'Gel sur ongles naturels (pieds)', 'جل على الأظافر الطبيعية (القدمين)', 3000, 'fixed', 75, 7, '/prestations/pedicure-gel.svg', array['Gel sur ongles naturels (pieds)'], '[]'::jsonb),
    ('pedicure', 'Dépose (pieds)', 'إزالة (القدمين)', 1000, 'fixed', 30, 8, '/prestations/pedicure-depose.svg', array['Dépose (pieds)'], '[]'::jsonb),
    ('lashes', 'Pose naturelle', 'تمديد رموش طبيعي', 4000, 'fixed', 120, 9, '/prestations/cils-pose-naturelle.svg', array['Pose naturelle'], '[]'::jsonb),
    ('lashes', 'Pose mixte', 'تمديد رموش مختلط', 5000, 'fixed', 150, 10, '/prestations/cils-pose-mixte.svg', array['Pose mixte'], '[]'::jsonb),
    ('lashes', 'Œil de biche', 'رموش عين الغزال', 5000, 'fixed', 150, 11, '/prestations/cils-oeil-de-biche.svg', array['Œil de biche'], '[]'::jsonb),
    ('lashes', 'Volume russe', 'رموش فوليوم روسي', 6000, 'fixed', 180, 12, '/prestations/cils-volume-russe.svg', array['Volume russe'], '[]'::jsonb),
    ('lashes', 'Remplissage cils', 'تعبئة الرموش', 3000, 'fixed', 90, 13, '/prestations/cils-remplissage.svg', array['Remplissage cils'], '[]'::jsonb),
    ('lashes', 'Dépose cils', 'إزالة تمديد الرموش', 1500, 'fixed', 30, 14, '/prestations/cils-depose.svg', array['Dépose cils'], '[]'::jsonb),
    ('brows', 'Rehaussement de cils', 'رفع الرموش', 2500, 'fixed', 60, 15, '/prestations/rehaussement-cils.svg', array['Rehaussement de cils'], '[]'::jsonb),
    ('brows', 'Rehaussement de cils avec coloration', 'رفع الرموش مع الصبغ', 3000, 'fixed', 75, 16, '/prestations/rehaussement-cils-coloration.svg', array['Rehaussement de cils avec coloration'], '[]'::jsonb),
    ('brows', 'Brow lift', 'رفع الحواجب', 2500, 'fixed', 45, 17, '/prestations/brow-lift.svg', array['Brow lift'], '[]'::jsonb),
    ('brows', 'Brow lift (épilation + coloration)', 'رفع الحواجب (نتف + صبغ)', 3000, 'fixed', 60, 18, '/prestations/brow-lift-epilation-coloration.svg', array['Brow lift (épilation + coloration)'], '[]'::jsonb),
    ('waxing', 'Épilation visage', 'إزالة شعر الوجه', 1000, 'fixed', 20, 19, '/prestations/epilation-visage.svg', array['Épilation visage'], '[]'::jsonb),
    ('waxing', 'Épilation sourcils', 'إزالة شعر الحواجب', 500, 'fixed', 15, 20, '/prestations/epilation-sourcils.svg', array['Épilation sourcils'], '[]'::jsonb),
    ('waxing', 'Épilation moustache', 'إزالة شعر الشارب', 500, 'fixed', 10, 21, '/prestations/epilation-moustache.svg', array['Épilation moustache'], '[]'::jsonb),
    ('waxing', 'Épilation aisselles', 'إزالة شعر الإبطين', 700, 'fixed', 15, 22, '/prestations/epilation-aisselles.svg', array['Épilation aisselles'], '[]'::jsonb),
    ('waxing', 'Épilation demi-bras', 'إزالة شعر نصف الذراعين', 800, 'fixed', 20, 23, '/prestations/epilation-demi-bras.svg', array['Épilation demi-bras'], '[]'::jsonb),
    ('waxing', 'Épilation bras complets', 'إزالة شعر الذراعين كاملين', 1200, 'fixed', 30, 24, '/prestations/epilation-bras-complets.svg', array['Épilation bras complets'], '[]'::jsonb),
    ('waxing', 'Épilation demi-jambes', 'إزالة شعر نصف الساقين', 1000, 'fixed', 30, 25, '/prestations/epilation-demi-jambes.svg', array['Épilation demi-jambes'], '[]'::jsonb),
    ('waxing', 'Épilation jambes complètes', 'إزالة شعر الساقين كاملين', 1700, 'fixed', 45, 26, '/prestations/epilation-jambes-completes.svg', array['Épilation jambes complètes'], '[]'::jsonb),
    ('waxing', 'Épilation dos', 'إزالة شعر الظهر', 1500, 'fixed', 30, 27, '/prestations/epilation-dos.svg', array['Épilation dos'], '[]'::jsonb),
    ('makeup', 'Maquillage simple', 'مكياج بسيط', 4000, 'fixed', 60, 28, '/prestations/maquillage-simple.svg', array['Maquillage simple'], '[]'::jsonb),
    ('makeup', 'Maquillage chargé', 'مكياج مكثف', 6000, 'fixed', 90, 29, '/prestations/maquillage-charge.svg', array['Maquillage chargé'], '[]'::jsonb),
    ('makeup', 'Maquillage mariée', 'مكياج العروس', 15000, 'fixed', 150, 30, '/prestations/maquillage-mariee.svg', array['Maquillage mariée'], '[]'::jsonb),
    ('hairstyling', 'Brushing', 'براشينغ', 1000, 'from', 45, 31, '/prestations/coiffure-brushing.svg', array['Brushing'], '[]'::jsonb),
    ('hairstyling', 'Wavy', 'تمويج (ويفي)', 2000, 'from', 60, 32, '/prestations/coiffure-wavy.svg', array['Wavy'], '[]'::jsonb),
    ('hairstyling', 'Coiffure invitée', 'تسريحة مدعوة', 0, 'quote', 60, 33, '/prestations/coiffure-invitee.svg', array['Coiffure invitée'], '[]'::jsonb),
    ('hairstyling', 'Coiffure mariée', 'تسريحة العروس', 0, 'quote', 120, 34, '/prestations/coiffure-mariee.svg', array['Coiffure mariée'], '[]'::jsonb),
    ('care', 'Soin capillaire — cheveux courts', 'علاج الشعر — شعر قصير', 10000, 'fixed', 120, 35, '/prestations/soin-cheveux-courts.svg', array['Soin capillaire — cheveux courts'], '[]'::jsonb),
    ('care', 'Soin capillaire — cheveux longs', 'علاج الشعر — شعر طويل', 15000, 'fixed', 150, 36, '/prestations/soin-cheveux-longs.svg', array['Soin capillaire — cheveux longs'], '[]'::jsonb),
    ('care', 'Soin capillaire — cheveux extra longs', 'علاج الشعر — شعر طويل جداً', 17000, 'fixed', 180, 37, '/prestations/soin-cheveux-extra-longs.svg', array['Soin capillaire — cheveux extra longs'], '[]'::jsonb)
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

-- Contrôle : doit afficher 37 prestations.
select category, name_fr, price_dzd, price_mode, duration_minutes from public.services
where archived_at is null order by sort_order;
