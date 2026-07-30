import { MODAL } from '../constants/assetManifest'
import styles from '../styles/aeroX.module.css'

type Props = {
  onClose: () => void
  onClaim?: () => void
}

const QUESTS = [
  { title: 'Play 5 rounds', desc: 'Complete five Double Crash flights', reward: 50, progress: 0.4 },
  { title: 'Cash out 3 wins', desc: 'Successfully escape three times', reward: 80, progress: 0.2 },
  { title: 'Reach 5.00x', desc: 'Ride a multiplier to 5x or higher', reward: 120, progress: 0 },
  { title: 'Weekly orbit', desc: 'Play every day this week', reward: 200, progress: 0.15 },
]

export default function QuestModal({ onClose, onClaim }: Props) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.questModal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className={styles.questLeft}>
          <div className={styles.questRewardTitle}>
            Maximum Daily Free Rewards: <strong>800</strong>
          </div>
          <img className={styles.questChest} src={MODAL.questChest} alt="" />
          <button type="button" className={styles.questGet} onClick={onClaim}>
            GET
          </button>
          <p className={styles.questNote}>Quests refresh daily at 05:00</p>
        </div>
        <div className={styles.questRight}>
          <h3>QUESTS</h3>
          <div className={styles.questList}>
            {QUESTS.map((q) => (
              <div key={q.title} className={styles.questCard}>
                <div className={styles.questInfo}>
                  <strong>{q.title}</strong>
                  <span>{q.desc}</span>
                  <div className={styles.questBar}>
                    <i style={{ width: `${q.progress * 100}%` }} />
                  </div>
                </div>
                <div className={styles.questPrize}>+{q.reward}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
