import S9ModalShell from './S9ModalShell'
import { useConfig } from '../../../api/hooks'
import styles from './WelcomeBonusModal.module.css'

type Props = { onClose: () => void; onClaim?: () => void }

export default function WelcomeBonusModal({ onClose, onClaim }: Props) {
  const config = useConfig()
  const amount = config?.bonuses.dailyOpen ?? 15
  const wager = config?.wager.bonus ?? 5

  return (
    <S9ModalShell title="Daily Bonus" onClose={onClose} hideSupport>
      <div className={styles.body}>
        <div className={styles.banner}>
          <span className={styles.gift}>🎁</span>
          <h3>Daily Login Bonus</h3>
          <p>Claim Rs {amount} free bonus once per day!</p>
        </div>
        <ul className={styles.rules}>
          <li>Available once every 24 hours</li>
          {config?.bonuses.dailyOpen ? null : <li>Bonus amount set by admin</li>}
          <li>Wagering requirement: {wager}x bonus amount</li>
          <li>Bonus is credited to your bonus wallet until wager is met</li>
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
