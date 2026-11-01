import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { addDays, salonLocalToIso, salonToday } from '@/lib/datetime'
import type { AdminAction } from './api'

interface Props {
  action: AdminAction | null
  busy: boolean
  error: string | null
  onClose: () => void
  onSubmit: (opts: { note: string; newStartsAt?: string }) => void
}

/** Native <dialog>: focus trap, Escape to close and backdrop come from the browser. */
export function ActionDialog({ action, busy, error, onClose, onSubmit }: Props) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)
  const [note, setNote] = useState('')
  const [day, setDay] = useState('')
  const [time, setTime] = useState('')

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (action && !d.open) {
      setNote('')
      setDay(addDays(salonToday(), 1))
      setTime('')
      d.showModal()
    }
    if (!action && d.open) d.close()
  }, [action])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (action === 'propose') {
      if (!day || !time) return
      onSubmit({ note, newStartsAt: salonLocalToIso(day, time) })
    } else onSubmit({ note })
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="action-dialog-title"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-frame border border-line bg-snow p-0 text-cocoa shadow-lift backdrop:bg-cocoa/40 backdrop:backdrop-blur-sm"
    >
      {action ? (
        <form onSubmit={submit} className="flex flex-col gap-5 p-6" data-testid="action-dialog">
          <div className="flex flex-col gap-1">
            <p className="eyebrow">{t('admin.actions.confirmTitle')}</p>
            <h2 id="action-dialog-title" className="font-display text-3xl">
              {t(`admin.actions.${action}`)}
            </h2>
          </div>
          {action === 'propose' ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('admin.actions.newDate')} required>
                {({ id }) => <Input id={id} type="date" required min={salonToday()} value={day} onChange={(e) => setDay(e.target.value)} />}
              </Field>
              <Field label={t('admin.actions.newTime')} required>
                {({ id }) => <Input id={id} type="time" required step={300} value={time} onChange={(e) => setTime(e.target.value)} />}
              </Field>
            </div>
          ) : null}
          <Field label={t('admin.actions.note')}>
            {({ id }) => <Textarea id={id} maxLength={1000} className="min-h-24" value={note} onChange={(e) => setNote(e.target.value)} />}
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-danger" data-testid="action-error">
              {t(`errors.${error}`, { defaultValue: t('errors.generic') })}
            </p>
          ) : null}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              {t('admin.actions.close')}
            </Button>
            <Button type="submit" loading={busy} variant={action === 'reject' || action === 'cancel' || action === 'no_show' ? 'outline' : 'primary'} data-testid="action-apply">
              {t('admin.actions.apply')}
            </Button>
          </div>
        </form>
      ) : null}
    </dialog>
  )
}
