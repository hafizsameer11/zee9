import S9ModalShell from './S9ModalShell'
import styles from './RebateModal.module.css'

type Props = { onClose: () => void }

export default function RebateModal({ onClose }: Props) {
  return (
    <S9ModalShell title="Rebate" onClose={onClose} hideSupport>
      <div className={styles.body}>
        <div className={styles.hero}>
          <span>🏺</span>
          <h3>Daily Rebate</h3>
          <p>Get cashback on your losses every day</p>
        </div>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <strong>0%</strong>
            <small>Current Rate</small>
          </div>
          <div className={styles.stat}>
            <strong>Rs 0</strong>
            <small>Today&apos;s Rebate</small>
          </div>
          <div className={styles.stat}>
            <strong>Rs 0</strong>
            <small>Total Claimed</small>
          </div>
        </div>
        <button type="button" className={styles.claimBtn} disabled>CLAIM REBATE</button>
        <p className={styles.note}>Play games to earn rebate. VIP members get higher rates.</p>
      </div>
    </S9ModalShell>
  )
}
