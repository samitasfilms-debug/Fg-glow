/**
 * Typed access to public (VITE_*) environment variables.
 * Secrets (service role key, WhatsApp tokens…) must never be read here.
 */
const read = (value: string | undefined) => (value && value.trim().length > 0 ? value.trim() : null)

export const env = {
  siteUrl: read(import.meta.env.VITE_SITE_URL),
  supabaseUrl: read(import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: read(import.meta.env.VITE_SUPABASE_ANON_KEY),
} as const

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey)
