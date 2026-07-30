import { memo } from 'react'
import type { CellAggregate } from '../utils/payoutCalculator'
import { ASSET } from '../constants/rouletteConfig'
import styles from './BettingCell.module.css'

type Props = {
  label: string
  cellKey: string
  color?: 'red' | 'black' | 'green' | 'felt' | 'gold'
  className?: string
  disabled?: boolean
  winning?: boolean
  losing?: boolean
  aggregate?: CellAggregate
  botAggregate?: CellAggregate
  onBet: (cellKey: string) => void
}

function formatChip(n: number) {
  if (n >= 1000) return `${Math.round(n / 100) / 10}K`.replace('.0K', 'K')
  return String(n)
}

function BettingCell({
  label,
  cellKey,
  color = 'felt',
  className = '',
  disabled,
  winning,
  losing,
  aggregate,
  botAggregate,
  onBet,
}: Props) {
  const shown = aggregate?.amount
    ? aggregate
    : botAggregate?.amount
      ? botAggregate
      : undefined
  return (
    <button
      type="button"
      data-bet={cellKey}
      className={[
        styles.cell,
        styles[color],
        winning ? styles.winning : '',
        losing ? styles.losing : '',
        shown ? styles.hasChip : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled}
      onClick={() => onBet(cellKey)}
      aria-label={`Bet ${label}`}
    >
      <span className={styles.label}>{label}</span>
      {shown && shown.amount > 0 && (
        <span className={styles.chipStack}>
          <span className={styles.chipVisual}>
            <img src={ASSET.chip(shown.lastChip, true)} alt="" draggable={false} />
            <span className={styles.chipValue}>{formatChip(shown.amount)}</span>
          </span>
        </span>
      )}
    </button>
  )
}

export default memo(BettingCell)
