import type { CSSProperties } from 'react'
import { ASSET, BETTING_SECONDS, type AnimalId } from '../constants/gameConfig'
import styles from '../styles/zooRoulette.module.css'

type Props = {
  countdown: number
  warning: boolean
  spinning?: boolean
  statusText: string
  style: CSSProperties
}

export function CountdownOrnament({ countdown, warning, spinning, statusText, style }: Props) {
  const pct = spinning
    ? 100
    : Math.max(0, Math.min(100, (countdown / BETTING_SECONDS) * 100))
  const ring = spinning
    ? '#ffd24a'
    : warning
      ? countdown <= 1
        ? '#ff3b2f'
        : '#ffb02e'
      : '#5ad878'

  return (
    <div className={styles.timer} style={style}>
      <img className={styles.timerBezel} src={ASSET.ui('timer-bezel')} alt="" draggable={false} />
      <div
        className={`${styles.timerRing} ${warning ? styles.timerWarn : ''}`}
        style={{ ['--pct' as string]: pct, ['--ring' as string]: ring }}
      />
      <div className={styles.timerNum}>{spinning ? 'GO' : countdown}</div>
      <div className={styles.timerLabel}>{statusText}</div>
    </div>
  )
}

type HistoryProps = {
  history: Array<{ id: number; animal: AnimalId }>
  style: CSSProperties
}

export default function HistoryTower({ history, style }: HistoryProps) {
  const slots = history.slice(0, 6)
  return (
    <aside className={styles.tower} style={style} aria-label="Recent results">
      <img className={styles.towerBg} src={ASSET.ui('tower')} alt="" draggable={false} />
      <div className={styles.towerTitle}>RECORD</div>
      <div className={styles.towerSlots}>
        {slots.map((h, i) => (
          <div key={h.id} className={`${styles.towerSlot} ${i === 0 ? styles.towerNew : ''}`}>
            {i === 0 && <span className={styles.towerBadge}>NEW</span>}
            <img src={ASSET.animal(h.animal, 'sm')} alt="" draggable={false} />
          </div>
        ))}
        {Array.from({ length: Math.max(0, 6 - slots.length) }).map((_, i) => (
          <div key={`empty-${i}`} className={styles.towerSlot} aria-hidden />
        ))}
      </div>
    </aside>
  )
}
