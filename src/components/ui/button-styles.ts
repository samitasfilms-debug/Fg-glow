import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'gold' | 'outline' | 'ghost' | 'light' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base =
  'group/btn relative inline-flex items-center justify-center gap-2.5 whitespace-nowrap font-medium select-none ' +
  'transition-[background-color,color,border-color,box-shadow,transform] duration-500 ease-luxe ' +
  'disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-cocoa text-ivory shadow-soft hover:bg-[#3a2b31] hover:shadow-lift',
  gold: 'bg-gold text-cocoa shadow-soft hover:bg-[#bd9a6c] hover:shadow-glow',
  outline: 'border border-cocoa/25 text-cocoa hover:border-cocoa hover:bg-cocoa hover:text-ivory',
  ghost: 'text-cocoa hover:bg-blush-100',
  light: 'border border-ivory/40 text-ivory backdrop-blur-sm hover:bg-ivory hover:text-cocoa',
  link: 'px-0 text-cocoa underline-offset-[6px] decoration-gold/60 hover:underline',
}

const sizes: Record<ButtonSize, string> = {
  // min-h keeps every tap target ≥ 44px
  sm: 'min-h-11 rounded-full px-5 text-sm',
  md: 'min-h-12 rounded-full px-7 text-[0.9375rem]',
  lg: 'min-h-14 rounded-full px-9 text-base tracking-wide',
}

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], variant === 'link' ? 'min-h-11 text-[0.9375rem]' : sizes[size], className)
}
