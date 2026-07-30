import { CTRL, MODAL } from '../constants/assetManifest'
import { historyTone } from '../constants/gameConfig'
import styles from '../styles/aeroX.module.css'

type Props = {
  history: number[]
  onClose: () => void
}

export default function TrendModal({ history, onClose }: Props) {
  const low = history.filter((m) => m < 2).length
  const mid = history.filter((m) => m >= 2 && m < 10).length
  const high = history.filter((m) => m >= 10).length

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.trendModal}
        style={{ backgroundImage: `url(${MODAL.trendFrame})` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close">
          ×
        </button>
        <h3>TREND</h3>
        <div className={styles.trendLegend}>
          <span>
            <i className={styles.dotPink} /> &lt; 2
          </span>
          <span>
            <i className={styles.dotCyan} /> ≥ 2
          </span>
          <span>
            <i className={styles.dotGold} /> ≥ 10
          </span>
        </div>
        <div className={styles.trendStats}>
          <em>{low}</em> low · <em>{mid}</em> mid · <em>{high}</em> high
        </div>
        <div className={styles.trendGrid}>
          {history.slice(0, 60).map((m, i) => {
            const t = historyTone(m)
            return (
              <span
                key={`${m}-${i}`}
                className={styles.trendCell}
                title={`${m.toFixed(2)}x`}
                data-tone={t}
              />
            )
          })}
        </div>
        <div className={styles.trendHint}>
          <img src={CTRL.help} alt="" /> Recent round outcomes
        </div>
      </div>
    </div>
  )
}
