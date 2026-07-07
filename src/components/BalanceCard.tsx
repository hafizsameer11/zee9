import { DEMO_BALANCE, CURRENCY } from '../data/games'
import styles from './BalanceCard.module.css'

type Props = {
  onDeposit: () => void
  onWithdraw: () => void
}

export default function BalanceCard({ onDeposit, onWithdraw }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.decor} aria-hidden="true" />
      <div className={styles.decor2} aria-hidden="true" />

      <p className={styles.label}>Your Balance</p>
      <p className={styles.amount}>
        <span className={styles.currency}>{CURRENCY}</span>
        {' '}
        {DEMO_BALANCE.toFixed(2)}
      </p>

      <div className={styles.actions}>
        <button type="button" className={styles.actionBtn} onClick={onDeposit}>
          <span className={styles.iconCircle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
          Deposit
        </button>
        <button type="button" className={styles.actionBtn} onClick={onWithdraw}>
          <span className={styles.iconCircle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
          Withdraw
        </button>
      </div>
    </div>
  )
}
