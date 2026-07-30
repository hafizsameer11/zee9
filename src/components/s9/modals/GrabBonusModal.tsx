import { useState } from 'react'
import S9ModalShell from './S9ModalShell'
import styles from './GrabBonusModal.module.css'

type Props = { onClose: () => void; onClaim?: () => Promise<void> | void }

export default function GrabBonusModal({ onClose, onClaim }: Props) {
  const [claimed, setClaimed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const grab = async () => {
    if (claimed || busy) return
    setBusy(true)
    setMsg(null)
    try {
      await onClaim?.()
      setClaimed(true)
    } catch (e: any) {
      setMsg(e?.message || 'Could not claim')
    } finally {
      setBusy(false)
    }
  }

  return (
    <S9ModalShell title="Grab Bonus" onClose={onClose} hideSupport>
      <div className={styles.body}>
        <div className={styles.envelope}>
          <span className={styles.icon}>🧧</span>
          <p className={styles.amount}>{claimed ? 'Claimed' : 'Daily'}</p>
        </div>
        <p className={styles.hint}>
          {claimed ? 'Daily open bonus claimed!' : 'Tap to claim your daily open bonus'}
        </p>
        {msg && <p style={{ color: '#ff8a80', fontSize: 12 }}>{msg}</p>}
        <button
          type="button"
          className={`${styles.grabBtn} ${claimed ? styles.grabbed : ''}`}
          onClick={() => void grab()}
          disabled={claimed || busy}
        >
          {claimed ? 'CLAIMED ✓' : busy ? '…' : 'GRAB NOW'}
        </button>
      </div>
    </S9ModalShell>
  )
}
