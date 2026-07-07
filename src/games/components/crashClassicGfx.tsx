/** Super9-style crash UI artwork */

export function BackChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 6L8 12l6 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
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
    </svg>
  )
}

export function CartWagonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 40" fill="none" aria-hidden>
      <path d="M6 8h28l4 16H8L6 8z" fill="#e8b830" stroke="#a07018" strokeWidth="1.5" />
      <path d="M10 12h20l2 8H12l-2-8z" fill="#ffd700" />
      <circle cx="14" cy="30" r="5" fill="#555" stroke="#333" strokeWidth="1.5" />
      <circle cx="32" cy="30" r="5" fill="#555" stroke="#333" strokeWidth="1.5" />
      <path d="M34 8h8l2 14h-6" fill="#e8b830" stroke="#a07018" strokeWidth="1" />
    </svg>
  )
}

export function MenuDiamondsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="4" y="4" width="24" height="24" rx="4" fill="#5c1018" stroke="#8b2030" strokeWidth="1.5" transform="rotate(45 16 16)" />
      <rect x="10" y="10" width="5" height="5" fill="#f0d080" transform="rotate(45 12.5 12.5)" />
      <rect x="17" y="10" width="5" height="5" fill="#f0d080" transform="rotate(45 19.5 12.5)" />
      <rect x="10" y="17" width="5" height="5" fill="#f0d080" transform="rotate(45 12.5 19.5)" />
      <rect x="17" y="17" width="5" height="5" fill="#f0d080" transform="rotate(45 19.5 19.5)" />
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
      <path d="M20 6 L22 12 L18 12 Z" fill="#d42030" />
    </svg>
  )
}

export function SocialGroupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="5" fill="#fff" />
      <circle cx="22" cy="14" r="4" fill="#fff" opacity="0.9" />
      <path d="M4 26c0-4 4-7 8-7s8 3 8 7" fill="#fff" />
      <path d="M18 24c0-3 2.5-5 6-5s6 2 6 5" fill="#fff" opacity="0.9" />
    </svg>
  )
}

export function ChartTrendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 18 L9 12 L13 15 L20 6" stroke="#ff9800" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 6h4v4" stroke="#ff9800" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CrashRocketIcon({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M24 4 L28 16 L20 16 Z" fill="#e53935" />
      <rect x="20" y="16" width="8" height="18" rx="3" fill="#f5f5f5" stroke="#bdbdbd" strokeWidth="1" />
      <path d="M20 30 L12 42 L20 36 Z" fill="#e53935" />
      <path d="M28 30 L36 42 L28 36 Z" fill="#e53935" />
      <circle cx="24" cy="22" r="3" fill="#42a5f5" opacity="0.7" />
      <ellipse cx="24" cy="40" rx="4" ry="5" fill="#ff7043" opacity="0.9" />
      <ellipse cx="24" cy="42" rx="2" ry="3" fill="#ffeb3b" />
    </svg>
  )
}

export function SpeakerVentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 56" fill="none" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x="4" y={4 + i * 6.5} width="16" height="3" rx="1" fill="#3a3028" opacity="0.8" />
      ))}
    </svg>
  )
}
