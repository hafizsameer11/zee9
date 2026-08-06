import type { CSSProperties } from 'react'
import { formatChipAmount } from '../lib/formatChipAmount'
import styles from './upDownClassic.module.css'

const B = '/games/7up-down/chips'

export type ChipColor = 'green' | 'red' | 'blue' | 'white' | 'gold' | 'black' | 'brown'

export const CHIP_IMG: Record<ChipColor, string> = {
  green: `${B}/chip-green.png`,
  red: `${B}/chip-red.png`,
  blue: `${B}/chip-blue.png`,
  white: `${B}/chip-white.png`,
  gold: `${B}/chip-gold.png`,
  black: `${B}/chip-black.png`,
  brown: `${B}/chip-brown.png`,
}

const TRAY_CHIP_CLASS: Record<number, string> = {
  10: styles.trayChipWhite!,
  50: styles.trayChipBlack!,
  100: styles.trayChipGrey!,
  500: styles.trayChipBrown!,
  1000: styles.trayChipGold!,
  2000: styles.trayChipGold!,
  5000: styles.trayChipBlack!,
  10000: styles.trayChipBrown!,
}

export function chipColorForValue(value: number): ChipColor {
  if (value >= 10000) return 'black'
  if (value >= 5000) return 'brown'
  if (value >= 2000) return 'gold'
  if (value >= 1000) return 'black'
  if (value >= 500) return 'brown'
  if (value >= 100) return 'white'
  if (value >= 50) return 'red'
  return 'green'
}

export function chipLabel(value: number): string {
  return formatChipAmount(value)
}

/** Round poker chip image for table / flying animation */
export function TableChipImg({
  color,
  value,
  size = 28,
  style,
  className = '',
}: {
  color: ChipColor
  value: number
  size?: number
  style?: CSSProperties
  className?: string
}) {
  return (
    <span
      className={`${styles.realChipWrap} ${className}`}
      style={{ width: size, height: size, ...style }}
      aria-label={chipLabel(value)}
    >
      <img
        src={CHIP_IMG[color]}
        alt=""
        draggable={false}
        className={styles.realChipImg}
      />
      <span className={styles.realChipValue}>{chipLabel(value)}</span>
    </span>
  )
}

/** Bottom tray chip — CSS round chips (always render correctly) */
export function SelectorChip({
  value,
  selected,
  onClick,
}: {
  value: number
  selected: boolean
  onClick: () => void
}) {
  const chipClass = TRAY_CHIP_CLASS[value] ?? styles.trayChipWhite!

  return (
    <button
      type="button"
      className={`${styles.selectorChip} ${selected ? styles.selectorChipOn : ''}`}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`Bet ${chipLabel(value)}`}
    >
      <span className={`${styles.trayChip} ${chipClass}`}>
        <span className={styles.trayChipRing} aria-hidden />
        <span className={styles.trayChipVal}>{chipLabel(value)}</span>
      </span>
    </button>
  )
}

/** Small coin icon for balance display */
export function CoinIcon({ size = 14 }: { size?: number }) {
  return (
    <img
      src={CHIP_IMG.gold}
      alt=""
      draggable={false}
      className={styles.coinIcon}
      style={{ width: size, height: size }}
    />
  )
}
