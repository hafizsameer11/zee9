/** Illustrated rocket / comet for CRASH */

export function CrashRocket({ size = 56, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <div
        className="absolute -inset-3 rounded-full blur-lg pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(94,160,242,0.55), transparent 70%)' }}
        aria-hidden
      />
      <div
        className="top-full left-1/2 -translate-x-1/2 rounded-full absolute pointer-events-none blur-[3px]"
        style={{
          width: size * 0.3,
          height: size * 1.2,
          background: 'linear-gradient(to bottom, #5ea0f2, #ffd54f 40%, rgba(255,112,67,0))',
        }}
        aria-hidden
      />
      <svg viewBox="0 0 56 56" width={size} height={size} className="relative -rotate-45 drop-shadow-[0_0_12px_rgba(94,160,242,0.8)]">
        <defs>
          <radialGradient id="crashRocketBody" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f4d98a" />
            <stop offset="45%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#c41e3a" />
          </radialGradient>
          <linearGradient id="crashRocketNose" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5ea0f2" />
            <stop offset="100%" stopColor="#1565c0" />
          </linearGradient>
        </defs>
        <path d="M28 6 L34 18 L22 18 Z" fill="url(#crashRocketNose)" />
        <rect x="22" y="18" width="12" height="24" rx="4" fill="url(#crashRocketBody)" />
        <path d="M22 36 L14 48 L22 42 Z" fill="#1565c0" />
        <path d="M34 36 L42 48 L34 42 Z" fill="#1565c0" />
        <ellipse cx="28" cy="28" rx="3.5" ry="5" fill="rgba(255,255,255,0.4)" />
        <circle cx="28" cy="44" r="4" fill="#ff7043" />
        <circle cx="28" cy="44" r="2" fill="#ffd54f" />
      </svg>
    </div>
  )
}

export function crashHistoryChipClass(mult: number): string {
  if (mult < 2) return 'bg-[#c41e3a]/15 text-[#e5546c]'
  if (mult < 5) return 'bg-[#1bd6a0]/15 text-[#1bd6a0]'
  return 'bg-[#1565c0]/20 text-[#5ea0f2]'
}
