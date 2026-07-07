/** Reference-style mines UI artwork — cartoon 3D look */

export function SkullBombIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 56 56" fill="none" aria-hidden>
      <ellipse cx="28" cy="34" rx="18" ry="16" fill="#1c1c1c" />
      <ellipse cx="28" cy="32" rx="17" ry="15" fill="#2a2a2a" />
      <ellipse cx="22" cy="28" rx="5" ry="6" fill="#f5f5f5" />
      <ellipse cx="34" cy="28" rx="5" ry="6" fill="#f5f5f5" />
      <circle cx="20" cy="26" r="2" fill="#111" />
      <circle cx="32" cy="26" r="2" fill="#111" />
      <circle cx="21" cy="25" r="0.8" fill="#fff" />
      <circle cx="33" cy="25" r="0.8" fill="#fff" />
      <path d="M22 38 Q28 42 34 38" stroke="#ddd" strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="24" y="38" width="2" height="4" rx="0.5" fill="#eee" />
      <rect x="27" y="38" width="2" height="4" rx="0.5" fill="#eee" />
      <rect x="30" y="38" width="2" height="4" rx="0.5" fill="#eee" />
      <path d="M28 16v8" stroke="#555" strokeWidth="3" strokeLinecap="round" />
      <circle cx="28" cy="13" r="4" fill="#ff8c00" />
      <path d="M30 10c3-3 7-1 5 3" stroke="#ffcc00" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="28" cy="34" rx="18" ry="16" fill="none" stroke="#111" strokeWidth="1.5" />
    </svg>
  )
}

export function MoneyBagIcon({ n, className }: { n: number; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 44 52" fill="none" aria-hidden>
      <defs>
        <linearGradient id={`bagG${n}`} x1="22" y1="8" x2="22" y2="48">
          <stop offset="0%" stopColor="#ffe566" />
          <stop offset="50%" stopColor="#e8b830" />
          <stop offset="100%" stopColor="#c8941a" />
        </linearGradient>
      </defs>
      <path d="M10 20c0-8 6-12 14-12s14 4 14 12v6H10v-6z" fill={`url(#bagG${n})`} stroke="#a07018" strokeWidth="1.2" />
      <ellipse cx="22" cy="36" rx="16" ry="14" fill={`url(#bagG${n})`} stroke="#a07018" strokeWidth="1.2" />
      <path d="M14 22c3-5 14-5 16 0" stroke="#8b6010" strokeWidth="2" fill="none" />
      <path d="M18 18c2-3 8-3 8 0" stroke="#8b6010" strokeWidth="1.5" fill="none" />
      <circle cx="22" cy="34" r="9" fill="#2e6db5" stroke="#1a4080" strokeWidth="1.5" />
      <text x="22" y="38" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="900" fontFamily="Arial Black, Arial, sans-serif">
        {n}
      </text>
      <ellipse cx="16" cy="30" rx="4" ry="3" fill="#fff" opacity="0.25" />
    </svg>
  )
}

export function TreasureChestIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 72 56" fill="none" aria-hidden>
      <rect x="8" y="28" width="56" height="24" rx="2" fill="#6b3f1a" stroke="#3d2210" strokeWidth="2" />
      <path d="M8 34h56" stroke="#3d2210" strokeWidth="2" />
      <rect x="32" y="32" width="8" height="12" rx="1" fill="#ffd700" stroke="#b8860b" strokeWidth="1" />
      <path d="M6 28 Q36 10 66 28" fill="#8b5a2b" stroke="#3d2210" strokeWidth="2" />
      <ellipse cx="22" cy="40" rx="7" ry="5" fill="#ffd700" />
      <ellipse cx="36" cy="42" rx="9" ry="6" fill="#ffec8b" />
      <ellipse cx="50" cy="40" rx="7" ry="5" fill="#ffd700" />
      <circle cx="30" cy="36" r="4" fill="#ffe566" />
      <circle cx="42" cy="38" r="3" fill="#ffe566" />
      <circle cx="48" cy="35" r="3.5" fill="#ffd700" />
      <ellipse cx="36" cy="36" rx="12" ry="4" fill="#fff8dc" opacity="0.35" />
    </svg>
  )
}

export function PokerChipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" aria-hidden>
      <circle cx="18" cy="18" r="16" fill="#d42030" stroke="#fff" strokeWidth="2.5" />
      <circle cx="18" cy="18" r="12" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4 3" />
      <circle cx="18" cy="18" r="7" fill="#fff" />
      <circle cx="18" cy="18" r="5" fill="#d42030" />
      <circle cx="18" cy="18" r="3" fill="#fff" opacity="0.8" />
    </svg>
  )
}

export function CartWagonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 40" fill="none" aria-hidden>
      <path d="M6 8h28l4 16H8L6 8z" fill="#e8b830" stroke="#a07018" strokeWidth="1.5" />
      <path d="M10 12h20l2 8H12l-2-8z" fill="#ffd700" />
      <rect x="4" y="6" width="6" height="4" rx="1" fill="#c8941a" />
      <circle cx="14" cy="30" r="5" fill="#555" stroke="#333" strokeWidth="1.5" />
      <circle cx="14" cy="30" r="2.5" fill="#888" />
      <circle cx="32" cy="30" r="5" fill="#555" stroke="#333" strokeWidth="1.5" />
      <circle cx="32" cy="30" r="2.5" fill="#888" />
      <path d="M34 8h8l2 14h-6" fill="#e8b830" stroke="#a07018" strokeWidth="1" />
      <ellipse cx="20" cy="14" rx="8" ry="4" fill="#fff" opacity="0.2" />
    </svg>
  )
}

export function PromoPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden>
      <circle cx="20" cy="22" r="12" fill="#e8b830" stroke="#a07018" strokeWidth="1.5" />
      <text x="20" y="26" textAnchor="middle" fill="#5c3d10" fontSize="10" fontWeight="900" fontFamily="Arial">
        Rs
      </text>
      <path d="M26 10 L32 4 L30 14 Z" fill="#2196f3" stroke="#1565c0" strokeWidth="1" />
      <circle cx="28" cy="8" r="3" fill="#42a5f5" />
    </svg>
  )
}

export function GemRevealIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M24 8 L38 20 L24 40 L10 20 Z" fill="#4dd0e1" stroke="#00838f" strokeWidth="1.5" />
      <path d="M24 8 L38 20 L24 26 L10 20 Z" fill="#80deea" />
      <path d="M16 16 L24 10 L32 16 L24 22 Z" fill="#fff" opacity="0.5" />
    </svg>
  )
}

export function MineRevealIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="28" r="14" fill="#222" />
      <ellipse cx="18" cy="24" rx="4" ry="5" fill="#fff" />
      <ellipse cx="30" cy="24" rx="4" ry="5" fill="#fff" />
      <circle cx="17" cy="23" r="1.5" fill="#111" />
      <circle cx="29" cy="23" r="1.5" fill="#111" />
      <path d="M20 32h8" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 12v6" stroke="#666" strokeWidth="2" />
      <circle cx="24" cy="10" r="3" fill="#ff6600" />
    </svg>
  )
}

export function BackChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 5 L9 12 L15 19" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function MenuDiamondsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="2" width="8" height="8" rx="1.5" fill="#ffd700" stroke="#c9a020" strokeWidth="1" />
      <rect x="14" y="2" width="8" height="8" rx="1.5" fill="#ffd700" stroke="#c9a020" strokeWidth="1" />
      <rect x="2" y="14" width="8" height="8" rx="1.5" fill="#ffd700" stroke="#c9a020" strokeWidth="1" />
      <rect x="14" y="14" width="8" height="8" rx="1.5" fill="#ffd700" stroke="#c9a020" strokeWidth="1" />
    </svg>
  )
}

/** White cartoon glove — tutorial “tap here” pointer */
export function GuideHandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 90" fill="none" aria-hidden>
      <ellipse cx="40" cy="78" rx="18" ry="6" fill="#000" opacity="0.18" />
      <path
        d="M18 52c-2-14 8-28 22-30 10-1 18 4 20 14 1 6-1 12-6 16l-4 22c-1 6-8 8-12 4l-8-10c-4-5-3-12 2-16z"
        fill="#fff"
        stroke="#d8d8d8"
        strokeWidth="1.5"
      />
      <path
        d="M40 22c0-10 8-16 16-14 6 1 10 7 10 14v28c0 4-3 7-7 7s-7-3-7-7V22z"
        fill="#fff"
        stroke="#d8d8d8"
        strokeWidth="1.5"
      />
      <path
        d="M52 20c6-2 12 2 14 10 2 8-2 16-8 20"
        fill="#fff"
        stroke="#d8d8d8"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M28 38c-6-2-10 2-10 10 0 6 4 10 8 10"
        fill="#fff"
        stroke="#d8d8d8"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M22 48c-5 0-8 4-6 9 2 4 6 5 10 2"
        fill="#fff"
        stroke="#d8d8d8"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <ellipse cx="48" cy="18" rx="4" ry="5" fill="#f5f5f5" opacity="0.7" />
      <path d="M44 8 L48 2" stroke="#333" strokeWidth="2" strokeLinecap="round" opacity="0.15" />
    </svg>
  )
}
