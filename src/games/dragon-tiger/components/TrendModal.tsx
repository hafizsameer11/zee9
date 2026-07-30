import type { Winner } from '../constants/gameConfig'
import styles from './TrendModal.module.css'

type Props = {
  open: boolean
  history: Winner[]
  onClose: () => void
}

export default function TrendModal({ open, history, onClose }: Props) {
  if (!open) return null

  const dragon = history.filter((h) => h === 'dragon').length
  const tiger = history.filter((h) => h === 'tiger').length
  const tie = history.filter((h) => h === 'tie').length
  const total = Math.max(1, history.length)
  const dPct = Math.round((dragon / total) * 100)
  const tPct = Math.round((tiger / total) * 100)
  const grid = history.slice(0, 60)

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div className={styles.modal} role="dialog" aria-label="Trend" onClick={(e) => e.stopPropagation()}>
        <div className={styles.ornamentTop} aria-hidden />
        <div className={styles.head}>
          <span className={styles.title}>TREND</span>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.ratio}>
          <div className={styles.ratioDragon} style={{ flex: Math.max(1, dPct) }}>
            <span>Dragon {dPct}%</span>
          </div>
          <div className={styles.ratioTiger} style={{ flex: Math.max(1, tPct) }}>
            <span>Tiger {tPct}%</span>
          </div>
        </div>

        <div className={styles.legend}>
          <span className={styles.legD}>Dragon</span>
          <span className={styles.legTie}>Tie</span>
          <span className={styles.legT}>Tiger</span>
        </div>

        <div className={styles.grid} aria-label="Bead road">
          {Array.from({ length: 60 }).map((_, i) => {
            const w = grid[i]
            return (
              <span key={i} className={`${styles.cell} ${w ? styles[w] : ''}`}>
                {w === 'dragon' ? 'D' : w === 'tiger' ? 'T' : w === 'tie' ? '·' : ''}
              </span>
            )
          })}
        </div>

        <div className={styles.footer}>
          <span className={styles.pillD}>D {dragon}</span>
          <span className={styles.pillTie}>TIE {tie}</span>
          <span className={styles.pillT}>T {tiger}</span>
          <span className={styles.pillCount}>Count {history.length}</span>
        </div>
      </div>
    </div>
  )
}
