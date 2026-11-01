import { ArrowRight, Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { buttonStyles, type ButtonSize, type ButtonVariant } from './button-styles'

interface CommonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Adds a trailing arrow that slides on hover (mirrored in RTL). */
  withArrow?: boolean
  icon?: ReactNode
}

function Content({ children, withArrow, icon }: { children: ReactNode; withArrow?: boolean; icon?: ReactNode }) {
  return (
    <>
      {icon}
      <span>{children}</span>
      {withArrow ? (
        <span className="flip-rtl inline-flex">
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform duration-500 ease-luxe group-hover/btn:translate-x-1"
            strokeWidth={1.5}
          />
        </span>
      ) : null}
    </>
  )
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, CommonProps {
  loading?: boolean
}

export function Button({
  variant,
  size,
  withArrow,
  icon,
  loading,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <Content withArrow={withArrow} icon={loading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : icon}>
        {children}
      </Content>
    </button>
  )
}

export interface ButtonLinkProps extends LinkProps, CommonProps {}

/** Router link styled as a button (internal navigation). */
export function ButtonLink({ variant, size, withArrow, icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonStyles({ variant, size, className })} {...rest}>
      <Content withArrow={withArrow} icon={icon}>
        {children}
      </Content>
    </Link>
  )
}
