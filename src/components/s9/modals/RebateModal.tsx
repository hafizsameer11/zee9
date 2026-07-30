import { useEffect, useState } from 'react'
import { api } from '../../../api/client'
import { useCashback } from '../../../api/hooks'
import { useWallet } from '../../../context/WalletContext'
import styles from './RebateModal.module.css'

type Props = {
  onClose: () => void
  onGoPlay?: () => void
}

function fmt(n: number) {
  return n.toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

export default function RebateModal({ onClose, onGoPlay }: Props) {
  const { status, refetch } = useCashback()
  const { refresh } = useWallet()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 30_000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    if (tick > 0) void refetch()
  }, [tick, refetch])

  async function claim() {
    if (!status?.canClaim || busy) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await api.post('/bonuses/cashback/claim') as { amount?: number }
      await Promise.all([refetch(), refresh()])
      setMsg(`Claimed Rs ${res?.amount ?? status.rebetAmount ?? 600}`)
    } catch (e: any) {
      setMsg(e?.message || 'Claim failed')
    } finally {
      setBusy(false)
    }
  }

  const minLoss = status?.minLoss ?? 50_000
  const rebetAmt = status?.rebetAmount ?? 600
  const delayH = status?.delayHours ?? 24
  const loss = status?.todayLoss ?? 0
  const todayBonus = status?.todayBonus ?? status?.eligibleAmount ?? 0
  const pct = Math.min(100, (loss / Math.max(1, minLoss)) * 100)
  const canClaim = !!status?.canClaim

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.panel}>
        <button type="button" className={styles.closeX} onClick={onClose} aria-label="Close">×</button>
        <div className={styles.badge}>
          <h2>BET REBATE</h2>
          <span className={styles.info} title="Info">!</span>
        </div>

        <div className={styles.potWrap}>
          <div className={styles.pot} aria-hidden>🏺</div>
          <div className={styles.todayBox}>
            <span>Today Bonus:</span>
            <strong>{fmt(todayBonus)}</strong>
          </div>
          <span className={styles.rebetPill}>ReBet: {fmt(rebetAmt)}</span>
        </div>

        <div className={styles.progressBlock}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
            <span className={styles.progressKnob} style={{ left: `calc(${pct}% - 14px)` }}>
              ?
            </span>
          </div>
          <p className={styles.progressLabel}>
            Loss {fmt(Math.min(loss, minLoss))}/{fmt(minLoss)}
            {status?.remainLabel ? ` · ${status.remainLabel}` : ''}
          </p>
        </div>

        {canClaim ? (
          <button type="button" className={styles.goBtn} disabled={busy} onClick={() => void claim()}>
            {busy ? '…' : `Claim Rs ${fmt(rebetAmt)}`}
          </button>
        ) : (
          <button
            type="button"
            className={styles.goBtn}
            onClick={() => {
              onGoPlay?.()
              onClose()
            }}
          >
            Go To Play
          </button>
        )}

        <p className={styles.note}>
          Ye bonus sirf {fmt(minLoss)} loss ke baad milta hai — {delayH} ghante wait, phir Rs {fmt(rebetAmt)} ReBet.
        </p>
        {msg && <p className={styles.msg}>{msg}</p>}
      </div>
    </div>
  )
}
