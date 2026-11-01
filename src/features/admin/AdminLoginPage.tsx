import { LockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { Seo } from '@/components/layout/Seo'
import { Wordmark } from '@/components/brand/Wordmark'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { AdminLanguageToggle } from './AdminLanguageToggle'
import { useAdminSession } from './session-context'

export function AdminLoginPage() {
  const { t } = useTranslation()
  const { session, signIn } = useAdminSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (session.status === 'ready') return <Navigate to="/admin/rendez-vous" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const r = await signIn(email.trim(), password)
    setBusy(false)
    if (r === 'invalid') setError(t('admin.login.invalid'))
    else if (r === 'noAccess') setError(t('admin.login.noAccess'))
    else if (r === 'error') setError(t('errors.network'))
  }

  return (
    <main className="flex min-h-svh flex-col bg-ivory">
      <Seo title={t('admin.login.title')} noindex />
      <div className="flex justify-end p-4">
        <AdminLanguageToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm rounded-frame border border-line bg-snow p-8 shadow-soft">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <Wordmark />
            <h1 className="mt-4 font-display text-3xl text-cocoa">{t('admin.login.title')}</h1>
            <p className="text-sm text-cocoa-soft">{t('admin.login.subtitle')}</p>
          </div>
          {session.status === 'unconfigured' ? (
            <p role="alert" className="text-sm text-danger">{t('admin.login.notConfigured')}</p>
          ) : session.status === 'loading' ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
              <Field label={t('admin.login.email')} required>
                {({ id, describedBy }) => (
                  <Input id={id} aria-describedby={describedBy} type="email" dir="ltr" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
                )}
              </Field>
              <Field label={t('admin.login.password')} required>
                {({ id, describedBy }) => (
                  <Input id={id} aria-describedby={describedBy} type="password" dir="ltr" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                )}
              </Field>
              {error || session.status === 'noAccess' ? (
                <p role="alert" className="text-sm text-danger" data-testid="login-error">{error ?? t('admin.login.noAccess')}</p>
              ) : null}
              <Button type="submit" loading={busy} disabled={!email || !password} icon={<LockKeyhole aria-hidden className="size-4" />}>
                {t('admin.login.submit')}
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
