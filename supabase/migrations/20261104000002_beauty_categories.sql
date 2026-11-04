-- FG GLOW — service categories for the salon's real menu (lashes, brows,
-- nails, waxing). Enum values only; no business data.
alter type public.service_category add value if not exists 'lashes';
alter type public.service_category add value if not exists 'brows';
alter type public.service_category add value if not exists 'manicure';
alter type public.service_category add value if not exists 'pedicure';
alter type public.service_category add value if not exists 'waxing';
