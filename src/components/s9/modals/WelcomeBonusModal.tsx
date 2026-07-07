import S9ModalShell from './S9ModalShell'
import styles from './WelcomeBonusModal.module.css'

type Props = { onClose: () => void; onClaim?: () => void }

export default function WelcomeBonusModal({ onClose, onClaim }: Props) {
  return (
    <S9ModalShell title="Welcome Bonus" onClose={onClose} hideSupport>
      <div className={styles.body}>
        <div className={styles.banner}>
          <span className={styles.gift}>🎁</span>
          <h3>100% First Deposit Bonus</h3>
          <p>Deposit now and get up to Rs 10,000 bonus!</p>
        </div>
        <div className={styles.timer}>
          <span>⏱ Expires in</span>
          <strong>2d 23h 45m</strong>
        </div>
        <ul className={styles.rules}>
          <li>Minimum deposit: Rs 100</li>
          <li>Maximum bonus: Rs 10,000</li>
          <li>Wagering requirement: 5x</li>
        </ul>
        <button
          type="button"
          className={styles.claimBtn}
          onClick={() => { onClaim?.(); onClose() }}
        >
          CLAIM NOW
        </button>
      </div>
    </S9ModalShell>
  )
}
