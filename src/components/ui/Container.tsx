import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function Container({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('container-site', className)} {...rest} />
}
