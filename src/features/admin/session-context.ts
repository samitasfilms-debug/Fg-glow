import { createContext, useContext } from 'react'
import type { Profile } from './api'

export type AdminSession =
  | { status: 'loading' }
  | { status: 'unconfigured' }
  | { status: 'signedOut' }
  | { status: 'noAccess'; email: string | null }
  | { status: 'error'; code: string }
  | { status: 'ready'; profile: Profile; email: string | null }

export interface AdminSessionValue {
  session: AdminSession
  signIn: (email: string, password: string) => Promise<'ok' | 'invalid' | 'noAccess' | 'error'>
  signOut: () => Promise<void>
}

export const AdminSessionContext = createContext<AdminSessionValue | null>(null)

export function useAdminSession() {
  const ctx = useContext(AdminSessionContext)
  if (!ctx) throw new Error('useAdminSession must be used inside <AdminRoot>')
  return ctx
}

export const canManage = (p: Profile) => p.role === 'super_admin' || p.role === 'manager'
