import { useState } from 'react'
import styles from './LuckyWheelModal.module.css'

type Props = { onClose: () => void }

const SEGMENTS = [
  { label: 'Rs10000', emoji: '💰', color: '#1565c0' },
  { label: 'SP-70CC', emoji: '🏍️', color: '#c62828' },
  { label: 'Again', emoji: '🎫', color: '#f9a825' },
  { label: 'Rs1000', emoji: '💎', color: '#6a1b9a' },
  { label: 'MOBILE', emoji: '📱', color: '#2e7d32' },
  { label: 'Rs200', emoji: '💎', color: '#1565c0' },
  { label: 'Not winning', emoji: '😢', color: '#ad1457' },
  { label: 'Rs50', emoji: '💎', color: '#f9a825' },
  { label: 'LAPTOP', emoji: '💻', color: '#6a1b9a' },
  { label: '500RS', emoji: '🪙', color: '#c62828' },
]

const WINNERS = [
  { name: 'Muneeb', prize: 'Rs50' },
  { name: 'P6686238', prize: 'Rs10000' },
  { name: 'User_882', prize: 'Rs200' },
  { name: 'Ali_K', prize: 'MOBILE' },
]

export default function LuckyWheelModal({ onClose }: Props) {
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)

  const spin = () => {
    if (spinning) return
    setSpinning(true)
    const extra = 1800 + Math.random() * 360
    setRotation((r) => r + extra)
    setTimeout(() => setSpinning(false), 4000)
  }

  return (
    <div className={styles.overlay}>
      <button type="button" className={styles.close} onClick={onClose}>✕</button>

      <div className={styles.content}>
        <div className={styles.winList}>
          <h3>Winning List</h3>
          <ul>
            {WINNERS.map((w) => (
              <li key={w.name}>
                <span>{w.name}</span>
                <span>🪙 {w.prize}</span>
              </li>
            ))}
          </ul>
          <button type="button" className={styles.myPrize}>🎁 My Prize</button>
        </div>

        <div className={styles.wheelArea}>
          <div className={styles.title}>LUCKY WHEEL</div>
          <div className={styles.wheelWrap}>
            <div className={styles.pointer}>▼</div>
            <div
              className={styles.wheel}
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              {SEGMENTS.map((s, i) => (
                <div
                  key={s.label}
                  className={styles.segment}
                  style={{
                    transform: `rotate(${i * 36}deg)`,
                    background: s.color,
                  }}
                >
                  <span className={styles.segInner} style={{ transform: `rotate(${18}deg)` }}>
                    <span className={styles.segEmoji}>{s.emoji}</span>
                    <span className={styles.segLabel}>{s.label}</span>
                  </span>
                </div>
              ))}
            </div>
            <button type="button" className={styles.spinBtn} onClick={spin} disabled={spinning}>
              <span>SPIN</span>
              <small>0</small>
            </button>
          </div>

          <div className={styles.progress}>
            <p>Recharge 1000 for 1 Lucky Draw</p>
            <div className={styles.bar}>
              <div className={styles.fill} style={{ width: '0%' }} />
            </div>
            <div className={styles.barLabels}>
              <span>0</span>
              <span>1000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
