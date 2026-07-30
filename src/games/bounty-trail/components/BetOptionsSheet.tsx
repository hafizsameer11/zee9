import { useMemo, useState } from 'react'
import { BET_AMOUNTS, formatMoney } from '../constants/gameConfig'
import styles from '../styles/bountyTrail.module.css'

type Props = {
  bet: number
  balance: number
  onConfirm: (amount: number) => void
  onClose: () => void
  onMax: () => void
}

export default function BetOptionsSheet({ bet, balance, onConfirm, onClose, onMax }: Props) {
  const amounts = useMemo(() => [...BET_AMOUNTS], [])
  const [draft, setDraft] = useState(bet)

  return (
    <div className={styles.dim} onClick={onClose} role="presentation">
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Bet Options">
        <div className={styles.sheetHead}>
          <div className={styles.sheetTitle}>Bet Options</div>
          <button type="button" className={styles.closeX} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.modalBody} style={{ marginBottom: 8 }}>
          Balance {formatMoney(balance)} · Selected {formatMoney(draft)}
        </div>

        <div className={styles.betList}>
          {amounts.map((v) => (
            <button
              key={v}
              type="button"
              className={`${styles.betRow} ${draft === v ? styles.betRowOn : ''}`}
              onClick={() => setDraft(v)}
            >
              <span>{formatMoney(v)}</span>
            </button>
          ))}
        </div>

        <div className={styles.sheetActions}>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={() => {
              onMax()
              onClose()
            }}
          >
            Max
          </button>
          <button
            type="button"
            className={styles.btnGold}
            onClick={() => {
              onConfirm(draft)
              onClose()
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
