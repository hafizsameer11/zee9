import { useState } from 'react'
import { AUTO_SPIN_OPTIONS } from '../constants/gameConfig'
import styles from '../styles/bountyTrail.module.css'

type Props = {
  onStart: (count: number) => void
  onClose: () => void
}

export default function AutoSpinSheet({ onStart, onClose }: Props) {
  const [count, setCount] = useState<(typeof AUTO_SPIN_OPTIONS)[number]>(30)
  const [stopAnyWin, setStopAnyWin] = useState(false)
  const [stopBigWin, setStopBigWin] = useState(true)
  const [stopFeature, setStopFeature] = useState(true)

  return (
    <div className={styles.dim} onClick={onClose} role="presentation">
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Auto Spin">
        <div className={styles.sheetHead}>
          <div className={styles.sheetTitle}>Auto Spin</div>
          <button type="button" className={styles.closeX} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.betList}>
          {AUTO_SPIN_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              className={`${styles.betRow} ${count === n ? styles.betRowOn : ''}`}
              onClick={() => setCount(n)}
            >
              <span>{n} Spins</span>
            </button>
          ))}
        </div>

        <div className={styles.modalBody}>
          <label style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input type="checkbox" checked={stopAnyWin} onChange={(e) => setStopAnyWin(e.target.checked)} />
            Stop on any win
          </label>
          <label style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input type="checkbox" checked={stopBigWin} onChange={(e) => setStopBigWin(e.target.checked)} />
            Stop on big win
          </label>
          <label style={{ display: 'flex', gap: 8 }}>
            <input type="checkbox" checked={stopFeature} onChange={(e) => setStopFeature(e.target.checked)} />
            Stop on feature trigger
          </label>
        </div>

        <button type="button" className={styles.btnGold} style={{ width: '100%' }} onClick={() => onStart(count)}>
          Start Auto Spin ({count})
        </button>
      </div>
    </div>
  )
}
