import { useEffect, useState } from 'react'
import { api } from '../../../api/client'
import { useWallet } from '../../../context/WalletContext'
import styles from './ReturnBonusModal.module.css'

type Status = {
  eligible: boolean
  enabled: boolean
  inactiveDays: number
  min: number
  max: number
  amountHint: number | null
}

type Props = {
  onClose: () => void
  onClaimed?: (amount: number) => void
}

function fmt(n: number) {
  return n.toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

export default function ReturnBonusModal({ onClose, onClaimed }: Props) {
  const { refresh } = useWallet()
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)
  const [claimed, setClaimed] = useState<number | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api.get('/bonuses/return/status')
      .then((data: Status) => { if (!cancelled) setStatus(data) })
      .catch(() => { if (!cancelled) setMsg('Could not load bonus') })
    return () => { cancelled = true }
  }, [])

  const claim = async () => {
    if (busy || claimed != null) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await api.post('/bonuses/return/claim') as { amount: number }
      setClaimed(res.amount)
      await refresh()
      onClaimed?.(res.amount)
    } catch (e: any) {
      setMsg(e?.message || 'Claim failed')
    } finally {
      setBusy(false)
    }
  }

  const displayAmt = claimed ?? status?.amountHint ?? status?.max ?? 200
  const min = status?.min ?? 40
  const max = status?.max ?? 200
  const days = status?.inactiveDays ?? 7

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.panel}>
        <button type="button" className={styles.closeX} onClick={onClose} aria-label="Close">×</button>

        <div className={styles.hero}>
          <p className={styles.winLine}>Welcome Back!</p>
          <p className={styles.subLine}>{days}+ days away — free bonus for you</p>
        </div>

        <div className={styles.stage}>
          <div className={styles.coins} aria-hidden>🪙🪙🪙</div>
          <div className={styles.gift} aria-hidden>🎁</div>
          <div className={styles.amountBlock}>
            <span className={styles.issued}>Bonus issued</span>
            <p className={styles.bigAmt}>Rs{fmt(displayAmt)}</p>
            <p className={styles.range}>Rs {fmt(min)} – {fmt(max)}</p>
          </div>
        </div>

        <div className={styles.vipStrip}>
          <span className={styles.vipTag}>BONUS</span>
          <div className={styles.vipCopy}>
            <strong>Missed you!</strong>
            <span>Stop playing {days} days, come back &amp; claim Rs {fmt(min)}–{fmt(max)}</span>
          </div>
          <button
            type="button"
            className={styles.claimBtn}
            disabled={busy || claimed != null || status?.eligible === false}
            onClick={() => void claim()}
          >
            {claimed != null
              ? `Issued Rs${fmt(claimed)} ✓`
              : busy
                ? '…'
                : `Claim Rs${fmt(min)}–${fmt(max)}`}
          </button>
        </div>

        {msg && <p className={styles.msg}>{msg}</p>}
      </div>
    </div>
  )
}
