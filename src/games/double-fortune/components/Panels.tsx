import { BET_AMOUNTS, formatMoney } from '../constants/gameConfig'
import styles from '../styles/doubleFortune.module.css'

type BetProps = {
  open: boolean
  bet: number
  onClose: () => void
  onConfirm: (amount: number) => void
}

export function BetOptionsSheet({ open, bet, onClose, onConfirm }: BetProps) {
  if (!open) return null
  const amounts = [...BET_AMOUNTS]
  const max = amounts[amounts.length - 1]!

  return (
    <div className={styles.sheetOverlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.sheetHead}>
          <span>Bet Options</span>
          <button type="button" className={styles.sheetClose} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className={styles.betCols}>
          <div className={styles.betColHead}>
            <span>Bet Amount</span>
          </div>
          <div className={styles.betScroll}>
            {amounts.map((amount) => {
              const active = amount === bet
              return (
                <button
                  key={amount}
                  type="button"
                  className={`${styles.betRow} ${active ? styles.betRowActive : ''}`}
                  onClick={() => onConfirm(amount)}
                >
                  <span className={styles.betAmt}>{formatMoney(amount)}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className={styles.sheetActions}>
          <button type="button" className={styles.btnMax} onClick={() => onConfirm(max)}>
            Max Bet
          </button>
          <button type="button" className={styles.btnConfirm} onClick={onClose}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

type AutoProps = {
  open: boolean
  options: readonly number[]
  onClose: () => void
  onStart: (n: number) => void
}

export function AutoSpinSheet({ open, options, onClose, onStart }: AutoProps) {
  if (!open) return null
  return (
    <div className={styles.sheetOverlay} onClick={onClose}>
      <div className={`${styles.sheet} ${styles.sheetAuto}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.sheetHead}>
          <span>Auto Spin</span>
          <button type="button" className={styles.sheetClose} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className={styles.autoLabel}>Number of Auto Spins</p>
        <div className={styles.autoOpts}>
          {options.map((n) => (
            <button key={n} type="button" className={styles.autoOpt} onClick={() => onStart(n)}>
              {n}
            </button>
          ))}
        </div>
        <button type="button" className={styles.btnConfirm} onClick={() => onStart(options[0]!)}>
          Start
        </button>
      </div>
    </div>
  )
}
