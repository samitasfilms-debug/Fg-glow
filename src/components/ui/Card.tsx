import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

export function Card({ interactive, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-line bg-snow p-6 shadow-soft md:p-8',
        interactive && 'transition-[box-shadow,transform,border-color] duration-500 ease-luxe hover:-translate-y-1 hover:border-line-strong hover:shadow-lift',
        className,
      )}
      {...rest}
    />
  )
}
