import { memo } from 'react'
import { CHIP_IMG, historyPill, IMG } from '../assets'
import { chipLabel, formatAmount } from '../chips'
import { CHIP_VALUES, type ChipValue } from '../constants'
import styles from '../sevenUpDown.module.css'

export function IconButton({
  src,
  label,
  onClick,
}: {
  src: string
  label: string
  onClick?: () => void
}) {
  return (
    <button type="button" className={styles.iconBtn} onClick={onClick} aria-label={label}>
      <img src={src} alt="" draggable={false} />
    </button>
  )
}

export const TimerRing = memo(function TimerRing({
  seconds,
  max,
  phase,
}: {
  seconds: number
  max: number
  phase: 'betting' | 'rolling' | 'result'
}) {
  const r = 24
  const circ = 2 * Math.PI * r
  const p = Math.max(0, Math.min(1, seconds / Math.max(1, max)))
  const urgent = phase === 'betting' && seconds <= 3
  const label = phase === 'betting' ? 'PLACE BETS' : phase === 'rolling' ? 'NO MORE BETS' : 'RESULT'

  return (
    <div className={styles.centerStage}>
      <div className={`${styles.timerRing} ${urgent ? styles.timerUrgent : ''}`}>
        <div className={styles.timerFace} />
        <svg className={styles.timerSvg} viewBox="0 0 54 54" aria-hidden>
          <circle cx="27" cy="27" r={r} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="4" />
          <circle
            cx="27"
            cy="27"
            r={r}
            fill="none"
            stroke={urgent ? '#ff7a4d' : '#f5c518'}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${circ * p} ${circ}`}
            style={{ transition: 'stroke-dasharray 0.25s linear' }}
          />
        </svg>
        <span className={styles.timerNum}>{phase === 'betting' ? seconds : '—'}</span>
      </div>
      <span className={styles.phaseLabel}>{label}</span>
    </div>
  )
})

export const HistoryStrip = memo(function HistoryStrip({
  history,
  top,
}: {
  history: number[]
  top: number
}) {
  if (!history.length) return null
  return (
    <div className={styles.history} style={{ top }}>
      <span className={styles.historyLabel}>LAST</span>
      {history.slice(0, 12).map((h, i) => (
        <img
          key={`${i}-${h}`}
          src={historyPill(h)}
          alt={String(h)}
          draggable={false}
          className={`${styles.historyPill} ${i === 0 ? styles.historyPillNew : ''}`}
        />
      ))}
    </div>
  )
})

export const ChipTray = memo(function ChipTray({
  selected,
  balance,
  onSelect,
}: {
  selected: ChipValue
  balance: number
  onSelect: (v: ChipValue) => void
}) {
  return (
    <div className={styles.tray}>
      {CHIP_VALUES.map((v) => {
        const affordable = balance >= v
        return (
          <button
            key={v}
            type="button"
            className={`${styles.trayBtn} ${selected === v ? styles.trayBtnOn : ''} ${
              affordable ? '' : styles.trayBtnOff
            }`}
            onClick={() => onSelect(v)}
            aria-pressed={selected === v}
            aria-label={`Chip ${chipLabel(v)}`}
          >
            <img src={CHIP_IMG[v]} alt="" draggable={false} />
          </button>
        )
      })}
    </div>
  )
})

export const BalancePill = memo(function BalancePill({ balance }: { balance: number }) {
  return (
    <span className={styles.balancePill}>
      <img src={CHIP_IMG[1000]} alt="" className={styles.coin} draggable={false} />
      {formatAmount(balance)}
    </span>
  )
})

export const LivePill = memo(function LivePill({
  online,
  connected,
}: {
  online: number
  connected: boolean
}) {
  return (
    <span className={styles.livePill}>
      <span className={`${styles.liveDot} ${connected ? '' : styles.liveDotOff}`} />
      {connected ? `${online} playing` : 'offline'}
    </span>
  )
})

export const Logo = memo(function Logo({ period }: { period: string | null }) {
  return (
    <div className={styles.titleWrap}>
      <span className={styles.title}>7 UP DOWN</span>
      {period && <span className={styles.periodTag}>#{period.slice(-8)}</span>}
    </div>
  )
})

export { IMG }
