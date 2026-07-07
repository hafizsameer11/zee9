/** Illustrated mine/gem art — Flowstep export has no PNG assets, only icon components */

export function GemArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden>
      <defs>
        <linearGradient id="gemTop" x1="32" y1="4" x2="32" y2="32">
          <stop offset="0%" stopColor="#b8ffe8" />
          <stop offset="100%" stopColor="#2ee6a6" />
        </linearGradient>
        <linearGradient id="gemLeft" x1="8" y1="32" x2="32" y2="52">
          <stop offset="0%" stopColor="#0f9c6e" />
          <stop offset="100%" stopColor="#065a40" />
        </linearGradient>
        <linearGradient id="gemRight" x1="56" y1="32" x2="32" y2="52">
          <stop offset="0%" stopColor="#3affb0" />
          <stop offset="100%" stopColor="#0a7050" />
        </linearGradient>
        <filter id="gemGlow">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#2ee6a6" floodOpacity="0.9" />
        </filter>
      </defs>
      <path
        d="M32 6 L54 24 L32 58 L10 24 Z"
        fill="url(#gemLeft)"
        filter="url(#gemGlow)"
      />
      <path d="M32 6 L54 24 L32 32 L10 24 Z" fill="url(#gemTop)" />
      <path d="M32 32 L54 24 L32 58 Z" fill="url(#gemRight)" />
      <path d="M32 32 L10 24 L32 58 Z" fill="#0a5f42" opacity="0.85" />
      <path d="M22 18 L32 10 L42 18 L32 26 Z" fill="white" opacity="0.35" />
    </svg>
  )
}

export function BombArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden>
      <defs>
        <radialGradient id="bombBody" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#ff6b7a" />
          <stop offset="55%" stopColor="#c41e3a" />
          <stop offset="100%" stopColor="#5a0818" />
        </radialGradient>
        <filter id="bombGlow">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ff3355" floodOpacity="0.85" />
        </filter>
      </defs>
      <circle cx="32" cy="38" r="22" fill="url(#bombBody)" filter="url(#bombGlow)" />
      <ellipse cx="24" cy="30" rx="7" ry="5" fill="white" opacity="0.22" />
      <path d="M32 16 V8" stroke="#f5d97a" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="6" r="4" fill="#ffcc00" />
      <path
        d="M36 4 C40 0 46 2 44 8"
        stroke="#ff9500"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path stroke="#fff" strokeWidth="2.5" strokeLinecap="round" d="M18 38 H12 M46 38 H52 M32 54 V60" opacity="0.5" />
    </svg>
  )
}

export function SparkArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1 L9.2 5.8 L14 7 L9.2 8.2 L8 13 L6.8 8.2 L2 7 L6.8 5.8 Z"
        fill="#fff"
        opacity="0.95"
      />
    </svg>
  )
}

export function FlameArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 2 C12 6 16 7 14 12 C13 15 11 17 10 18 C9 17 7 15 6 12 C4 7 8 6 10 2Z"
        fill="#f5d97a"
      />
      <path
        d="M10 8 C11 10 12 11 11 13 C10.5 14.5 10 15 10 15 C10 15 9.5 14.5 9 13 C8 11 9 10 10 8Z"
        fill="#ff9500"
      />
    </svg>
  )
}

export function HiddenMarkArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="20" stroke="rgba(212,175,55,0.22)" strokeWidth="2" />
      <text
        x="24"
        y="30"
        textAnchor="middle"
        fill="rgba(212,175,55,0.35)"
        fontSize="22"
        fontWeight="800"
        fontFamily="Inter, system-ui, sans-serif"
      >
        ?
      </text>
    </svg>
  )
}
