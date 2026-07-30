type IconProps = { size?: number; className?: string }

let gradId = 0
function uid(prefix: string) {
  gradId += 1
  return `${prefix}-${gradId}`
}

export function IconPrizeChest({ size = 40, className }: IconProps) {
  const g = uid('chest')
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={g} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffe082" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="22" ry="4" fill="rgba(0,0,0,0.35)" />
      <rect x="10" y="28" width="44" height="26" rx="4" fill={`url(#${g})`} stroke="#fff8e1" strokeWidth="2" />
      <path d="M10 38h44" stroke="#8d6e14" strokeWidth="2.5" />
      <path d="M20 28V18a12 12 0 0 1 24 0v10" fill="none" stroke="#fff8e1" strokeWidth="2.5" />
      <rect x="26" y="36" width="12" height="12" rx="2" fill="#c62828" stroke="#fff" strokeWidth="1.5" />
      <circle cx="32" cy="42" r="2" fill="#ffd54f" />
    </svg>
  )
}

export function IconPrizeBike({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <ellipse cx="32" cy="56" rx="24" ry="4" fill="rgba(0,0,0,0.3)" />
      <circle cx="18" cy="40" r="11" fill="#263238" stroke="#eceff1" strokeWidth="3" />
      <circle cx="46" cy="40" r="11" fill="#263238" stroke="#eceff1" strokeWidth="3" />
      <circle cx="18" cy="40" r="3" fill="#90a4ae" />
      <circle cx="46" cy="40" r="3" fill="#90a4ae" />
      <path d="M18 40h10l6-14h10l6 14" fill="none" stroke="#ff5722" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 26l6-10h8" fill="none" stroke="#ff5722" strokeWidth="3" strokeLinecap="round" />
      <rect x="40" y="12" width="12" height="6" rx="2" fill="#42a5f5" stroke="#1565c0" strokeWidth="1" />
      <rect x="22" y="22" width="14" height="5" rx="2" fill="#37474f" />
    </svg>
  )
}

export function IconPrizeHome({ size = 40, className }: IconProps) {
  const g = uid('home')
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={g} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ef5350" />
          <stop offset="100%" stopColor="#c62828" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="20" ry="3" fill="rgba(0,0,0,0.3)" />
      <path d="M32 10 L54 30 V54 H10 V30 Z" fill="#ffcc80" stroke="#e65100" strokeWidth="2" />
      <path d="M32 10 L54 30 H10 Z" fill={`url(#${g})`} stroke="#b71c1c" strokeWidth="1.5" />
      <rect x="26" y="38" width="12" height="16" rx="1" fill="#5d4037" stroke="#3e2723" strokeWidth="1" />
      <circle cx="35" cy="46" r="1.5" fill="#ffd54f" />
      <rect x="14" y="34" width="8" height="8" rx="1" fill="#81d4fa" stroke="#fff" strokeWidth="1" />
      <rect x="42" y="34" width="8" height="8" rx="1" fill="#81d4fa" stroke="#fff" strokeWidth="1" />
      <rect x="28" y="28" width="8" height="6" rx="1" fill="#fff9c4" stroke="#f9a825" strokeWidth="1" />
    </svg>
  )
}

export function IconPrizeTicket({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <path
        d="M10 18h44a5 5 0 0 1 5 5v6a7 7 0 0 0 0 14v6a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5v-6a7 7 0 0 0 0-14v-6a5 5 0 0 1 5-5z"
        fill="#ffb300"
        stroke="#fff8e1"
        strokeWidth="2"
      />
      <path d="M32 22v28" stroke="#fff" strokeWidth="2" strokeDasharray="3 3" />
      <text x="32" y="38" textAnchor="middle" fontSize="9" fill="#5d4037" fontWeight="bold">
        AGAIN
      </text>
    </svg>
  )
}

export function IconPrizeGem({ size = 40, className }: IconProps) {
  const g = uid('gem')
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={g} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#81d4fa" />
          <stop offset="50%" stopColor="#0288d1" />
          <stop offset="100%" stopColor="#01579b" />
        </linearGradient>
      </defs>
      <polygon points="32,8 54,24 44,56 20,56 10,24" fill={`url(#${g})`} stroke="#e1f5fe" strokeWidth="2" />
      <polygon points="32,8 44,56 20,56" fill="rgba(255,255,255,0.18)" />
      <polygon points="32,8 54,24 32,32 10,24" fill="rgba(255,255,255,0.35)" />
    </svg>
  )
}

export function IconPrizePhone({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <ellipse cx="32" cy="58" rx="14" ry="3" fill="rgba(0,0,0,0.3)" />
      <rect x="18" y="8" width="28" height="48" rx="6" fill="#263238" stroke="#90caf9" strokeWidth="2.5" />
      <rect x="22" y="16" width="20" height="32" rx="2" fill="#42a5f5" />
      <rect x="26" y="20" width="12" height="20" rx="1" fill="#1565c0" opacity="0.5" />
      <circle cx="32" cy="52" r="3" fill="#eceff1" />
      <rect x="26" y="11" width="12" height="3" rx="1.5" fill="#37474f" />
    </svg>
  )
}

export function IconPrizeCoins({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <ellipse cx="32" cy="56" rx="18" ry="4" fill="rgba(0,0,0,0.28)" />
      <rect x="14" y="34" width="14" height="18" rx="2" fill="#2e7d32" stroke="#a5d6a7" strokeWidth="1.5" />
      <rect x="25" y="26" width="14" height="22" rx="2" fill="#43a047" stroke="#c8e6c9" strokeWidth="1.5" />
      <rect x="36" y="30" width="14" height="20" rx="2" fill="#1b5e20" stroke="#a5d6a7" strokeWidth="1.5" />
      <path d="M17 38h8M28 30h8M39 34h8" stroke="#fff" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

export function IconPrizeLose({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="32" r="26" fill="#ffeb3b" stroke="#f9a825" strokeWidth="2.5" />
      <circle cx="22" cy="28" r="3.5" fill="#5d4037" />
      <circle cx="42" cy="28" r="3.5" fill="#5d4037" />
      <path d="M22 44c3 4 17 4 20 0" fill="none" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />
      <path d="M18 20c2 3 6 3 8 0M38 20c2 3 6 3 8 0" fill="none" stroke="#5d4037" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function IconPrizeLaptop({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <ellipse cx="32" cy="58" rx="22" ry="3" fill="rgba(0,0,0,0.3)" />
      <rect x="12" y="14" width="40" height="26" rx="3" fill="#37474f" stroke="#90caf9" strokeWidth="2" />
      <rect x="16" y="18" width="32" height="18" rx="1" fill="#29b6f6" />
      <rect x="20" y="22" width="24" height="10" rx="1" fill="#1565c0" opacity="0.45" />
      <path d="M6 42h52l-4 8H10l-4-8z" fill="#546e7a" stroke="#cfd8dc" strokeWidth="1.5" />
      <rect x="28" y="44" width="8" height="2" rx="1" fill="#90a4ae" />
    </svg>
  )
}

export function IconPrizeGift({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <rect x="10" y="26" width="44" height="30" rx="3" fill="#ab47bc" stroke="#f48fb1" strokeWidth="2" />
      <rect x="8" y="18" width="48" height="10" rx="3" fill="#e040fb" stroke="#f8bbd9" strokeWidth="1.5" />
      <rect x="29" y="18" width="6" height="38" fill="#ffd54f" />
      <path d="M32 18c-8-10-18-5-13 3 5 5 13-3 13-3zm0 0c8-10 18-5 13 3-5 5-13-3-13-3z" fill="#ffeb3b" stroke="#f9a825" strokeWidth="1.5" />
    </svg>
  )
}

export function IconPrizeChip({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#c62828" stroke="#ffd54f" strokeWidth="2" />
      <text x="12" y="16" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="bold">Rs </text>
    </svg>
  )
}

export type PrizeIconType =
  | 'chest'
  | 'bike'
  | 'home'
  | 'ticket'
  | 'gem'
  | 'phone'
  | 'coins'
  | 'lose'
  | 'laptop'

const MAP = {
  chest: IconPrizeChest,
  bike: IconPrizeBike,
  home: IconPrizeHome,
  ticket: IconPrizeTicket,
  gem: IconPrizeGem,
  phone: IconPrizePhone,
  coins: IconPrizeCoins,
  lose: IconPrizeLose,
  laptop: IconPrizeLaptop,
} as const

export function WheelPrizeIcon({ type, size = 40 }: { type: PrizeIconType; size?: number }) {
  const C = MAP[type]
  return <C size={size} />
}

/** SVG wedge path for wheel segment (angles in degrees, 0 = top, clockwise) */
export function wheelSegmentPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180
  const x1 = cx + r * Math.cos(toRad(startDeg))
  const y1 = cy + r * Math.sin(toRad(startDeg))
  const x2 = cx + r * Math.cos(toRad(endDeg))
  const y2 = cy + r * Math.sin(toRad(endDeg))
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
}
