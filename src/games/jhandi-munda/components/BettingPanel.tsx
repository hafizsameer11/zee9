import { memo, useMemo } from 'react'
import type { JhandiSymbol } from '../../engines/dice'
import { CHIP_IMG_SM, historyCount, symbolWatermark } from '../assets'
import { buildPiles, formatAmount } from '../chips'
import styles from '../jhandiMunda.module.css'

type Props = {
  symbol: JhandiSymbol
  pot: number
  myBet: number
  canBet: boolean
  won: boolean
  dimmed: boolean
  history: Record<JhandiSymbol, number>[]
  onBet: (s: JhandiSymbol) => void
  registerRef: (s: JhandiSymbol, el: HTMLButtonElement | null) => void
}

function BettingPanel({
  symbol,
  pot,
  myBet,
  canBet,
  won,
  dimmed,
  history,
  onBet,
  registerRef,
}: Props) {
  const piles = useMemo(() => buildPiles(symbol, pot), [symbol, pot])
  const hist = history.slice(0, 5)

  return (
    <button
      type="button"
      className={`${styles.panel} ${won ? styles.panelWon : ''} ${dimmed ? styles.panelDimmed : ''}`}
      disabled={!canBet}
      onClick={() => onBet(symbol)}
      ref={(el) => registerRef(symbol, el)}
      aria-label={`Bet on ${symbol}`}
    >
      <img
        src={symbolWatermark(symbol)}
        alt=""
        className={styles.panelSymbol}
        draggable={false}
      />
      <span className={styles.panelTotals}>
        {formatAmount(pot)} / <span className={styles.panelMine}>{formatAmount(myBet)}</span>
      </span>
      <span className={styles.panelPiles}>
        {piles.map((p) => (
          <span key={p.key} className={styles.pile} style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            {p.chips.map((c, i) => (
              <img
                key={i}
                src={CHIP_IMG_SM[c.value]}
                alt=""
                draggable={false}
                className={styles.pileChip}
                style={{ bottom: i * 3, transform: `translateX(-50%) rotate(${c.rot}deg)`, zIndex: i }}
              />
            ))}
          </span>
        ))}
      </span>
      <span className={styles.panelHistory}>
        {hist.length === 0 ? (
          <img src={historyCount(0)} alt="" className={styles.histDot} draggable={false} />
        ) : (
          hist.map((h, i) => (
            <img
              key={i}
              src={historyCount(h[symbol])}
              alt=""
              className={i === 0 ? styles.histRecent : styles.histDot}
              draggable={false}
            />
          ))
        )}
      </span>
    </button>
  )
}

export default memo(BettingPanel)
