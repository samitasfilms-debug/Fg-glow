import { cn } from '@/lib/cn'

/** Thin gold rule with a small diamond — the brand's only decorative mark. */
export function Ornament({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('flex items-center justify-center gap-3 text-gold', className)}>
      <span className="h-px w-12 bg-current opacity-50" />
      <span className="size-1.5 rotate-45 border border-current" />
      <span className="h-px w-12 bg-current opacity-50" />
    </div>
  )
}
