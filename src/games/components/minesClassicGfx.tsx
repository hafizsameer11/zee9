/** Classic mines UI illustrations — reference-style assets */

export function SkullBombIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="26" r="16" fill="#1a1a1a" stroke="#333" strokeWidth="2" />
      <ellipse cx="18" cy="22" rx="4" ry="3" fill="#444" />
      <circle cx="16" cy="21" r="1.2" fill="#fff" />
      <circle cx="20" cy="23" r="1" fill="#fff" />
      <circle cx="28" cy="21" r="1.2" fill="#fff" />
      <circle cx="32" cy="23" r="1" fill="#fff" />
      <path d="M18 30 Q24 34 30 30" stroke="#ccc" strokeWidth="1.5" fill="none" />
      <path d="M20 32h8" stroke="#fff" strokeWidth="1" />
      <path d="M24 10v6" stroke="#666" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="8" r="3" fill="#ff6600" />
      <path d="M26 6c2-2 5-1 4 2" stroke="#ffaa00" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

export function MoneyBagIcon({ n, className }: { n: number; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 48" fill="none" aria-hidden>
      <path
        d="M8 18c0-6 5-10 12-10s12 4 12 10v4H8v-4z"
        fill="#c9a227"
        stroke="#8b6914"
        strokeWidth="1.5"
      />
      <ellipse cx="20" cy="32" rx="14" ry="12" fill="#e8c040" stroke="#a07820" strokeWidth="1.5" />
      <path d="M14 22c2-4 10-4 12 0" stroke="#a07820" strokeWidth="2" fill="none" />
      <circle cx="20" cy="30" r="8" fill="#3d6cb5" stroke="#1e4080" strokeWidth="1.5" />
      <text x="20" y="34" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold" fontFamily="Arial,sans-serif">
        {n}
      </text>
    </svg>
  )
}

export function TreasureChestIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 52" fill="none" aria-hidden>
      <rect x="6" y="22" width="52" height="26" rx="3" fill="#5c3d1e" stroke="#3d2810" strokeWidth="2" />
      <path d="M6 28h52" stroke="#3d2810" strokeWidth="2" />
      <rect x="28" y="26" width="8" height="10" rx="1" fill="#ffd700" stroke="#b8860b" strokeWidth="1" />
      <path d="M4 22 Q32 8 60 22" fill="#7a4f28" stroke="#3d2810" strokeWidth="2" />
      <ellipse cx="20" cy="36" rx="6" ry="4" fill="#ffd700" />
      <ellipse cx="32" cy="38" rx="7" ry="5" fill="#ffec8b" />
      <ellipse cx="44" cy="36" rx="6" ry="4" fill="#ffd700" />
      <circle cx="32" cy="34" r="3" fill="#fff8dc" opacity="0.6" />
    </svg>
  )
}

export function PokerChipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="14" fill="#c41e3a" stroke="#fff" strokeWidth="2" />
      <circle cx="16" cy="16" r="10" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="3 2" />
      <circle cx="16" cy="16" r="5" fill="#fff" opacity="0.9" />
      <text x="16" y="19" textAnchor="middle" fill="#c41e3a" fontSize="7" fontWeight="bold" fontFamily="Arial">
        PKR
      </text>
    </svg>
  )
}

export function CartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M4 6h4l3 14h14l3-10H9" stroke="#ffd700" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="13" cy="24" r="2" fill="#ffd700" />
      <circle cx="23" cy="24" r="2" fill="#ffd700" />
      <path d="M8 10h18" stroke="#ffec8b" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function GemRevealIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M24 6 L40 18 L24 42 L8 18 Z" fill="#4fc3f7" stroke="#0277bd" strokeWidth="1.5" />
      <path d="M24 6 L40 18 L24 24 L8 18 Z" fill="#81d4fa" />
      <path d="M24 24 L40 18 L24 42 Z" fill="#29b6f6" />
      <path d="M16 14 L24 8 L32 14 L24 20 Z" fill="#fff" opacity="0.45" />
    </svg>
  )
}

export function MineRevealIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="28" r="14" fill="#222" stroke="#111" strokeWidth="2" />
      <path d="M24 12v6" stroke="#888" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="10" r="3" fill="#ff5722" />
      <text x="24" y="32" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">
        ☠
      </text>
    </svg>
  )
}

export function BackChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 6 L8 12 L14 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function MenuDiamondsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}
