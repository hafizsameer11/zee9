type IconProps = { size?: number; className?: string }

export function IconHot({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2c1.5 3 4 5.5 4 9a4 4 0 1 1-8 0c0-3.5 2.5-6 4-9zm0 11a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
    </svg>
  )
}

export function IconHeart({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  )
}

export function IconCrown({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path
        d="M4 18h16v2H4v-2zm1.5-9l2.8 4.2L12 7l3.7 6.2L18.5 9 22 17H2l3.5-8z"
        fill="url(#crownGrad)"
        stroke="#fff8e1"
        strokeWidth="0.8"
      />
      <circle cx="5" cy="9" r="1.5" fill="#ffe082" />
      <circle cx="12" cy="5" r="1.5" fill="#ffe082" />
      <circle cx="19" cy="9" r="1.5" fill="#ffe082" />
      <defs>
        <linearGradient id="crownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffe082" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function IconMegaphone({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18 11V9l-8-4v10l8-4v-2l4 2v-2l-4-2zm-10 1.5V6.5L4 8v8l4 1.5v-6zM3 10v4h2v-4H3z" />
    </svg>
  )
}

export function IconEvents({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" />
      <circle cx="12" cy="15" r="2.5" />
    </svg>
  )
}

export function IconRanking({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M7 10h2v9H7v-9zm4-4h2v13h-2V6zm4 7h2v6h-2v-6z" />
      <path d="M5 21h14v1H5v-1z" opacity="0.5" />
    </svg>
  )
}

export function IconGames({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M6 9H4v2h2V9zm0 4H4v2h2v-2zm4-8H8v2h2V5zm0 12H8v2h2v-2zm4-12h-2v2h2V5zm0 12h-2v2h2v-2zm4-8h-2v2h2V9zm0 4h-2v2h2v-2zM4 5h2v2H4V5zm0 12h2v2H4v-2z" />
      <rect x="2" y="6" width="20" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function IconSlot({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="7" y="16" fontSize="10" fontWeight="bold" fill="currentColor">777</text>
    </svg>
  )
}

export function IconLive({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <polygon points="10,8 16,12 10,16" />
    </svg>
  )
}

export function IconCard({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <rect x="3" y="5" width="12" height="16" rx="1.5" opacity="0.7" />
      <rect x="9" y="3" width="12" height="16" rx="1.5" />
    </svg>
  )
}

export function IconSports({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <ellipse cx="12" cy="18" rx="8" ry="2" opacity="0.4" />
      <rect x="10" y="4" width="4" height="12" rx="1" />
      <circle cx="12" cy="4" r="3" />
    </svg>
  )
}

export function IconGrid({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

export function IconNews({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v2H8V8zm0 4h8v2H8v-2zm0 4h5v2H8v-2z" />
    </svg>
  )
}

export function IconRecords({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6zm7 1.5L18.5 9H13V3.5zM8 12h8v2H8v-2zm0 4h8v2H8v-2z" />
    </svg>
  )
}

export function IconTreasure({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect x="3" y="10" width="18" height="10" rx="2" fill="#8b6914" stroke="#f7dc7a" strokeWidth="1.5" />
      <path d="M3 14h18M8 10V8a4 4 0 0 1 8 0v2" fill="none" stroke="#f7dc7a" strokeWidth="1.5" />
      <circle cx="12" cy="15" r="2" fill="#f7dc7a" />
      <path d="M5 10h14l-1-3H6l-1 3z" fill="#c41e3a" stroke="#f7dc7a" strokeWidth="1" />
    </svg>
  )
}

export function IconPower({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M13 3h-2v10h2V3zm4.24 2.76l-1.41 1.41A6.978 6.978 0 0 1 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.11.93-4 2.41-5.32L6.34 6.34A8.978 8.978 0 0 0 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.12-.74-4.07-1.97-5.62l-1.41 1.41A6.978 6.978 0 0 1 19 12c0 3.31-2.69 6-6 6s-6-2.69-6-6c0-1.66.68-3.16 1.76-4.24z" />
    </svg>
  )
}

export function IconWheel({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="12" r="9" fill="#141414" stroke="#d4af37" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2" fill="#f7dc7a" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <line
          key={deg}
          x1="12"
          y1="12"
          x2={12 + 9 * Math.cos((deg * Math.PI) / 180)}
          y2={12 + 9 * Math.sin((deg * Math.PI) / 180)}
          stroke="#d4af37"
          strokeWidth="1"
        />
      ))}
    </svg>
  )
}

export function IconCalendar({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect x="4" y="5" width="16" height="16" rx="2" fill="#141414" stroke="#d4af37" strokeWidth="1.5" />
      <path d="M4 9h16M8 3v4M16 3v4" stroke="#d4af37" strokeWidth="1.5" fill="none" />
      <text x="12" y="17" textAnchor="middle" fontSize="7" fill="#f7dc7a" fontWeight="bold">07</text>
    </svg>
  )
}

export function IconRecharge({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect x="3" y="7" width="18" height="12" rx="2" fill="#141414" stroke="#d4af37" strokeWidth="1.5" />
      <rect x="3" y="11" width="18" height="3" fill="#8a6a1c" />
      <rect x="5" y="4" width="4" height="6" rx="1" fill="#f7dc7a" />
      <rect x="10" y="4" width="4" height="6" rx="1" fill="#f7dc7a" />
      <rect x="15" y="4" width="4" height="6" rx="1" fill="#f7dc7a" />
    </svg>
  )
}

export function IconCashback({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect x="3" y="6" width="18" height="12" rx="2" fill="#141414" stroke="#d4af37" strokeWidth="1.5" />
      <text x="12" y="14.5" textAnchor="middle" fontSize="6" fill="#f7dc7a" fontWeight="bold">30%</text>
    </svg>
  )
}

export function IconSupport({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 1a9 9 0 0 0-9 9v4a3 3 0 0 0 3 3h1v-6H5a7 7 0 0 1 14 0h-2v6h1a3 3 0 0 0 3-3v-4a9 9 0 0 0-9-9z" />
    </svg>
  )
}

export function IconMail({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  )
}

export function IconSettings({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7zm7.43-2.91c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.08.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.61-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64L19.43 13z" />
    </svg>
  )
}

export function IconChip({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="12" r="10" fill="#c0392b" stroke="#f5c842" strokeWidth="2" />
      <circle cx="12" cy="12" r="6" fill="none" stroke="#f5c842" strokeWidth="1" strokeDasharray="2 2" />
      <text x="12" y="15" textAnchor="middle" fontSize="7" fill="#fff" fontWeight="bold">₹</text>
    </svg>
  )
}

export function IconWallet({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect x="2" y="6" width="20" height="14" rx="2" fill="#6d4c41" stroke="#8d6e63" strokeWidth="1" />
      <path d="M2 10h20v2H2z" fill="#5d4037" />
      <circle cx="17" cy="14" r="2" fill="#4caf50" />
      <path d="M16 12l2 2-2 2" stroke="#fff" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

export function IconShare({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11A2.99 2.99 0 1 0 14 3a2.99 2.99 0 0 0 .05.51L7 7.62a3 3 0 1 0 0 4.76l7.05 4.11c-.03.17-.05.34-.05.51a3 3 0 1 0 3-3z" />
    </svg>
  )
}

export function IconCart({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 20 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  )
}

const SIDEBAR_MAP = {
  hot: IconHot,
  love: IconCrown,
  games: IconGames,
  slot: IconSlot,
  live: IconLive,
  card: IconEvents,
  sports: IconRanking,
  all: IconGrid,
} as const

export function SidebarIcon({ name, size = 16 }: { name: keyof typeof SIDEBAR_MAP; size?: number }) {
  const C = SIDEBAR_MAP[name]
  return <C size={size} />
}
