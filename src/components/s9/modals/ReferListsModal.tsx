import { useEffect, useState } from 'react'
import { api } from '../../../api/client'
import styles from './ReferListsModal.module.css'

type Referral = {
  name: string
  phone: string
  playerNo?: number | null
  joined: string
  isValid?: boolean
  deposit?: number
}

type Props = {
  onClose: () => void
  referrals?: Referral[]
  totalCommission?: number
}

const COLUMNS = ['Name', 'Player ID', 'Joined', 'Deposit', 'Status']

export default function ReferListsModal({ onClose, referrals: initial, totalCommission: initialTotal }: Props) {
  const [referrals, setReferrals] = useState<Referral[]>(initial ?? [])
  const [totalCommission, setTotalCommission] = useState(initialTotal ?? 0)
  const [validReferrals, setValidReferrals] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/referrals')
      .then((data) => {
        if (Array.isArray(data.direct)) setReferrals(data.direct)
        setTotalCommission(Number(data.totalCommission ?? 0))
        setValidReferrals(Number(data.validReferrals ?? 0))
      })
      .catch(() => {
        if (initial) setReferrals(initial)
        if (initialTotal != null) setTotalCommission(initialTotal)
      })
      .finally(() => setLoading(false))
  }, [initial, initialTotal])

  const validCount = validReferrals || referrals.filter((r) => r.isValid).length

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className={styles.header}>
          <h2>MY REFERRALS</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className={styles.summary}>
          <div className={styles.stat}>
            <span>All Referrals</span>
            <strong>{referrals.length}</strong>
          </div>
          <div className={styles.stat}>
            <span>Valid Referrals</span>
            <strong>{validCount}</strong>
          </div>
          <div className={styles.stat}>
            <span>Total Reward</span>
            <strong>Rs {totalCommission.toLocaleString('en-PK')}</strong>
          </div>
        </div>

        <div className={styles.colHead}>
          {COLUMNS.map((col) => (
            <span key={col}>{col}</span>
          ))}
        </div>

        <div className={styles.body}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#c9a24a', padding: 24, fontSize: 13 }}>Loading…</p>
          ) : referrals.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#c9a24a', padding: 24, fontSize: 13 }}>
              No referrals yet — share your link to invite friends.
            </p>
          ) : (
            referrals.map((r) => (
              <div
                key={`${r.phone}-${r.joined}`}
                className={styles.row}
              >
                <span>{r.name}</span>
                <span>{r.playerNo ?? '—'}</span>
                <span>{new Date(r.joined).toLocaleDateString('en-PK')}</span>
                <span>Rs {(r.deposit ?? 0).toLocaleString('en-PK')}</span>
                <span className={r.isValid ? styles.valid : styles.pending}>
                  {r.isValid ? 'Valid' : (r.deposit ?? 0) > 0 ? 'Deposited' : 'Pending'}
                </span>
              </div>
            ))
          )}
        </div>

        <div className={styles.footer} />
      </div>
    </div>
  )
}
