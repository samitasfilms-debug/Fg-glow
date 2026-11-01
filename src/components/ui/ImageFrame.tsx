import { motion } from 'framer-motion'
import { ImageIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { imageReveal } from '@/lib/motion'

type Shape = 'rect' | 'arch' | 'portrait' | 'square' | 'wide'

const shapes: Record<Shape, string> = {
  rect: 'aspect-[4/5] rounded-frame',
  portrait: 'aspect-[3/4] rounded-frame',
  square: 'aspect-square rounded-frame',
  wide: 'aspect-[16/10] rounded-frame',
  arch: 'aspect-[3/4] rounded-arch',
}

interface ImageFrameProps {
  /** Real image URL. When missing, an on-brand placeholder artwork is shown. */
  src?: string | null
  alt?: string
  shape?: Shape
  className?: string
  /** Variation of the placeholder artwork. */
  variant?: number
  reveal?: boolean
  priority?: boolean
  sizes?: string
  showLabel?: boolean
}

/**
 * The single entry point for imagery. Handles lazy loading, aspect ratio and
 * the reveal animation, and renders an honest "image coming" artwork until
 * the salon uploads its own photography.
 */
export function ImageFrame({
  src,
  alt = '',
  shape = 'rect',
  className,
  variant = 0,
  reveal = true,
  priority = false,
  sizes,
  showLabel = true,
}: ImageFrameProps) {
  const { t } = useTranslation()
  const inner = src ? (
    <img
      src={src}
      alt={alt}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      className="h-full w-full object-cover"
    />
  ) : (
    <ArtPlaceholder variant={variant} label={showLabel ? t('placeholder.imageComing') : undefined} />
  )

  return (
    <div className={cn('relative overflow-hidden bg-blush-100', shapes[shape], className)}>
      {reveal ? (
        <motion.div
          className="h-full w-full"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={imageReveal}
        >
          {inner}
        </motion.div>
      ) : (
        inner
      )}
    </div>
  )
}

const palettes = [
  ['#F6E5EA', '#EBD3D9', '#E8C6CF'],
  ['#F7EDE6', '#EFE3D9', '#E7D7C1'],
  ['#FBF2F4', '#F1DCE1', '#D9A9B3'],
  ['#EFE3D9', '#E8D2CB', '#D9A9B3'],
] as const

/** Abstract silk-and-strands artwork in brand tones, used until photography exists. */
export function ArtPlaceholder({ variant = 0, label, labelPosition = 'start' }: { variant?: number; label?: string; labelPosition?: 'start' | 'end' }) {
  const [a, b, c] = palettes[variant % palettes.length]
  const id = `art-${variant}`
  const shift = (variant % 3) * 40
  return (
    <div className="grain relative h-full w-full" role="img" aria-label={label}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={a} />
            <stop offset="55%" stopColor={b} />
            <stop offset="100%" stopColor={c} />
          </linearGradient>
          <radialGradient id={`${id}-glow`} cx="0.7" cy="0.25" r="0.6">
            <stop offset="0%" stopColor="#FFF9F5" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FFF9F5" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="500" fill={`url(#${id}-bg)`} />
        <rect width="400" height="500" fill={`url(#${id}-glow)`} />
        <g fill="none" stroke="#C6A477" strokeLinecap="round">
          {Array.from({ length: 9 }).map((_, i) => (
            <path
              key={i}
              strokeOpacity={0.18 + i * 0.045}
              strokeWidth={0.8 + (i % 3) * 0.35}
              d={`M ${-40 + i * 14 + shift} -20 C ${120 + i * 10} ${120 + i * 6}, ${40 + i * 18 - shift / 2} ${300 - i * 4}, ${220 + i * 16} 540`}
            />
          ))}
        </g>
        <g fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeOpacity="0.55">
          {Array.from({ length: 4 }).map((_, i) => (
            <path key={i} strokeWidth={0.7} d={`M ${180 + i * 22 - shift} -20 C ${300 - i * 8} ${160}, ${150 + i * 12} ${340}, ${330 + i * 10} 540`} />
          ))}
        </g>
      </svg>
      {label ? (
        <span className={cn('absolute bottom-4 z-[2]', labelPosition === 'end' ? 'end-4' : 'start-4', ' inline-flex items-center gap-1.5 rounded-full bg-ivory/80 px-3 py-1 text-[0.6875rem] font-medium tracking-wide text-cocoa-soft backdrop-blur')}>
          <ImageIcon aria-hidden className="size-3" strokeWidth={1.75} />
          {label}
        </span>
      ) : null}
    </div>
  )
}
