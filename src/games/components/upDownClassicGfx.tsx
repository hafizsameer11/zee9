import type { CSSProperties } from 'react'
import type { UpDownChoice } from '../engines/dice'
import styles from './upDownClassic.module.css'

export const CHIP_DENOMS = [10, 50, 100, 500, 1000] as const
export type ChipDenom = (typeof CHIP_DENOMS)[number]

const CHIP_COLOR: Record<ChipDenom, string> = {
  10: styles.pokerChipChip10!,
  50: styles.pokerChipChip50!,
  100: styles.pokerChipChip100!,
  500: styles.pokerChipChip500!,
  1000: styles.pokerChipChip1k!,
}

const CHIP_SIZE: Record<string, string> = {
  sm: styles.pokerChipSm!,
  md: styles.pokerChipMd!,
  lg: styles.pokerChipLg!,
  xl: styles.pokerChipXl!,
}

export function chipLabel(value: number): string {
  return value >= 1000 ? '1K' : String(value)
}

export function zoneForSum(sum: number): UpDownChoice {
  if (sum < 7) return 'down'
  if (sum > 7) return 'up'
  return 'seven'
}

export function historyColorClass(sum: number): string {
  if (sum === 7) return styles.histSeven!
  if (sum < 7) return styles.histDown!
  return styles.histUp!
}

export function PokerChip({
  value,
  size = 'md',
  className = '',
  style,
}: {
  value: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  style?: CSSProperties
}) {
  const denom = (CHIP_DENOMS.includes(value as ChipDenom) ? value : 100) as ChipDenom
  return (
    <div
      className={`${styles.pokerChip} ${CHIP_SIZE[size]} ${CHIP_COLOR[denom]} ${className}`}
      style={style}
    >
      <span className={styles.pokerChipRing} />
      <span className={styles.pokerChipLabel}>{chipLabel(value)}</span>
    </div>
  )
}

export function DiceShaker({ countdown, rolling }: { countdown: number; rolling: boolean }) {
  const max = 12
  const progress = Math.max(0, Math.min(1, countdown / max))
  const circumference = 2 * Math.PI * 28
  const dash = circumference * progress

  return (
    <div className={`${styles.diceShaker} ${rolling ? styles.diceShakerShake : ''}`}>
      <svg className={styles.diceShakerRing} viewBox="0 0 72 72" aria-hidden>
        <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="5" />
        <circle
          cx="36"
          cy="36"
          r="28"
          fill="none"
          stroke="#f5c518"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 36 36)"
        />
      </svg>
      <div className={styles.diceShakerBody}>
        <div className={styles.diceShakerLid} />
        <div className={styles.diceShakerBase} />
      </div>
      <span className={styles.diceShakerCount}>{countdown}</span>
    </div>
  )
}

export function PlayerAvatar({
  name,
  balance,
  badge,
  highlight,
  seatRef,
}: {
  name: string
  balance: number
  badge?: 'WINNER' | 'LUCKY'
  highlight?: boolean
  seatRef?: (el: HTMLDivElement | null) => void
}) {
  const initials = name.slice(0, 2).toUpperCase()
  const hue = (name.charCodeAt(0) * 17 + name.charCodeAt(name.length - 1) * 7) % 360

  return (
    <div className={`${styles.playerSeat} ${highlight ? styles.playerSeatSelf : ''}`} ref={seatRef}>
      {badge && (
        <span
          className={`${styles.playerSeatBadge} ${badge === 'WINNER' ? styles.playerSeatBadgeWinner : styles.playerSeatBadgeLucky}`}
        >
          {badge === 'WINNER' ? '👑 WINNER' : 'LUCKY'}
        </span>
      )}
      <div className={styles.playerSeatAvatar} style={{ '--avatar-hue': hue } as CSSProperties}>
        <span>{initials}</span>
      </div>
      <div className={styles.playerSeatName}>{name}</div>
      <div className={styles.playerSeatBalance}>
        <ChipIconSmall />
        {balance.toLocaleString()}
      </div>
    </div>
  )
}

function ChipIconSmall() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
      <circle cx="8" cy="8" r="7" fill="#e8b830" stroke="#fff" strokeWidth="1" />
      <circle cx="8" cy="8" r="4" fill="#c41e3a" />
    </svg>
  )
}

export function TableChipPile({
  chips,
}: {
  chips: { id: string; value: number; x: number; y: number; rot: number }[]
}) {
  return (
    <>
      {chips.map((c) => (
        <PokerChip
          key={c.id}
          value={c.value}
          size="sm"
          className={styles.tableChipPile}
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            transform: `translate(-50%, -50%) rotate(${c.rot}deg)`,
          }}
        />
      ))}
    </>
  )
}

export function FlyingChipSprite({
  value,
  fromX,
  fromY,
  toX,
  toY,
  delay = 0,
  onDone,
}: {
  value: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  delay?: number
  onDone?: () => void
}) {
  return (
    <div
      className={styles.flyingChip}
      style={
        {
          '--from-x': `${fromX}px`,
          '--from-y': `${fromY}px`,
          '--to-x': `${toX}px`,
          '--to-y': `${toY}px`,
          '--delay': `${delay}ms`,
        } as CSSProperties
      }
      onAnimationEnd={onDone}
    >
      <PokerChip value={value} size="sm" />
    </div>
  )
}

export {
  BackChevronIcon,
  CartWagonIcon,
  MenuDiamondsIcon,
  PromoPinIcon,
  SocialGroupIcon,
} from './crashClassicGfx'
