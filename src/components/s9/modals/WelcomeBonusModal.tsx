import { useEffect, useState } from 'react'
import { api } from '../../../api/client'
import { useConfig } from '../../../api/hooks'
import styles from './WelcomeBonusModal.module.css'

type Status = {
  rewards: number[]
  day: number
  claimedToday: boolean
  canClaim: boolean
  amountToday: number
  needsDeposit: boolean
}

type Props = {
  onClose: () => void
  onClaim?: () => Promise<void> | void
}

const FALLBACK = [4, 9, 3, 5, 8, 6, 10]

export default function WelcomeBonusModal({ onClose, onClaim }: Props) {
  const config = useConfig()
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const rewards = status?.rewards?.length === 7
    ? status.rewards
    : (config?.bonuses.dailyRewards?.length === 7 ? config.bonuses.dailyRewards : FALLBACK)
  const day = status?.day ?? 1
  const claimedToday = status?.claimedToday ?? false

  useEffect(() => {
    let cancelled = false
    api.get('/bonuses/daily-open/status')
      .then((data: Status) => { if (!cancelled) setStatus(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const receive = async () => {
    if (busy || claimedToday) return
    setBusy(true)
    setMsg(null)
    try {
      await onClaim?.()
      setStatus((prev) => prev
        ? { ...prev, claimedToday: true, canClaim: false }
        : prev)
    } catch (e: any) {
      setMsg(e?.message || 'Could not claim')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.panel}>
        <button type="button" className={styles.closeX} onClick={onClose} aria-label="Close">×</button>
        <h2 className={styles.title}>DAILY REWARDS</h2>

        <div className={styles.grid}>
          {rewards.slice(0, 6).map((amt, i) => {
            const d = i + 1
            const isCurrent = d === day && !claimedToday
            const done = d < day || (d === day && claimedToday)
            return (
              <div
                key={d}
                className={`${styles.dayCard} ${isCurrent ? styles.dayCurrent : ''} ${done ? styles.dayDone : ''}`}
              >
                <span className={styles.dayLabel}>DAY {d}</span>
                <span className={styles.chips} aria-hidden>🪙</span>
                <span className={styles.amount}>Rs {amt}</span>
                {d > day && <span className={styles.lock} aria-hidden>🔒</span>}
                {done && <span className={styles.check} aria-hidden>✓</span>}
              </div>
            )
          })}
        </div>

        <div
          className={`${styles.day7} ${day === 7 && !claimedToday ? styles.dayCurrent : ''} ${day === 7 && claimedToday ? styles.dayDone : ''}`}
        >
          <span className={styles.dayLabel}>DAY 7</span>
          <span className={styles.chipsBig} aria-hidden>🪙🪙🪙</span>
          <span className={styles.amountBig}>Rs {rewards[6]}</span>
          {day < 7 && <span className={styles.lock} aria-hidden>🔒</span>}
          {day === 7 && claimedToday && <span className={styles.check} aria-hidden>✓</span>}
        </div>

        <p className={styles.warn}>
          <span aria-hidden>⚠</span> MISS A DAY AND YOU&apos;LL HAVE TO START OVER!
        </p>

        {msg && <p className={styles.error}>{msg}</p>}
        {status?.needsDeposit && !claimedToday && !status.canClaim && !msg && (
          <p className={styles.hint}>Deposit today to unlock Receive.</p>
        )}

        <button
          type="button"
          className={styles.receiveBtn}
          onClick={() => void receive()}
          disabled={busy || claimedToday || (status != null && !status.canClaim)}
        >
          {claimedToday ? 'Claimed' : busy ? '…' : 'Receive'}
        </button>
      </div>
    </div>
  )
}
