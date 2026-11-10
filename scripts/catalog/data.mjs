// FG GLOW — salon price list of 9 Nov 2026 (provided by the salon).
// Prices are the salon's. Durations are estimates to be checked by the salon
// (editable in /admin/prestations). price_mode: fixed | from ("à partir de") | quote ("sur devis").
// `match` lists the current production names of a service, so it is updated in place.

export const ART_OPTIONS = [
  { name_fr: 'French', name_ar: 'فرنش', price_dzd: 500, price_is_minimum: false },
  { name_fr: 'Baby Boomer', name_ar: 'بيبي بومر', price_dzd: 500, price_is_minimum: false },
  { name_fr: 'Cat Eyes', name_ar: 'كات آيز', price_dzd: 500, price_is_minimum: false },
  { name_fr: 'Déco', name_ar: 'زينة', price_dzd: 100, price_is_minimum: true },
]

const s = (category, slug, name_fr, name_ar, price_dzd, duration_minutes, extra = {}) => ({
  category, slug, name_fr, name_ar, price_dzd, duration_minutes, price_mode: 'fixed', options: [], match: [name_fr], ...extra,
})

export const SERVICES = [
  // MANUCURE (+ ART en suppléments)
  s('manicure', 'manucure-pose-capsules', 'Pose capsules', 'تركيب أظافر بالكبسولات', 3500, 120, { options: ART_OPTIONS }),
  s('manicure', 'manucure-remplissage', 'Remplissage ongles', 'تعبئة الأظافر', 3000, 90, { options: ART_OPTIONS }),
  s('manicure', 'manucure-gel', 'Gel sur ongles naturels (mains)', 'جل على الأظافر الطبيعية (اليدين)', 3000, 90, { options: ART_OPTIONS }),
  s('manicure', 'manucure-semi-permanent', 'Vernis semi-permanent (mains)', 'طلاء شبه دائم (اليدين)', 2000, 60, { options: ART_OPTIONS }),
  s('manicure', 'manucure-depose', 'Dépose (mains)', 'إزالة (اليدين)', 1500, 30),
  // PÉDICURE
  s('pedicure', 'pedicure-semi-permanent', 'Vernis semi-permanent (pieds)', 'طلاء شبه دائم (القدمين)', 2000, 60),
  s('pedicure', 'pedicure-gel', 'Gel sur ongles naturels (pieds)', 'جل على الأظافر الطبيعية (القدمين)', 3000, 75),
  s('pedicure', 'pedicure-depose', 'Dépose (pieds)', 'إزالة (القدمين)', 1000, 30),
  // EXTENSIONS DE CILS
  s('lashes', 'cils-pose-naturelle', 'Pose naturelle', 'تمديد رموش طبيعي', 4000, 120),
  s('lashes', 'cils-pose-mixte', 'Pose mixte', 'تمديد رموش مختلط', 5000, 150),
  s('lashes', 'cils-oeil-de-biche', 'Œil de biche', 'رموش عين الغزال', 5000, 150),
  s('lashes', 'cils-volume-russe', 'Volume russe', 'رموش فوليوم روسي', 6000, 180),
  s('lashes', 'cils-remplissage', 'Remplissage cils', 'تعبئة الرموش', 3000, 90),
  s('lashes', 'cils-depose', 'Dépose cils', 'إزالة تمديد الرموش', 1500, 30),
  // REHAUSSEMENT CILS & SOURCILS
  s('brows', 'rehaussement-cils', 'Rehaussement de cils', 'رفع الرموش', 2500, 60),
  s('brows', 'rehaussement-cils-coloration', 'Rehaussement de cils avec coloration', 'رفع الرموش مع الصبغ', 3000, 75),
  s('brows', 'brow-lift', 'Brow lift', 'رفع الحواجب', 2500, 45),
  s('brows', 'brow-lift-epilation-coloration', 'Brow lift (épilation + coloration)', 'رفع الحواجب (نتف + صبغ)', 3000, 60),
  // ÉPILATION
  s('waxing', 'epilation-visage', 'Épilation visage', 'إزالة شعر الوجه', 1000, 20),
  s('waxing', 'epilation-sourcils', 'Épilation sourcils', 'إزالة شعر الحواجب', 500, 15),
  s('waxing', 'epilation-moustache', 'Épilation moustache', 'إزالة شعر الشارب', 500, 10),
  s('waxing', 'epilation-aisselles', 'Épilation aisselles', 'إزالة شعر الإبطين', 700, 15),
  s('waxing', 'epilation-demi-bras', 'Épilation demi-bras', 'إزالة شعر نصف الذراعين', 800, 20),
  s('waxing', 'epilation-bras-complets', 'Épilation bras complets', 'إزالة شعر الذراعين كاملين', 1200, 30),
  s('waxing', 'epilation-demi-jambes', 'Épilation demi-jambes', 'إزالة شعر نصف الساقين', 1000, 30),
  s('waxing', 'epilation-jambes-completes', 'Épilation jambes complètes', 'إزالة شعر الساقين كاملين', 1700, 45),
  s('waxing', 'epilation-dos', 'Épilation dos', 'إزالة شعر الظهر', 1500, 30),
  // MAQUILLAGE
  s('makeup', 'maquillage-simple', 'Maquillage simple', 'مكياج بسيط', 4000, 60),
  s('makeup', 'maquillage-charge', 'Maquillage chargé', 'مكياج مكثف', 6000, 90),
  s('makeup', 'maquillage-mariee', 'Maquillage mariée', 'مكياج العروس', 15000, 150),
  // COIFFURE
  s('hairstyling', 'coiffure-brushing', 'Brushing', 'براشينغ', 1000, 45, { price_mode: 'from' }),
  s('hairstyling', 'coiffure-wavy', 'Wavy', 'تمويج (ويفي)', 2000, 60, { price_mode: 'from' }),
  s('hairstyling', 'coiffure-invitee', 'Coiffure invitée', 'تسريحة مدعوة', 0, 60, { price_mode: 'quote' }),
  s('hairstyling', 'coiffure-mariee', 'Coiffure mariée', 'تسريحة العروس', 0, 120, { price_mode: 'quote' }),
  // SOINS CAPILLAIRES
  s('care', 'soin-cheveux-courts', 'Soin capillaire — cheveux courts', 'علاج الشعر — شعر قصير', 10000, 120),
  s('care', 'soin-cheveux-longs', 'Soin capillaire — cheveux longs', 'علاج الشعر — شعر طويل', 15000, 150),
  s('care', 'soin-cheveux-extra-longs', 'Soin capillaire — cheveux extra longs', 'علاج الشعر — شعر طويل جداً', 17000, 180),
]
