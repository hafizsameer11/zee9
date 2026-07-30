import { useCallback, useEffect, useState } from 'react'
import { api } from '../../../api/client'
import { useWallet } from '../../../context/WalletContext'
import styles from './FreeCashModal.module.css'

type QuestRow = {
  id: string
  title: string
  desc: string
  target: number
  reward: number
  tier: number
  maxTier: number
  progress: number
  done: boolean
  claimed: boolean
  canClaim: boolean
  kind: string
}

type Status = {
  enabled: boolean
  maxDailyReward: number
  resetHour: number
  claimedToday: number
  activity: number
  quests: QuestRow[]
}

type Props = {
  onClose: () => void
  onGoPlay?: () => void
  onGoDeposit?: () => void
  onOpenRebate?: () => void
}

function fmt(n: number) {
  return n.toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

export default function FreeCashModal({ onClose, onGoPlay, onGoDeposit, onOpenRebate }: Props) {
  const { refresh } = useWallet()
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await api.get('/free-cash/status')
      setStatus(data)
    } catch (e: any) {
      setMsg(e?.message || 'Could not load Free Cash')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const claim = async (questId: string) => {
    if (busy) return
    setBusy(questId)
    setMsg(null)
    try {
      const res = await api.post('/free-cash/claim', { questId })
      await Promise.all([load(), refresh()])
      setMsg(`Claimed Rs ${res?.amount ?? ''}`)
    } catch (e: any) {
      setMsg(e?.message || 'Claim failed')
    } finally {
      setBusy(null)
    }
  }

  const go = (q: QuestRow) => {
    if (q.kind === 'DEPOSIT_COUNT') onGoDeposit?.()
    else onGoPlay?.()
    onClose()
  }

  const quests = status?.quests ?? []
  const maxDaily = status?.maxDailyReward ?? 2200
  const activity = status?.activity ?? 0
  const canGetAll = quests.some((q) => q.canClaim)

  const claimFirst = async () => {
    const q = quests.find((x) => x.canClaim)
    if (q) await claim(q.id)
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.panel}>
        <button type="button" className={styles.closeX} onClick={onClose} aria-label="Close">×</button>

        <div className={styles.header}>
          <div className={styles.headerText}>
            <p className={styles.maxLine}>
              Maximum Daily Free Rewards: <strong>{fmt(maxDaily)}</strong>
            </p>
            <p className={styles.resetNote}>Quests list updated daily at {String(status?.resetHour ?? 5).padStart(2, '0')}:00</p>
          </div>
          <div className={styles.gift}>🎁</div>
          <button
            type="button"
            className={styles.getBtn}
            disabled={!canGetAll || !!busy}
            onClick={() => void claimFirst()}
          >
            GET
          </button>
          {onOpenRebate && (
            <button
              type="button"
              className={styles.rebateLink}
              onClick={() => {
                onOpenRebate()
                onClose()
              }}
            >
              Bet Rebate
            </button>
          )}
        </div>

        <div className={styles.list}>
          <h3 className={styles.questsTitle}>QUESTS</h3>
          {quests.map((q) => {
            const pct = Math.min(100, (q.progress / Math.max(1, q.target)) * 100)
            return (
              <div key={q.id} className={styles.card}>
                <div className={styles.ribbon}>🎯</div>
                <div className={styles.info}>
                  <strong>
                    {q.title} ({q.tier}/{q.maxTier})
                  </strong>
                  <span>{q.desc}</span>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${pct}%` }} />
                  </div>
                  <small>
                    {fmt(q.progress)}/{fmt(q.target)}
                  </small>
                </div>
                <div className={styles.prize}>
                  <span className={styles.chip}>🪙 {q.reward}</span>
                  {q.claimed ? (
                    <button type="button" className={styles.doneBtn} disabled>
                      ✓
                    </button>
                  ) : q.canClaim ? (
                    <button
                      type="button"
                      className={styles.claimBtn}
                      disabled={busy === q.id}
                      onClick={() => void claim(q.id)}
                    >
                      {busy === q.id ? '…' : 'Get'}
                    </button>
                  ) : (
                    <button type="button" className={styles.goBtn} onClick={() => go(q)}>
                      Go
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {!quests.length && <p className={styles.empty}>No quests configured</p>}
        </div>

        <div className={styles.footer}>
          <span className={styles.activityLabel}>Daily Activity</span>
          <div className={styles.activityBar}>
            <span className={styles.star}>⭐ {activity}</span>
            <div className={styles.activityTrack}>
              <div
                className={styles.activityFill}
                style={{ width: `${Math.min(100, (activity / Math.max(1, quests.length)) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {msg && <p className={styles.msg}>{msg}</p>}
      </div>
    </div>
  )
}
