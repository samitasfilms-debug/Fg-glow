# FJ GLOW — Premium women's hair salon platform

React + Vite + TypeScript + Tailwind CSS v4 + Framer Motion, bilingual French / Arabic (RTL).
Backend (Phase 05): Supabase (PostgreSQL, Auth, Storage, Edge Functions). Hosting: Vercel.

## Status
- Phase 01 (foundation) ✅
- Booking system ✅ code + automated tests — see **docs/BOOKING.md** (setup, security, admin, WhatsApp, tests).
  Online booking stays **closed** (`salon_settings.booking_enabled = false`) until the salon has entered its
  real services, prices and opening hours.

### Phase 01 (foundation)
Architecture, design tokens, typography, i18n FR/AR with RTL, shared UI components,
responsive layout (header, mobile menu, footer), homepage skeleton with motion.

No business data has been invented. Unknown values (address, phone, WhatsApp, hours,
prices, team, reviews, photos) are `null` in `src/config/site.ts` and render as
clearly marked placeholders ("À renseigner" / "سيتم التحديد", "Visuel à venir").

## Run locally
```bash
npm install
cp .env.example .env.local   # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (public publishable key)
npm run dev                  # http://localhost:5173  → redirects to /fr or /ar
npm run build                # typecheck (tsc -b) + production build
npm run preview              # serve the production build
npm run lint                 # oxlint
```
Dev-only component reference: `/fr/design-system` (not included in production builds).

## Structure
```
src/
  app/            App, router, locale route guard, page loader
  config/         site.ts (brand + placeholders), services.ts (categories), env.ts
  i18n/           config, init, LocaleProvider, paths, locales/fr.ts + ar.ts (typed parity)
  styles/         index.css — Tailwind v4 @theme design tokens
  lib/            cn, motion presets, formatting (DZD, durations), zod schemas, supabase client
  hooks/          useLocalePath, useScrolled, useLockBodyScroll
  components/
    brand/        Wordmark (temporary logo), social icons
    ui/           Button, ButtonLink, Container, Section, SectionHeading, Card, Badge,
                  Field/Input/Textarea/Select, ImageFrame/ArtPlaceholder, EmptyState,
                  PlaceholderValue, Spinner/Skeleton, Ornament, LanguageSwitcher
    motion/       Reveal, RevealText, Parallax
    layout/       PublicLayout, Header, MobileMenu, Footer, ContactDetails, Seo
  features/home/  homepage sections
  pages/          HomePage, PageShell (interim pages), NotFoundPage, DesignSystemPage (dev)
```

## Design tokens (src/styles/index.css)
Palette: blush `#E8C6CF`, ivory `#FFF9F5`, rose `#D9A9B3`, gold `#C6A477`, cocoa `#44343A`, snow `#FFFFFF`.
`gold-ink #85663B` is a darker gold used for *small text* — the brand gold fails WCAG contrast on ivory.
Fonts: Cormorant Garamond (headings), DM Sans (body), Cairo (all Arabic text). Self-hosted via @fontsource.

## Internationalisation
- URLs carry the language: `/fr/...` and `/ar/...` (SEO-friendly, shareable, crawlable).
- `/` redirects to the saved choice → browser language → French.
- `<html lang dir>` follows the route; layout uses logical properties (`ms-`, `start-`, `end-`) so RTL mirrors automatically.
- `ar.ts` is typed against `fr.ts`: a missing translation fails the build.

## Replacing the logo
Set `logoUrl` in `src/config/site.ts` (or edit `components/brand/Wordmark.tsx`).

## Environment variables
See `.env.example`. Only `VITE_*` values reach the browser. The Supabase service role key and
WhatsApp credentials must only ever be stored as Supabase Edge Function secrets.

## Next phases
- 02 Public pages (About, Services, Gallery + lightbox, Team, Contact form), sitemap, OG image
- 03 Booking flow + availability engine ✅ (docs/BOOKING.md)
- 04 Admin dashboard: appointments ✅ — services, prices, hours, closures, staff and settings screens still to build
- 05 WhatsApp Cloud API activation (function written, not deployed), deployment
