/** Illustrated rocket graphics for Double Crash */

type RocketVariant = 'a' | 'b'

const BODY: Record<RocketVariant, { body: string; nose: string; fin: string; glow: string }> = {
  a: {
    body: 'linear-gradient(165deg, #a8e6cf 0%, #1bd6a0 45%, #0d8f6a 100%)',
    nose: 'linear-gradient(180deg, #f4d98a, #d4af37)',
    fin: '#0d8f6a',
    glow: 'rgba(27,214,160,0.45)',
  },
  b: {
    body: 'linear-gradient(165deg, #ff8fab 0%, #c41e3a 45%, #8b1530 100%)',
    nose: 'linear-gradient(180deg, #f4d98a, #d4af37)',
    fin: '#8b1530',
    glow: 'rgba(196,30,58,0.5)',
  },
}

export function IllustratedRocket({
  variant,
  size = 36,
  className = '',
}: {
  variant: RocketVariant
  size?: number
  className?: string
}) {
  const c = BODY[variant]
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <div
        className="absolute -inset-2 rounded-full blur-md pointer-events-none"
        style={{ background: `radial-gradient(circle, ${c.glow}, transparent 70%)` }}
        aria-hidden
      />
      <div
        className="top-full left-1/2 -translate-x-1/2 rounded-full absolute pointer-events-none blur-[2px]"
        style={{
          width: size * 0.28,
          height: size * 1.1,
          background: 'linear-gradient(to bottom, #ffd54f, rgba(255,112,67,0))',
        }}
        aria-hidden
      />
      <svg viewBox="0 0 48 48" width={size} height={size} className="relative -rotate-45 drop-shadow-lg">
        <defs>
          <linearGradient id={`rb-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={variant === 'a' ? '#a8e6cf' : '#ff8fab'} />
            <stop offset="50%" stopColor={variant === 'a' ? '#1bd6a0' : '#c41e3a'} />
            <stop offset="100%" stopColor={variant === 'a' ? '#0d8f6a' : '#8b1530'} />
          </linearGradient>
          <linearGradient id={`rn-${variant}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f4d98a" />
            <stop offset="100%" stopColor="#d4af37" />
          </linearGradient>
        </defs>
        <path d="M24 4 L30 14 L18 14 Z" fill={`url(#rn-${variant})`} />
        <rect x="18" y="14" width="12" height="22" rx="3" fill={`url(#rb-${variant})`} />
        <path d="M18 30 L12 40 L18 36 Z" fill={c.fin} />
        <path d="M30 30 L36 40 L30 36 Z" fill={c.fin} />
        <ellipse cx="24" cy="22" rx="3" ry="4" fill="rgba(255,255,255,0.35)" />
        <circle cx="24" cy="38" r="3" fill="#ff7043" opacity="0.9" />
      </svg>
    </div>
  )
}

export function historyChipClass(mult: number): string {
  if (mult < 2) return 'bg-[#c41e3a]/15 text-[#ff6467]'
  if (mult < 5) return 'bg-[#1bd6a0]/15 text-[#1bd6a0]'
  return 'bg-[#d4af37]/15 text-[#f4d98a]'
}
