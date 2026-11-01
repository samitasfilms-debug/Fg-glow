import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { detectPreferredLocale, type Locale } from '@/i18n/config'
import { LocaleProvider } from '@/i18n/LocaleContext'
import { supabase } from '@/lib/supabase'
import { BookingError } from '@/features/booking/api'
import { adminApi } from './api'
import { AdminSessionContext, type AdminSession, type AdminSessionValue } from './session-context'
import { AdminLocaleContext } from './admin-locale'

/**
 * Root of /admin: language (saved preference, toggled in the header) and the
 * Supabase Auth session. Access is decided by the database (get_my_profile
 * returns a row only for active salon members); the UI only reflects it.
 */
export function AdminRoot() {
  const [locale, setLocale] = useState<Locale>(detectPreferredLocale)
  const [session, setSession] = useState<AdminSession>(supabase ? { status: 'loading' } : { status: 'unconfigured' })

  const resolve = useCallback(async (email: string | null) => {
    try {
      const profile = await adminApi.profile()
      setSession(profile ? { status: 'ready', profile, email } : { status: 'noAccess', email })
      return profile ? 'ok' : 'noAccess'
    } catch (e) {
      setSession({ status: 'error', code: e instanceof BookingError ? e.code : 'generic' })
      return 'error'
    }
  }, [])

  useEffect(() => {
    if (!supabase) return
    let alive = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      if (data.session) void resolve(data.session.user.email ?? null)
      else setSession({ status: 'signedOut' })
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setSession({ status: 'signedOut' })
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [resolve])

  const value = useMemo<AdminSessionValue>(
    () => ({
      session,
      signIn: async (email, password) => {
        if (!supabase) return 'error'
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error || !data.session) return error && /fetch|network/i.test(error.message) ? 'error' : 'invalid'
        const r = await resolve(data.user?.email ?? email)
        if (r === 'noAccess') await supabase.auth.signOut()
        return r as 'ok' | 'noAccess' | 'error'
      },
      signOut: async () => {
        await supabase?.auth.signOut()
        setSession({ status: 'signedOut' })
      },
    }),
    [session, resolve],
  )

  return (
    <LocaleProvider locale={locale}>
      <AdminLocaleContext.Provider value={setLocale}>
        <AdminSessionContext.Provider value={value}>
          <Outlet />
        </AdminSessionContext.Provider>
      </AdminLocaleContext.Provider>
    </LocaleProvider>
  )
}
