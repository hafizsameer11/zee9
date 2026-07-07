/** Aviator reference-style UI artwork */

/** Propeller plane — frame A (wings level) */
export function AviatorPlaneFrame1({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 40" fill="none" aria-hidden>
      <path
        d="M2 22 L14 20 L18 14 L22 20 L40 18 L58 16 L52 22 L40 24 L38 30 L34 24 L22 26 L14 30 L10 24 Z"
        fill="#e9152d"
      />
      <path d="M18 14 L22 8 L26 14 L22 20 Z" fill="#e9152d" />
      <ellipse cx="22" cy="9" rx="2.5" ry="5" fill="#ff3355" opacity="0.85" />
      <path d="M38 24 L44 27 L40 24 Z" fill="#c41025" />
    </svg>
  )
}

/** Propeller plane — frame B (wings tilted, propeller blur) */
export function AviatorPlaneFrame2({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 40" fill="none" aria-hidden>
      <path
        d="M2 22 L14 21 L18 15 L22 21 L40 19 L58 17 L52 23 L40 25 L38 31 L34 25 L22 27 L14 31 L10 25 Z"
        fill="#e9152d"
      />
      <path d="M18 15 L22 9 L26 15 L22 21 Z" fill="#ff4466" />
      <ellipse cx="22" cy="9" rx="5" ry="2" fill="#ff6688" opacity="0.7" />
      <path d="M38 25 L44 28 L40 25 Z" fill="#c41025" />
    </svg>
  )
}

export function AviatorPlaneIcon({ className, frame = 0 }: { className?: string; frame?: number }) {
  return frame % 2 === 0 ? (
    <AviatorPlaneFrame1 className={className} />
  ) : (
    <AviatorPlaneFrame2 className={className} />
  )
}

export function ShieldFairIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 2 L17 5 V10 C17 14 14 17 10 18 C6 17 3 14 3 10 V5 Z"
        fill="#28c840"
        stroke="#1a9e30"
        strokeWidth="1"
      />
      <path d="M7 10 L9 12 L13 8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ClockRewindIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 5 V8 L10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M3 3 L1 5 L3 5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export {
  BackChevronIcon,
  CartWagonIcon,
  MenuDiamondsIcon,
  PromoPinIcon,
} from './minesClassicGfx'
