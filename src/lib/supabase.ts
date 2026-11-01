import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, isSupabaseConfigured } from '@/config/env'

/**
 * Browser Supabase client (anon key only, protected by RLS).
 * Returns `null` until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set,
 * so features can show an honest "not configured" state instead of fake data.
 * Database features are wired in Phases 03–05.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null
