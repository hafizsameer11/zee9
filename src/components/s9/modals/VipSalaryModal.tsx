import { useCallback, useEffect, useState } from 'react'
import { api } from '../../../api/client'
import { useWallet } from '../../../context/WalletContext'
import styles from './VipSalaryModal.module.css'

type VipStatus = {
  level: number
  deposited: number
  progress: number
  target: number
  needMore: number
  current: {
    betRebate: number
    inviteMin: number
    inviteMax: number
    perk: string
    weeklySalary: number
    monthlySalary: number
  }
  levelUp: { claimLevel: number | null; amount: number; canClaim: boolean; label: string }
  weekly: { amount: number; canClaim: boolean; remainMs: number; remainLabel: string }
  monthly: { amount: number; canClaim: boolean; remainMs: number; remainLabel: string }
  previews: { level: number; locked: boolean; betRebate: number; perk: string }[]
}

type Props = {
  onClose: () => void
  onDeposit?: () => void
}

function fmt(n: number) {
  return n.toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

export default function VipSalaryModal({ onClose, onDeposit }: Props) {
  const { refresh } = useWallet()
  const [status, setStatus] = useState<VipStatus | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await api.get('/vip/status')
      setStatus(data)
    } catch (e: any) {
      setMsg(e?.message || 'Could not load VIP')
    }
  }, [])

  useEffect(() => {
    void load()
    const t = window.setInterval(() => void load(), 60_000)
    return () => window.clearInterval(t)
  }, [load])

  const claim = async (kind: 'level-up' | 'weekly' | 'monthly') => {
    if (busy) return
    setBusy(kind)
    setMsg(null)
    try {
      const res = await api.post(`/vip/claim/${kind}`)
      await Promise.all([load(), refresh()])
      setMsg(`Claimed Rs ${res?.amount ?? ''}`)
    } catch (e: any) {
      setMsg(e?.message || 'Claim failed')
    } finally {
      setBusy(null)
    }
  }

  const s = status
  const pct = s ? Math.min(100, (s.progress / Math.max(1, s.target)) * 100) : 0

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.panel}>
        <button type="button" className={styles.closeX} onClick={onClose} aria-label="Close">×</button>
        <h2 className={styles.title}>VIP SALARY</h2>

        <div className={styles.cards}>
          <div className={`${styles.card} ${styles.cardPurple}`}>
            <div className={styles.cardIcon}>🏅</div>
            <p className={styles.cardLabel}>Level up</p>
            <p className={styles.cardAmt}>
              {s?.levelUp.canClaim ? `Rs ${fmt(s.levelUp.amount)}` : s?.levelUp.label ?? '—'}
            </p>
            <button
              type="button"
              className={`${styles.getBtn} ${styles.getGreen}`}
              disabled={!s?.levelUp.canClaim || busy === 'level-up'}
              onClick={() => void claim('level-up')}
            >
              {s?.levelUp.canClaim ? `${s.levelUp.label} Get` : `${s?.levelUp.label ?? 'V0'} Get`}
            </button>
          </div>

          <div className={`${styles.card} ${styles.cardBlue}`}>
            <div className={styles.cardIcon}>♠️</div>
            <p className={styles.cardLabel}>Weekly Salary</p>
            <p className={styles.cardAmt}>Rs{fmt(s?.weekly.amount ?? 0)}</p>
            <button
              type="button"
              className={`${styles.getBtn} ${styles.getYellow}`}
              disabled={!s?.weekly.canClaim || busy === 'weekly'}
              onClick={() => void claim('weekly')}
            >
              Get
              {s?.weekly.canClaim && <span className={styles.badge}>!</span>}
            </button>
            {s && !s.weekly.canClaim && s.weekly.remainLabel && (
              <p className={styles.timer}>{s.weekly.remainLabel}</p>
            )}
          </div>

          <div className={`${styles.card} ${styles.cardPink}`}>
            <div className={styles.cardIcon}>♥️</div>
            <p className={styles.cardLabel}>Monthly Salary</p>
            <p className={styles.cardAmt}>Rs{fmt(s?.monthly.amount ?? 0)}</p>
            <button
              type="button"
              className={`${styles.getBtn} ${s?.monthly.canClaim ? styles.getYellow : styles.getGrey}`}
              disabled={!s?.monthly.canClaim || busy === 'monthly'}
              onClick={() => void claim('monthly')}
            >
              Get
            </button>
            {s && !s.monthly.canClaim && s.monthly.remainLabel && (
              <p className={styles.timer}>{s.monthly.remainLabel}</p>
            )}
          </div>
        </div>

        <div className={styles.previews}>
          {(s?.previews?.length ? s.previews : [
            { level: 9, locked: true, betRebate: 2.0, perk: '2.0% bet Rebate, 1V1 service line, free withdraw and first' },
            { level: 12, locked: true, betRebate: 3.0, perk: '3.0% bet Rebate, 1V1 service line, free withdraw and first' },
          ]).map((p) => (
            <div key={p.level} className={styles.previewRow}>
              <span className={styles.lockPill}>🔒 V{p.level}</span>
              <div className={styles.previewText}>
                <strong>{p.betRebate.toFixed(1)}% Bet Rebate</strong>
                <span>{p.perk}</span>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <div className={styles.levelShield}>V{s?.level ?? 0}</div>
          <div className={styles.progressBlock}>
            <div className={styles.barTrack}>
              <div className={styles.barFill} style={{ width: `${pct}%` }} />
            </div>
            <p className={styles.barNums}>
              {fmt(s?.progress ?? 0)}/{fmt(s?.target ?? 1)}
            </p>
            <p className={styles.barHint}>
              {s && s.needMore > 0
                ? `Buy chips ${fmt(s.needMore)} to V${(s.level ?? 0) + 1}`
                : 'Max VIP level'}
            </p>
          </div>
          <div className={styles.benefits}>
            <p>{(s?.current.betRebate ?? 0).toFixed(1)}% Bet Rebate</p>
            <p>
              {(s?.current.inviteMin ?? 0)}%-{(s?.current.inviteMax ?? 0)}% Invite Commission
            </p>
          </div>
          <button type="button" className={styles.levelUpBtn} onClick={() => onDeposit?.()}>
            Level Up
          </button>
        </div>

        {msg && <p className={styles.msg}>{msg}</p>}
      </div>
    </div>
  )
}
