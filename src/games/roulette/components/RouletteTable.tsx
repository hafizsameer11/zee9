import { useCallback } from 'react'
import type { BetSelection, BetType } from '../constants/rouletteConfig'
import type { CellAggregate } from '../utils/payoutCalculator'
import { TABLE_NUMBERS, colorOfNumber } from '../utils/rouletteNumbers'
import BettingCell from './BettingCell'
import styles from './RouletteTable.module.css'

export type PlaceFromCell = (input: {
  type: BetType
  selection: BetSelection
  cellKey: string
}) => void

type Props = {
  byCell: Map<string, CellAggregate>
  botByCell?: Map<string, CellAggregate>
  disabled: boolean
  winningNumber: number | null
  showOutcome: boolean
  onPlace: PlaceFromCell
}

function cellWins(cellKey: string, win: number | null): boolean {
  if (win == null) return false
  if (cellKey === `n-${win}`) return true
  if (cellKey === 'red') return colorOfNumber(win) === 'red'
  if (cellKey === 'black') return colorOfNumber(win) === 'black'
  if (cellKey === 'odd') return win !== 0 && win % 2 === 1
  if (cellKey === 'even') return win !== 0 && win % 2 === 0
  if (cellKey === 'low') return win >= 1 && win <= 18
  if (cellKey === 'high') return win >= 19 && win <= 36
  if (cellKey === 'dozen-1') return win >= 1 && win <= 12
  if (cellKey === 'dozen-2') return win >= 13 && win <= 24
  if (cellKey === 'dozen-3') return win >= 25 && win <= 36
  if (cellKey === 'col-1') return win > 0 && win % 3 === 1
  if (cellKey === 'col-2') return win > 0 && win % 3 === 2
  if (cellKey === 'col-3') return win > 0 && win % 3 === 0
  return false
}

export default function RouletteTable({
  byCell,
  botByCell,
  disabled,
  winningNumber,
  showOutcome,
  onPlace,
}: Props) {
  const handle = useCallback(
    (cellKey: string) => {
      if (cellKey.startsWith('n-')) {
        const n = Number(cellKey.slice(2))
        onPlace({ type: 'straight', selection: n, cellKey })
        return
      }
      const map: Record<string, { type: BetType; selection: BetSelection }> = {
        red: { type: 'red', selection: 'red' },
        black: { type: 'black', selection: 'black' },
        odd: { type: 'odd', selection: 'odd' },
        even: { type: 'even', selection: 'even' },
        low: { type: 'low', selection: 'low' },
        high: { type: 'high', selection: 'high' },
        'dozen-1': { type: 'dozen', selection: 1 },
        'dozen-2': { type: 'dozen', selection: 2 },
        'dozen-3': { type: 'dozen', selection: 3 },
        'col-1': { type: 'column', selection: 1 },
        'col-2': { type: 'column', selection: 2 },
        'col-3': { type: 'column', selection: 3 },
      }
      const m = map[cellKey]
      if (m) onPlace({ ...m, cellKey })
    },
    [onPlace],
  )

  const outcomeProps = (key: string) => {
    if (!showOutcome || winningNumber == null) return {}
    const win = cellWins(key, winningNumber)
    const has = byCell.has(key) || !!botByCell?.has(key)
    return {
      winning: win,
      losing: has && !win,
    }
  }

  const cell = (
    key: string,
    label: string,
    color: 'red' | 'black' | 'green' | 'felt' | 'gold',
    className?: string,
  ) => (
    <BettingCell
      key={key}
      label={label}
      cellKey={key}
      color={color}
      className={className}
      disabled={disabled}
      aggregate={byCell.get(key)}
      botAggregate={botByCell?.get(key)}
      onBet={handle}
      {...outcomeProps(key)}
    />
  )

  return (
    <div className={styles.board} data-disabled={disabled || undefined}>
      <div className={styles.grid}>
        {cell('n-0', '0', 'green', styles.zero)}
        <div className={styles.numbers}>
          {TABLE_NUMBERS.flatMap((row) =>
            row.map((n) => {
              const key = `n-${n}`
              return cell(key, String(n), colorOfNumber(n) === 'red' ? 'red' : 'black')
            }),
          )}
        </div>
        <div className={styles.columns}>
          {([3, 2, 1] as const).map((col) => cell(`col-${col}`, '2:1', 'gold'))}
        </div>
        <div className={styles.dozens}>
          {cell('dozen-1', '1st 12', 'felt')}
          {cell('dozen-2', '2nd 12', 'felt')}
          {cell('dozen-3', '3rd 12', 'felt')}
        </div>
        <div className={styles.outside}>
          {cell('low', '1–18', 'felt')}
          {cell('even', 'EVEN', 'felt')}
          {cell('red', 'RED', 'red')}
          {cell('black', 'BLACK', 'black')}
          {cell('odd', 'ODD', 'felt')}
          {cell('high', '19–36', 'felt')}
        </div>
      </div>
    </div>
  )
}
