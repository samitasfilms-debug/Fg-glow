import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

const control =
  'w-full rounded-soft border bg-snow px-4 text-[0.9375rem] text-cocoa placeholder:text-cocoa-muted/70 ' +
  'transition-[border-color,box-shadow] duration-300 ease-luxe ' +
  'focus:outline-none focus:border-gold focus:shadow-[0_0_0_4px_rgb(142_47_66/0.14)] ' +
  'disabled:cursor-not-allowed disabled:bg-ivory-200 disabled:opacity-70'

const stateClass = (invalid?: boolean) =>
  invalid ? 'border-danger/60 focus:border-danger focus:shadow-[0_0_0_4px_rgb(164_68_79/0.12)]' : 'border-line-strong'

interface FieldProps {
  label: string
  hint?: string
  error?: string
  required?: boolean
  optionalLabel?: string
  className?: string
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode
}

/** Label + control + hint/error, wired with the right aria attributes. */
export function Field({ label, hint, error, required, optionalLabel, className, children }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-sm font-medium text-cocoa">
        <span>
          {label}
          {required ? (
            <span aria-hidden className="ms-0.5 text-gold-ink">
              *
            </span>
          ) : null}
        </span>
        {!required && optionalLabel ? <span className="text-xs font-normal text-cocoa-muted">{optionalLabel}</span> : null}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-cocoa-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function Input({
  invalid,
  className,
  ref,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={cn(control, 'min-h-12', stateClass(invalid), className)} {...rest} />
}

export function Textarea({
  invalid,
  className,
  ref,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean; ref?: Ref<HTMLTextAreaElement> }) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(control, 'min-h-32 resize-y py-3 leading-relaxed', stateClass(invalid), className)}
      {...rest}
    />
  )
}

export function Select({
  invalid,
  className,
  children,
  ref,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean; ref?: Ref<HTMLSelectElement> }) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(control, 'min-h-12 appearance-none pe-11', stateClass(invalid), className)}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-cocoa-muted" />
    </div>
  )
}
