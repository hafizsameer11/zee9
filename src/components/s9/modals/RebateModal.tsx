import { useState } from 'react'
import { api } from '../../../api/client'
import { useCashback } from '../../../api/hooks'
import { useWallet } from '../../../context/WalletContext'
import S9ModalShell from './S9ModalShell'
import styles from './RebateModal.module.css'

type Props = { onClose: () => void }

export default function RebateModal({ onClose }: Props) {
  const { status, refetch } = useCashback()
  const { refresh } = useWallet()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function claim() {
    if (!status || status.eligibleAmount <= 0 || status.claimedToday) return
    setBusy(true)
    setMsg(null)
    try {
      await api.post('/bonuses/cashback/claim')
      await Promise.all([refetch(), refresh()])
      setMsg('Cashback claimed!')
    } catch (e: any) {
      setMsg(e?.message || 'Claim failed')
    } finally {
      setBusy(false)
    }
  }

  const canClaim = status && status.eligibleAmount > 0 && !status.claimedToday

  return (
    <S9ModalShell title="Rebate" onClose={onClose} hideSupport>
      <div className={styles.body}>
        <div className={styles.hero}>
          <span>🏺</span>
          <h3>Daily Rebate</h3>
          <p>Get cashback on your losses every day{status?.currentTier ? ` · ${status.currentTier} tier` : ''}</p>
        </div>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <strong>{status?.currentRate ?? 0}%</strong>
            <small>Current Rate</small>
          </div>
          <div className={styles.stat}>
            <strong>Rs {(status?.eligibleAmount ?? 0).toLocaleString('en-PK')}</strong>
            <small>Available</small>
          </div>
          <div className={styles.stat}>
            <strong>Rs {(status?.totalClaimed ?? 0).toLocaleString('en-PK')}</strong>
            <small>Total Claimed</small>
          </div>
        </div>
        {status && status.todayLoss > 0 && (
          <p style={{ textAlign: 'center', color: '#c9a24a', fontSize: 12, margin: '0 0 10px' }}>
            Today&apos;s loss: Rs {status.todayLoss.toLocaleString('en-PK')}
          </p>
        )}
        {msg && <p style={{ textAlign: 'center', color: '#ffd54f', fontSize: 12 }}>{msg}</p>}
        <button type="button" className={styles.claimBtn} disabled={!canClaim || busy} onClick={claim}>
          {busy ? 'Claiming…' : status?.claimedToday ? 'CLAIMED TODAY' : 'CLAIM REBATE'}
        </button>
        <p className={styles.note}>Play games to earn rebate. Higher tiers unlock at greater daily losses.</p>
      </div>
    </S9ModalShell>
  )
}
