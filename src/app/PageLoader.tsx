import { Spinner } from '@/components/ui/Spinner'

/** Shown while a lazily loaded route chunk downloads. */
export function PageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ivory">
      <Spinner />
    </div>
  )
}
