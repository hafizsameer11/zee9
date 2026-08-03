import type { CSSProperties } from 'react'
import { ASSET, type BrandId } from '../constants/gameConfig'
import styles from '../styles/carRoulette.module.css'

type Props = {
  history: Array<{ id: number; brand: BrandId }>
  style: CSSProperties
}

export default function HistoryTower({ history, style }: Props) {
  const slots = history.slice(0, 6)
  return (
    <aside className={styles.tower} style={style} aria-label="Recent results">
      <div className={styles.towerTitle}>RECENT</div>
      {slots.map((h, i) => (
        <div key={h.id} className={`${styles.towerSlot} ${i === 0 ? styles.towerNew : ''}`}>
          {i === 0 && <span className={styles.towerBadge}>NEW</span>}
          <img src={ASSET.emblem(h.brand, true)} alt="" draggable={false} />
        </div>
      ))}
      {Array.from({ length: Math.max(0, 6 - slots.length) }).map((_, i) => (
        <div key={`empty-${i}`} className={styles.towerSlot} />
      ))}
    </aside>
  )
}
