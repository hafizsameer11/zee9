import { useState } from 'react'
import ps from '../../../styles/premiumScreen.module.css'
import styles from './WithdrawScreen.module.css'

type Props = {
  onClose: () => void
}

const AMOUNTS = ['300', '600', '1,000', '3,000', '5,000', '10,000', 'Other']

export default function WithdrawScreen({ onClose }: Props) {
  const [amount, setAmount] = useState('300')

  return (
    <div className={ps.overlay}>
      <div className={ps.screen}>
        <header className={ps.header}>
          <button type="button" className={ps.back} onClick={onClose} aria-label="Back">↩</button>
          <h1 className={ps.title}>Withdraw</h1>
          <div className={ps.headerRight}>
            <span className={ps.promo}>
              Win 10MRs just need 500Rs <u>CLICK HERE</u>
            </span>
            <button type="button" className={ps.hdrIcon} aria-label="Support">🎧</button>
            <button type="button" className={ps.hdrIcon} aria-label="Alerts">❗</button>
            <button type="button" className={ps.hdrIcon} aria-label="History">📋</button>
          </div>
        </header>

        <div className={ps.balanceStrip}>
          <div className={ps.balItem}>
            <span>Balance</span>
            <div className={ps.balPill}>
              <span className={ps.coin}>🪙</span> 0
            </div>
          </div>
          <div className={ps.balItem}>
            <span>Eligible Withdrawal</span>
            <div className={ps.balPill}>
              <span className={ps.coin}>🪙</span> 0
              <span className={styles.info}>ⓘ</span>
            </div>
          </div>
        </div>

        <div className={styles.main}>
          <div className={styles.left}>
            <p className={ps.sectionTitle}>
              <span className={styles.sectionIcon}>👤</span> Withdraw To
            </p>
            <div className={styles.accountCard}>
              <div className={styles.accGlow} aria-hidden />
              <span className={styles.accType}>Jazz Cash</span>
              <span className={styles.accNum}>**** ***4 274</span>
              <span className={styles.accCheck}>✓</span>
            </div>
            <button type="button" className={styles.addAcc}>+ Account</button>
          </div>

          <div className={styles.right}>
            <p className={ps.sectionTitle}>
              <span className={styles.sectionIcon}>🪙</span> Withdraw amount
            </p>
            <div className={`${ps.chipGrid} ${styles.amountGrid}`}>
              {AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`${ps.chip} ${amount === a ? ps.chipActive : ''}`}
                  onClick={() => setAmount(a)}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className={styles.rightFooter}>
              <span className={styles.fee}>Fee rate: Limited free</span>
              <button type="button" className={ps.goldBtn}>Withdraw</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
