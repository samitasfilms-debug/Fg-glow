import { useTranslation } from 'react-i18next'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import type { AppointmentStatus } from './api'

const TONES: Record<AppointmentStatus, BadgeTone> = {
  pending: 'warning',
  reschedule_requested: 'gold',
  confirmed: 'success',
  completed: 'neutral',
  rejected: 'danger',
  cancelled: 'muted',
  no_show: 'danger',
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { t } = useTranslation()
  return (
    <Badge tone={TONES[status]} data-status={status}>
      {t(`booking.status.${status}`)}
    </Badge>
  )
}
