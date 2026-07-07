import { useState } from 'react'
import S9ModalShell from './S9ModalShell'
import styles from './GrabBonusModal.module.css'

type Props = { onClose: () => void }

export default function GrabBonusModal({ onClose }: Props) {
  const [claimed, setClaimed] = useState(false)

  const grab = () => {
    if (claimed) return
    setClaimed(true)
  }

  return (
    <S9ModalShell title="Grab Bonus" onClose={onClose} hideSupport>
      <div className={styles.body}>
        <div className={styles.envelope}>
          <span className={styles.icon}>🧧</span>
          <p className={styles.amount}>{claimed ? 'Rs 50' : '???'}</p>
        </div>
        <p className={styles.hint}>
          {claimed ? 'Bonus added to your wallet!' : 'Tap to grab your daily red envelope'}
        </p>
        <button
          type="button"
          className={`${styles.grabBtn} ${claimed ? styles.grabbed : ''}`}
          onClick={grab}
          disabled={claimed}
        >
          {claimed ? 'CLAIMED ✓' : 'GRAB NOW'}
        </button>
      </div>
    </S9ModalShell>
  )
}
